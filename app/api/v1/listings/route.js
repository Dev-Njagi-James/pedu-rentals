import { NextResponse } from 'next/server';
import { paymentsSupabase } from '@/lib/supabase/paymentsClient';
import { requireAuth } from '@/lib/auth/session';
import {
  ScaleClient,
  ScaleError,
  AuthError,
  RateLimitError,
  ValidationError,
  ServerError,
  TimeoutError,
} from '@stravon/scale-sdk';

const scale = new ScaleClient({ apiKey: process.env.SCALE_API_KEY });

const ALLOWED_NODES = new Set([
  'doc',
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
]);

const ALLOWED_MARKS = new Set(['bold', 'italic', 'link']);

const MAX_DESCRIPTION_BYTES = 100_000;
const MAX_TEXT_LENGTH = 5_000;
const MAX_TREE_DEPTH = 20;

function validateDescriptionNode(node, depth = 0) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return false;
  }

  if (depth > MAX_TREE_DEPTH) {
    return false;
  }

  if (node.type === 'text') {
    if (typeof node.text !== 'string' || node.text.length > MAX_TEXT_LENGTH) {
      return false;
    }
  } else if (!ALLOWED_NODES.has(node.type)) {
    return false;
  }

  if (node.type === 'heading') {
    if (![1, 2, 3].includes(node.attrs?.level)) {
      return false;
    }
  }

  if (node.marks !== undefined) {
    if (!Array.isArray(node.marks)) {
      return false;
    }

    for (const mark of node.marks) {
      if (!mark || typeof mark !== 'object' || !ALLOWED_MARKS.has(mark.type)) {
        return false;
      }

      if (mark.type === 'link') {
        const href = mark.attrs?.href;

        if (typeof href !== 'string' || href.length > 2_048) {
          return false;
        }

        if (!/^https?:\/\//i.test(href)) {
          return false;
        }
      }
    }
  }

  if (node.content !== undefined) {
    if (!Array.isArray(node.content)) {
      return false;
    }

    return node.content.every((child) =>
      validateDescriptionNode(child, depth + 1)
    );
  }

  return node.type === 'text' || node.type === 'paragraph';
}

function containsDescriptionText(node) {
  if (!node || typeof node !== 'object') return false;
  if (node.type === 'text') return typeof node.text === 'string' && node.text.trim().length > 0;
  return Array.isArray(node.content) && node.content.some(containsDescriptionText);
}

function isValidDescriptionDocument(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  if (value.type !== 'doc' || !Array.isArray(value.content)) {
    return false;
  }

  if (JSON.stringify(value).length > MAX_DESCRIPTION_BYTES) {
    return false;
  }

  return validateDescriptionNode(value) && containsDescriptionText(value);
}

export async function POST(request) {
  const { user, error: authError, status: authStatus } = await requireAuth();

  if (authError || !user) {
    return NextResponse.json(
      { error: authError || 'Unauthenticated' },
      { status: authStatus || 401 }
    );
  }

  let insertedListingId = null;

  try {
    const body = await request.json();
    const fields = body ?? {};
    const files = Array.isArray(fields.files) ? fields.files : [];

    const required = [
      'property_name',
      'ward_id',
      'ward_name',
      'category_name',
      'category_type_name',
      'property_price',
      'phone_number',
    ];

    const missing = required.filter(
      (key) => !fields[key] || String(fields[key]).trim() === ''
    );

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    if (!isValidDescriptionDocument(fields.description)) {
      return NextResponse.json(
        { error: 'Description must be a valid formatted document.' },
        { status: 400 }
      );
    }

    if (files.length < 1) {
      return NextResponse.json(
        { error: 'At least one file entry is required' },
        { status: 400 }
      );
    }

    const listing_name = String(fields.property_name).trim();
    const listing_ward = Number.parseInt(fields.ward_id, 10);
    const ward_display_name = String(fields.ward_name).trim();
    const listing_category = String(fields.category_name).trim();
    const category_type = String(fields.category_type_name).trim();
    const price_kes = Number.parseInt(fields.property_price, 10);

    if (!Number.isInteger(listing_ward) || !Number.isInteger(price_kes)) {
      return NextResponse.json(
        { error: 'Ward and price must be valid numbers.' },
        { status: 400 }
      );
    }

    const { error: userUpsertError } = await paymentsSupabase
      .from('users_table')
      .upsert(
        {
          lister_uuid: user.id,
          ward_name: ward_display_name,
        },
        { onConflict: 'lister_uuid', ignoreDuplicates: true }
      );

    if (userUpsertError) {
      return NextResponse.json(
        { error: `Failed to ensure user record: ${userUpsertError.message}` },
        { status: 500 }
      );
    }

    const { data: listing, error: insertError } = await paymentsSupabase
      .from('listings_table')
      .insert({
        listing_name,
        listing_ward,
        ward_display_name,
        ward_location: fields.ward_location || null,
        location_url: fields.property_location || null,
        listing_description: fields.description,
        listing_category,
        category_type,
        furnishing: fields.property_interior || null,
        rent_duration: fields.rent_duration || null,
        phone_number: String(fields.phone_number),
        price_kes,
        lister_uuid: user.id,
      })
      .select('listing_id')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    insertedListingId = listing.listing_id;

    const uploadTargets = [];

    for (let position = 0; position < files.length; position += 1) {
      const file = files[position];

      if (
        !file ||
        typeof file.filename !== 'string' ||
        typeof file.contentType !== 'string' ||
        !Number.isFinite(file.fileSize) ||
        file.fileSize <= 0 ||
        !['image', 'video'].includes(file.type)
      ) {
        throw new ValidationError('Invalid file metadata.');
      }

      const created = await scale.storage.create({
        filename: file.filename,
        contentType: file.contentType,
        fileSize: file.fileSize,
      });

      uploadTargets.push({
        key: created.key,
        uploadUrl: created.uploadUrl,
        publicUrl: created.publicUrl,
        position,
        type: file.type,
      });
    }

    return NextResponse.json(
      {
        listing_id: insertedListingId,
        uploadTargets,
        listing_category,
      },
      { status: 200 }
    );
  } catch (err) {
    if (insertedListingId !== null) {
      await paymentsSupabase
        .from('listings_table')
        .delete()
        .eq('listing_id', insertedListingId);
    }

    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }

    if (err instanceof RateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }

    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    if (err instanceof ServerError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }

    if (err instanceof TimeoutError) {
      return NextResponse.json({ error: err.message }, { status: 504 });
    }

    if (err instanceof ScaleError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: err?.message || 'Failed to create listing.' },
      { status: 500 }
    );
  }
}
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');       // maps to listing_category
    const ward = searchParams.get('ward');                // maps to listing_ward (bigint)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = paymentsSupabase
      .from('listings_table')
      .select(
        `listing_id, listing_name, listing_category, category_type, furnishing,
         rent_duration, phone_number, price_kes, listing_ward, ward_display_name,
         ward_location, location_url, listing_description, plan_name, created_at, updated_at,
         images_table (images_url, video_url)`,
        { count: 'exact' }
      )
      .eq('payment_status', 'pending')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (category) query = query.eq('listing_category', category);
    if (ward) query = query.eq('listing_ward', ward);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      listings: data,
      page,
      limit,
      total: count,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch listings.' },
      { status: 500 }
    );
  }
}
