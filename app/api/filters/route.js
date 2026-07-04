import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const revalidate = 3600;

export async function GET() {
  const supabase = await createServerSupabaseClient();
   console.log('[filters] route hit');

  const [wardsResult, categoriesResult, typesResult] = await Promise.all([
    supabase
      .from('wards_table')
      .select('ward_id, ward_name')
      .order('ward_name', { ascending: true }),

    supabase
      .from('property_categories')
      .select('category_id, category_name')
      .order('category_name', { ascending: true }),

    supabase
      .from('property_types')
      .select('type_id, type_name, category_id')
      .order('type_name', { ascending: true }),
      
  ]);
 

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

  // nest types under their parent category
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
