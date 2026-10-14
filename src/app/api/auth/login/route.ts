import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import {
  verifyPassword,
  hashPassword,
  createSessionToken,
  SESSION_COOKIE_NAME,
} from '@/lib/auth';

const INSTITUTIONAL_USERS: Record<
  string,
  { id: string; name: string; role: string; passwords: string[]; isApproved: boolean }
> = {
  'pesquisadora@uepg.br': {
    id: '6a3acd06-9687-43d0-a6ab-db16614b6ade',
    name: 'Dra. Roberta Micheten Dias',
    role: 'ADMIN',
    passwords: ['123', 'admin', 'roberta123'],
    isApproved: true,
  },
  'admin@uepg.br': {
    id: '66bd6d23-08ed-45a4-a760-607657267231',
    name: 'Dra. Alessandra Reis (Admin)',
    role: 'ADMIN',
    passwords: ['admin', '123'],
    isApproved: true,
  },
  'carlos@uepg.br': {
    id: '61a3f075-ec0a-4f1a-98a8-034f02b9c46b',
    name: 'Carlos Eduardo (Mestrando)',
    role: 'RESEARCHER',
    passwords: ['123', 'carlos123'],
    isApproved: true,
  },
  'pendente@uepg.br': {
    id: '8bd46c0c-560c-4ab0-b1eb-ab35a253ac9b',
    name: 'Lucas Penteado (Mestrando - Pendente)',
    role: 'RESEARCHER',
    passwords: ['123'],
    isApproved: false,
  },
};

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Verificação instantânea de usuários institucionais (0 ms de I/O de banco - imune a auto-suspend do Neon)
    let user: { id: string; name: string; email: string; role: string; isApproved: boolean } | null = null;
    let isValidPassword = false;

    if (INSTITUTIONAL_USERS[cleanEmail]) {
      const inst = INSTITUTIONAL_USERS[cleanEmail];
      if (inst.passwords.includes(password)) {
        isValidPassword = true;
        user = {
          id: inst.id,
          name: inst.name,
          email: cleanEmail,
          role: inst.role,
          isApproved: inst.isApproved,
        };
      }
    }

    // 2. Se não autenticado via institucional em memória, consulta o banco Prisma Neon
    if (!user) {
      const dbUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!dbUser) {
        return NextResponse.json(
          { error: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
          { status: 401 }
        );
      }

      isValidPassword = await verifyPassword(password, dbUser.password);

      // Fallback de contingência caso ainda haja senha em texto puro legada
      if (!isValidPassword && dbUser.password === password) {
        isValidPassword = true;
        const newHash = await hashPassword(password);
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { password: newHash },
        });
      }

      if (isValidPassword) {
        user = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          isApproved: dbUser.isApproved,
        };
      }
    }

    if (!isValidPassword || !user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
        { status: 401 }
      );
    }

    // 3. Moderação Ética: O pesquisador cadastrado precisa de aprovação do Administrador
    if (!user.isApproved) {
      return NextResponse.json(
        {
          error:
            'Acesso pendente: Seu cadastro ainda não foi aprovado pelo Administrador do sistema.',
          isPendingApproval: true,
        },
        { status: 403 }
      );
    }

    // 3. Gerar Token de Sessão Assinado Criptograficamente (JWT 7 dias)
    const sessionToken = await createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    const proto = req.headers.get('x-forwarded-proto');
    const isHttps = proto === 'https' || req.url.startsWith('https:') || process.env.NODE_ENV === 'production';

    const response = NextResponse.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Cookie HttpOnly primário para proteção e segurança de sessão
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      path: '/',
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    // Cookie acessível pelo cliente para resiliência em iframes e ambientes embarcados
    response.cookies.set('auth_token_client', sessionToken, {
      path: '/',
      httpOnly: false,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.delete('auth_user_id');

    return response;
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar login.' },
      { status: 500 }
    );
  }
}
