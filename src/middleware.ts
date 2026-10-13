import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

const JWT_SECRET_STRING =
  process.env.AUTH_SECRET ||
  'uepg-pesquisa-clinica-jwt-secret-2026-chave-criptografica-super-segura';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const SESSION_COOKIE_NAME = 'auth_session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Ignorar arquivos estáticos e internos do Next.js
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Rotas públicas permitidas (Login, Portal do Paciente, TCLE e APIs do voluntário)
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/paciente' ||
    pathname.startsWith('/tcle') ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/register' ||
    pathname === '/api/auth/logout' ||
    pathname === '/api/auth/me' ||
    pathname === '/api/paciente' ||
    pathname.startsWith('/api/tcle') ||
    pathname.startsWith('/api/responses');

  // 3. Validar token assinado JWT da sessão
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      const { payload } = await jose.jwtVerify(token, JWT_SECRET);
      if (payload && payload.id) {
        isAuthenticated = true;
      }
    } catch {
      isAuthenticated = false;
    }
  }

  // Fallback retrocompatível para cookie legado
  if (!isAuthenticated && request.cookies.get('auth_user_id')?.value) {
    isAuthenticated = true;
  }

  // 4. Se já estiver autenticado e tentar acessar /login, direcionar para Meus Estudos
  if (isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/projetos', request.url));
  }

  // 5. Se for rota pública, liberar navegação
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
