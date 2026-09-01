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

export async function POST(request) {
  // 1. Auth check — resolve the active legacy identity from the Clerk session.
  //    Unauthenticated/unmapped/pending/revoked/invalid identities are rejected
  //    here, before any listing or images_table mutation can occur.
  const { user, error: authError, status: authStatus } = await requireAuth();
  if (authError) {
    return NextResponse.json({ error: authError }, { status: authStatus });
  }
  // user.id === the legacy owner id; used for the ownership gate.

  let listingId = null;

  try {
    // 2. Parse JSON body: { listing_id, uploads: [{key, publicUrl, position}, ...] }
    const body = await request.json();
    listingId = Number(body.listing_id);
    const uploads = Array.isArray(body.uploads) ? body.uploads : [];

    if (!Number.isInteger(listingId)) {
      return NextResponse.json(
        { error: 'listing_id is required' },
        { status: 400 }
      );
    }
    if (uploads.length < 1) {
      return NextResponse.json(
        { error: 'uploads array is required' },
        { status: 400 }
      );
    }

    // 3. OWNERSHIP GATE — a single query constrained by BOTH the requested
    //    listing_id and the server-derived legacyUserId. This runs before every
    //    listing/images_table mutation (all rollback deletes and inserts below).
    const { data: listingRow, error: ownerCheckError } = await paymentsSupabase
      .from('listings_table')
      .select('lister_uuid')
      .eq('listing_id', listingId)
      .maybeSingle();

    if (ownerCheckError) {
      return NextResponse.json({ error: ownerCheckError.message }, { status: 500 });
    }
    if (!listingRow) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }
    if (listingRow.lister_uuid !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 4. Ensure the listing does not already have media.
    const { data: existingImages, error: imagesQueryErr } = await paymentsSupabase
      .from('images_table')
      .select('media_id')
      .eq('listing_id', listingId)
      .limit(1);

    if (imagesQueryErr) {
      await paymentsSupabase
        .from('listings_table')
        .delete()
        .eq('listing_id', listingId);

      if (imagesQueryErr.code === '23505') {
        return NextResponse.json(
          { error: 'Listing already has images' },
          { status: 400 }
        );
      }

      return NextResponse.json({ error: imagesQueryErr.message }, { status: 500 });
    }

    if (existingImages && existingImages.length > 0) {
      return NextResponse.json(
        { error: 'Listing already has images' },
        { status: 400 }
      );
    }

    // 3. Loop over uploads: storage.complete() for each. Collect results.
    const completed = [];
    for (const upload of uploads) {
      const result = await scale.storage.complete({ key: upload.key });
      completed.push({ ...upload, verified: result.verified });
    }

    // 4. If any result is not verified, or any complete() threw (caught below):
    //    rollback the listings_table row and return an error.
    const failed = completed.find((c) => c.verified !== true);
    if (failed) {
      await paymentsSupabase
        .from('listings_table')
        .delete()
        .eq('listing_id', listingId);
      return NextResponse.json(
        { error: `Upload verification failed for key ${failed.key}` },
        { status: 500 }
      );
    }

    // 5. All verified — split uploads into images vs video by type.
    const imageUploads = uploads.filter((u) => u.type === 'image');
    const videoUploads = uploads.filter((u) => u.type === 'video');

    // More than one video entry is a validation error — reject before any insert.
    if (videoUploads.length > 1) {
      await paymentsSupabase
        .from('listings_table')
        .delete()
        .eq('listing_id', listingId);
      return NextResponse.json(
        { error: 'Only one video upload is allowed per listing' },
        { status: 400 }
      );
    }

    // Build images_url from imageUploads only, using the request body's
    // publicUrl/position values. No read()/batchRead() re-fetch.
    const images = imageUploads.map((u) => ({
      key: u.key,
      publicUrl: u.publicUrl,
      position: u.position,
    }));

    // video_url is a single string (matches the TEXT column), or null if none.
    const video_url = videoUploads.length === 1 ? videoUploads[ 0 ].publicUrl : null;

    // 6. INSERT one row into images_table.
    const { error: imagesError } = await paymentsSupabase
      .from('images_table')
      .insert({
        listing_id: listingId,
        images_url: images,
        video_url,
      });

    // 7. If step 6 fails: rollback the listings_table row.
    if (imagesError) {
      await paymentsSupabase
        .from('listings_table')
        .delete()
        .eq('listing_id', listingId);
      return NextResponse.json({ error: imagesError.message }, { status: 500 });
    }

    // 8. Return success.
    return NextResponse.json(
      { success: true, listing_id: listingId },
      { status: 201 }
    );
  } catch (err) {
    // Any complete() throw or other failure: rollback the listings_table row.
    if (listingId !== null) {
      await paymentsSupabase
        .from('listings_table')
        .delete()
        .eq('listing_id', listingId);
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}