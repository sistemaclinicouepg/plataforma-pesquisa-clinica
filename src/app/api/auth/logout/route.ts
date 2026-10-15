import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: Request) {
  const proto = req.headers.get('x-forwarded-proto');
  const isHttps = proto === 'https' || req.url.startsWith('https:') || process.env.NODE_ENV === 'production';

  const response = NextResponse.json(
    { success: true },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    }
  );

  const cookieOptions = {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    secure: isHttps,
    sameSite: (isHttps ? 'none' : 'lax') as 'none' | 'lax',
  };

  response.cookies.set(SESSION_COOKIE_NAME, '', { ...cookieOptions, httpOnly: true });
  response.cookies.set('auth_token_client', '', { ...cookieOptions, httpOnly: false });
  response.cookies.set('auth_user_id', '', { ...cookieOptions, httpOnly: false });

  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete('auth_token_client');
    cookieStore.delete('auth_user_id');
  } catch {
    // Se o contexto assíncrono de cookies não estiver disponível, os cookies na response já garantem a exclusão
  }

  return response;
}

