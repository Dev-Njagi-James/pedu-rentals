import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';


export async function proxy(request) {
 
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isAdminRoute = request.nextUrl.pathname.startsWith('/User/Admin');
  const isListerRoute = request.nextUrl.pathname.startsWith('/User/Lister');
  const role = user?.user_metadata?.role;

  if (isAdminRoute && role !== 'admin') {
    return NextResponse.redirect(new URL('/Auth', request.url));
  }

  if (isListerRoute && role !== 'lister') {
    return NextResponse.redirect(new URL('/Auth', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [ '/', '/User/Admin', '/User/Admin/(.*)', '/User/Lister', '/User/Lister/(.*)' ],
};