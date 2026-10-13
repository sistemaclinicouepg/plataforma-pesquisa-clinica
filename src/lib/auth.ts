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
  } catch (error) {
    return null;
  }
}

/**
 * Obtém o usuário atualmente autenticado com base no token da sessão nos cookies.
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  let userId: string | null = null;

  if (sessionToken) {
    const verified = await verifySessionToken(sessionToken);
    if (verified?.id) {
      userId = verified.id;
    }
  }

  // Fallback de retrocompatibilidade para o cookie legado
  if (!userId) {
    const legacyId = cookieStore.get('auth_user_id')?.value;
    if (legacyId) {
      userId = legacyId;
    }
  }

  if (!userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isApproved: true,
      },
    });

    if (!user || !user.isApproved) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Erro ao buscar usuário logado:', error);
    return null;
  }
}
