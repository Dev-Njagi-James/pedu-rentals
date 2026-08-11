import { createServerSupabaseClient } from '@/lib/supabase/server';
import { paymentsSupabase } from '@/lib/supabase/paymentsClient';
import { NextResponse } from 'next/server';

export const revalidate = 3600;

const WARDS_TIMEOUT_MS = 5000;

function withTimeout(promiseFactory, timeoutMs) {
  return Promise.race([
    promiseFactory(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('WARDS_QUERY_TIMEOUT')), timeoutMs)
    ),
  ]);
}

async function fetchWardsWithRetry() {
  const query = () =>
    paymentsSupabase
      .from('wards_table')
      .select('ward_id, ward_name')
      .order('ward_name', { ascending: true });

  try {
    return await withTimeout(query, WARDS_TIMEOUT_MS);
  } catch (err) {
    console.log('[filters] wards query failed, retrying once:', err.message);
    return await withTimeout(query, WARDS_TIMEOUT_MS);
  }
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  console.log('[filters] route hit');

  let wardsResult, categoriesResult, typesResult;

  try {
    [wardsResult, categoriesResult, typesResult] = await Promise.all([
      fetchWardsWithRetry(),

      supabase
        .from('property_categories')
        .select('category_id, category_name')
        .order('category_name', { ascending: true }),

      supabase
        .from('property_types')
        .select('type_id, type_name, category_id')
        .order('type_name', { ascending: true }),
    ]);
  } catch (err) {
    console.log('[filters] wards query failed after retry:', err.message);
    return NextResponse.json(
      { error: 'Filters temporarily unavailable' },
      { status: 503 }
    );
  }

  if (wardsResult.error || categoriesResult.error || typesResult.error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch filters',
        details: {
          wards: wardsResult.error?.message ?? null,
          categories: categoriesResult.error?.message ?? null,
          types: typesResult.error?.message ?? null,
        },
      },
      { status: 500 }
    );
  }

  const categoriesWithTypes = categoriesResult.data.map((category) => ({
    category_id: category.category_id,
    category_name: category.category_name,
    types: typesResult.data.filter(
      (type) => type.category_id === category.category_id
    ),
  }));

  return NextResponse.json(
    {
      wards: wardsResult.data,
      categories: categoriesWithTypes,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=300',
      },
    }
  );
}