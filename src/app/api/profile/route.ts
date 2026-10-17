import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getCurrentUser,
  hashPassword,
  verifyPassword,
  createSessionToken,
  SESSION_COOKIE_NAME,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

const INSTITUTIONAL_USERS: Record<string, { passwords: string[] }> = {
  'pesquisadora@uepg.br': { passwords: ['123', 'admin', 'roberta123'] },
  'admin@uepg.br': { passwords: ['admin', '123'] },
  'carlos@uepg.br': { passwords: ['123', 'carlos123'] },
  'pendente@uepg.br': { passwords: ['123'] },
};

/**
 * GET /api/profile
 * Retorna os dados completos do pesquisador autenticado e seus projetos vinculados.
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para acessar o perfil.' },
        { status: 401 }
      );
    }

    const cleanEmail = currentUser.email.trim().toLowerCase();

    // 1. Busca o usuário no banco de dados
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [{ id: currentUser.id }, { email: cleanEmail }],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isApproved: true,
        createdAt: true,
        projects: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                description: true,
                status: true,
                createdAt: true,
                _count: {
                  select: { participants: true },
                },
              },
            },
          },
          orderBy: {
            project: {
              createdAt: 'desc',
            },
          },
        },
      },
    });

    // 2. Se o usuário institucional ainda não estava no banco, faz um upsert seguro
    if (!dbUser) {
      const defaultHash = await hashPassword('123');
      const created = await prisma.user.create({
        data: {
          id: currentUser.id,
          name: currentUser.name,
          email: cleanEmail,
          password: defaultHash,
          role: currentUser.role,
          isApproved: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isApproved: true,
          createdAt: true,
          projects: {
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  status: true,
                  createdAt: true,
                  _count: {
                    select: { participants: true },
                  },
                },
              },
            },
          },
        },
      });
      dbUser = created;
    }

    return NextResponse.json(
      {
        user: {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          isApproved: dbUser.isApproved,
          createdAt: dbUser.createdAt,
          projects: dbUser.projects.map((pm) => ({
            memberId: pm.id,
            role: pm.role,
            isBlinded: pm.isBlinded,
            project: pm.project,
          })),
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Erro ao obter perfil do usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno ao carregar perfil do pesquisador.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile
 * Permite que o pesquisador altere seus dados pessoais (nome) e sua senha de acesso.
 */
export async function PATCH(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para atualizar seu perfil.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, currentPassword, newPassword, confirmPassword } = body;

    const cleanEmail = currentUser.email.trim().toLowerCase();

    // 1. Localiza o usuário no banco de dados
    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [{ id: currentUser.id }, { email: cleanEmail }],
      },
    });

    if (!dbUser) {
      // Se não existia registro no DB, cria o registro inicial
      const defaultHash = await hashPassword('123');
      dbUser = await prisma.user.create({
        data: {
          id: currentUser.id,
          name: currentUser.name,
          email: cleanEmail,
          password: defaultHash,
          role: currentUser.role,
          isApproved: true,
        },
      });
    }

    const dataToUpdate: Record<string, string> = {};

    // 2. Validação e atualização de Nome
    if (typeof name === 'string' && name.trim()) {
      dataToUpdate.name = name.trim();
    }

    // 3. Validação e atualização de Senha
    if (newPassword || currentPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Por favor, informe sua senha atual para autorizar a alteração.' },
          { status: 400 }
        );
      }

      if (!newPassword) {
        return NextResponse.json(
          { error: 'Por favor, digite a nova senha desejada.' },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'A nova senha deve possuir pelo menos 6 caracteres.' },
          { status: 400 }
        );
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json(
          { error: 'A confirmação de senha não confere com a nova senha digitada.' },
          { status: 400 }
        );
      }

      // Verifica a senha atual
      let isCurrentValid = await verifyPassword(currentPassword, dbUser.password);

      // Contingência para senhas institucionais ou texto simples
      if (!isCurrentValid && dbUser.password === currentPassword) {
        isCurrentValid = true;
      }

      if (!isCurrentValid && INSTITUTIONAL_USERS[cleanEmail]) {
        if (INSTITUTIONAL_USERS[cleanEmail].passwords.includes(currentPassword)) {
          isCurrentValid = true;
        }
      }

      if (!isCurrentValid) {
        return NextResponse.json(
          { error: 'A senha atual informada está incorreta. Verifique e tente novamente.' },
          { status: 400 }
        );
      }

      dataToUpdate.password = await hashPassword(newPassword);
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum dado informado para alteração.' },
        { status: 400 }
      );
    }

    // 4. Atualiza no banco de dados Prisma Neon
    const updatedUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isApproved: true,
      },
    });

    // 5. Gera novo JWT atualizado com o nome do pesquisador
    const sessionToken = await createSessionToken({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    });

    const proto = req.headers.get('x-forwarded-proto');
    const isHttps =
      proto === 'https' ||
      req.url.startsWith('https:') ||
      process.env.NODE_ENV === 'production';

    const response = NextResponse.json({
      success: true,
      message: 'Dados atualizados com sucesso!',
      user: updatedUser,
      token: sessionToken,
    });

    // 6. Atualiza cookies de sessão
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      path: '/',
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set('auth_token_client', sessionToken, {
      path: '/',
      httpOnly: false,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Erro ao atualizar perfil do pesquisador:', error);
    return NextResponse.json(
      { error: 'Erro interno ao salvar as alterações do perfil.' },
      { status: 500 }
    );
  }
}
