import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import {
  verifyPassword,
  hashPassword,
  createSessionToken,
  SESSION_COOKIE_NAME,
} from '@/lib/auth';

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

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
        { status: 401 }
      );
    }

    // 1. Validar senha com hash bcrypt seguro
    let isValidPassword = await verifyPassword(password, user.password);

    // Fallback de contingência caso ainda haja senha em texto puro legada
    if (!isValidPassword && user.password === password) {
      isValidPassword = true;
      // Atualizar automaticamente para o hash bcrypt seguro
      const newHash = await hashPassword(password);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: newHash },
      });
    }

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
        { status: 401 }
      );
    }

    // 2. Moderação Ética: O pesquisador cadastrado precisa de aprovação do Administrador
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

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
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
