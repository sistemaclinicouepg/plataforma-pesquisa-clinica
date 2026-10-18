import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q')?.trim() || '';

    const [users, allProjects] = await Promise.all([
      prisma.user.findMany({
        where: search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { role: { contains: search, mode: 'insensitive' } },
              ],
            }
          : undefined,
        orderBy: { createdAt: 'desc' },
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
                  status: true,
                },
              },
            },
          },
        },
      }),
      prisma.project.findMany({
        select: {
          id: true,
          name: true,
          status: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({ users, allProjects });
  } catch (error: any) {
    console.error('Erro ao buscar equipe de pesquisadores:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao carregar equipe.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.email === 'admin@uepg.br';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Apenas administradores podem cadastrar novos membros na equipe.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password, role = 'RESEARCHER', isApproved = true, projects = [] } = body;

    if (!name || !name.trim() || !email || !email.trim() || !password) {
      return NextResponse.json(
        { error: 'Nome, e-mail e senha inicial são obrigatórios.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: `Já existe um pesquisador cadastrado com o e-mail ${cleanEmail}.` },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          password: hashedPassword,
          role: role || 'RESEARCHER',
          isApproved: isApproved !== undefined ? Boolean(isApproved) : true,
        },
      });

      // Atribuição de projetos se fornecido
      if (Array.isArray(projects) && projects.length > 0) {
        for (const proj of projects) {
          if (proj.projectId) {
            await tx.projectMember.create({
              data: {
                userId: user.id,
                projectId: proj.projectId,
                role: proj.role || 'OPERATOR',
                isBlinded: Boolean(proj.isBlinded),
              },
            });
          }
        }
      }

      // Trilha de Auditoria GCP / ICH E6
      await tx.auditLog.create({
        data: {
          entityType: 'User',
          entityId: user.id,
          action: 'CREATE',
          changedBy: currentUser?.name || currentUser?.email || 'Administrador',
          userEmail: currentUser?.email,
          reason: `Cadastro de novo membro da equipe: ${user.name} (${user.email}, Função: ${user.role}).`,
        },
      });

      return user;
    });

    return NextResponse.json({
      success: true,
      message: 'Membro da equipe cadastrado com sucesso.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isApproved: newUser.isApproved,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Erro ao adicionar membro da equipe:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao cadastrar membro da equipe.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.email === 'admin@uepg.br';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Apenas administradores podem editar membros da equipe.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, name, email, role, isApproved, password, projects } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório.' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Pesquisador não encontrado.' },
        { status: 404 }
      );
    }

    // Se email foi alterado, checar duplicidade
    let cleanEmail = existingUser.email;
    if (email && email.trim().toLowerCase() !== existingUser.email.toLowerCase()) {
      cleanEmail = email.trim().toLowerCase();
      const duplicateEmail = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });
      if (duplicateEmail) {
        return NextResponse.json(
          { error: `O e-mail ${cleanEmail} já está em uso por outro usuário.` },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, any> = {};
    if (name && name.trim()) updateData.name = name.trim();
    if (cleanEmail) updateData.email = cleanEmail;
    if (role) updateData.role = role;
    if (isApproved !== undefined) updateData.isApproved = Boolean(isApproved);
    if (password && password.trim().length >= 4) {
      updateData.password = await hashPassword(password.trim());
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: updateData,
      });

      // Se a lista de projetos foi enviada, sincroniza ProjectMember
      if (Array.isArray(projects)) {
        await tx.projectMember.deleteMany({
          where: { userId },
        });

        for (const proj of projects) {
          if (proj.projectId) {
            await tx.projectMember.create({
              data: {
                userId,
                projectId: proj.projectId,
                role: proj.role || 'OPERATOR',
                isBlinded: Boolean(proj.isBlinded),
              },
            });
          }
        }
      }

      // Trilha de auditoria
      await tx.auditLog.create({
        data: {
          entityType: 'User',
          entityId: userId,
          action: 'UPDATE',
          changedBy: currentUser?.name || currentUser?.email || 'Administrador',
          userEmail: currentUser?.email,
          reason: `Alteração de dados cadastrais/permissões do membro ${user.name} (${user.email}).`,
        },
      });

      return user;
    });

    return NextResponse.json({
      success: true,
      message: 'Dados do pesquisador atualizados com sucesso.',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isApproved: updatedUser.isApproved,
      },
    });
  } catch (error: any) {
    console.error('Erro ao atualizar membro da equipe:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao atualizar dados do membro.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.email === 'admin@uepg.br';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Apenas administradores podem excluir membros da equipe.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    let userId = searchParams.get('userId') || searchParams.get('id');

    if (!userId) {
      try {
        const body = await req.json();
        userId = body.userId || body.id;
      } catch (e) {}
    }

    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
    }

    if (currentUser?.id === userId) {
      return NextResponse.json(
        { error: 'Você não pode excluir sua própria conta enquanto estiver conectado ao sistema.' },
        { status: 400 }
      );
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToDelete) {
      return NextResponse.json({ error: 'Pesquisador não encontrado.' }, { status: 404 });
    }

    if (userToDelete.email === 'admin@uepg.br') {
      return NextResponse.json(
        { error: 'A conta raiz de administração (admin@uepg.br) não pode ser excluída.' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. Deletar vínculos de projetos
      await tx.projectMember.deleteMany({
        where: { userId },
      });

      // 2. Deletar usuário
      await tx.user.delete({
        where: { id: userId },
      });

      // 3. Auditoria
      await tx.auditLog.create({
        data: {
          entityType: 'User',
          entityId: userId,
          action: 'DELETE',
          changedBy: currentUser?.name || currentUser?.email || 'Administrador',
          userEmail: currentUser?.email,
          reason: `Exclusão do membro da equipe ${userToDelete.name} (${userToDelete.email}) por administrador.`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Membro ${userToDelete.name} foi removido da equipe com sucesso.`,
    });
  } catch (error: any) {
    console.error('Erro ao excluir membro da equipe:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao excluir membro da equipe.' },
      { status: 500 }
    );
  }
}
