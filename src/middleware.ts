import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

const KNOWN_SECRETS = [
  new TextEncoder().encode(process.env.AUTH_SECRET || 'uepg-pesquisa-clinica-secret-jwt-key-2026'),
  new TextEncoder().encode('uepg-pesquisa-clinica-secret-jwt-key-2026'),
  new TextEncoder().encode('uepg-pesquisa-clinica-jwt-secret-2026-chave-criptografica-super-segura'),
];
const SESSION_COOKIE_NAME = 'auth_session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Ignorar arquivos estáticos e internos do Next.js
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|json)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Rotas públicas permitidas (Login, Portal do Paciente, TCLE e APIs do voluntário)
  const isPublicRoute =
    pathname === '/login' ||
    pathname === '/paciente' ||
    (pathname.startsWith('/tcle') && !pathname.startsWith('/tcle/editor')) ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/register' ||
    pathname === '/api/auth/logout' ||
    pathname === '/api/auth/me' ||
    pathname.startsWith('/api/paciente') ||
    pathname.startsWith('/api/tcle') ||
    (pathname.startsWith('/api/responses') && request.method === 'POST');

  // 3. Obter token com prioridade para fontes explícitas (Header Bearer ou query param auth_token)
  let token: string | undefined;

  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  const queryToken = request.nextUrl.searchParams.get('auth_token');
  if (queryToken && !token) {
    token = queryToken.trim();
  }

  if (!token) {
    token =
      request.cookies.get(SESSION_COOKIE_NAME)?.value ||
      request.cookies.get('auth_token_client')?.value;
  }

  // 4. Validar token assinado JWT da sessão contra os segredos conhecidos
  let isAuthenticated = false;

  if (token) {
    for (const sec of KNOWN_SECRETS) {
      try {
        const { payload } = await jose.jwtVerify(token, sec);
        if (payload && payload.id) {
          isAuthenticated = true;
          break;
        }
      } catch {
        // Tenta o próximo segredo
      }
    }
  }

  // 5. Se for rota pública (inclusive /login para permitir troca de usuário sem bloqueio), liberar navegação
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // 6. Rota protegida sem autenticação válida:
  if (!isAuthenticated) {
    // Se for uma requisição de API interna: responde 401 Unauthorized
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Não autorizado. Autenticação de pesquisador necessária.' },
        { status: 401 }
      );
    }

    // Se for uma página de navegação: redireciona para a tela de login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 7. Sincroniza cookies de sessão quando há token explícito novo ou ausência de cookie primário
  const response = NextResponse.next();
  const currentCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token && (queryToken || !currentCookie || currentCookie !== token)) {
    const isHttps = request.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production';
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      path: '/',
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
    response.cookies.set('auth_token_client', token, {
      path: '/',
      httpOnly: false,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
