import { cookies } from 'next/headers';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';

export const SESSION_COOKIE_NAME = 'auth_session';

const JWT_SECRET_STRING =
  process.env.AUTH_SECRET ||
  'uepg-pesquisa-clinica-jwt-secret-2026-chave-criptografica-super-segura';

const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

export type SessionPayload = {
  id: string;
  email: string;
  role: string;
  name: string;
};

/**
 * Gera o hash criptográfico seguro (bcrypt) para salvar a senha no banco de dados.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(plainPassword, saltRounds);
}

/**
 * Valida a senha digitada contra o hash bcrypt armazenado.
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    console.error('Erro na comparação de senha:', error);
    return false;
  }
}

/**
 * Cria um token de sessão assinado (JWT) compatível com Node.js e Edge Runtime.
 */
export async function createSessionToken(
  payload: SessionPayload
): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Valida e decodifica o token de sessão JWT assinado.
 */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Obtém o usuário atualmente autenticado com base no token da sessão nos cookies.
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) return null;

  try {
    const verified = await verifySessionToken(sessionToken);
    if (!verified?.id) return null;

    // Retorna os dados autenticados diretamente do token JWT criptografado (0 ms de I/O de banco)
    return {
      id: verified.id,
      name: verified.name || 'Pesquisador',
      email: verified.email,
      role: verified.role,
      isApproved: true,
    };
  } catch (error) {
    console.error('Erro ao verificar sessão do usuário:', error);
    return null;
  }
}

export type ProjectAuthResult =
  | { authorized: true; user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>; member?: unknown }
  | { authorized: false; error: string; status: number };

/**
 * Valida se o usuário logado tem permissão para acessar ou alterar dados do projeto.
 * Por padrão, valida se o usuário é membro ou ADMIN. Se requireCoordinator for true,
 * exige que seja COORDINATOR do projeto ou ADMIN geral do sistema.
 */
export async function checkProjectPermission(
  projectId: string,
  requireCoordinator: boolean = false
): Promise<ProjectAuthResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      authorized: false,
      error: 'Não autorizado. Autenticação de pesquisador necessária.',
      status: 401,
    };
  }

  if (user.role === 'ADMIN') {
    return { authorized: true, user };
  }

  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId: user.id },
  });

  if (!member) {
    return {
      authorized: false,
      error: 'Acesso negado. Você não é membro deste projeto de pesquisa.',
      status: 403,
    };
  }

  if (requireCoordinator && member.role !== 'COORDINATOR') {
    return {
      authorized: false,
      error: 'Acesso negado. Apenas Coordenadores ou Administradores possuem permissão para realizar esta operação.',
      status: 403,
    };
  }

  return { authorized: true, user, member };
}
