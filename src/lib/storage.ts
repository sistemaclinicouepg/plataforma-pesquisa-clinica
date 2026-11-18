import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'pesquisa-clinica-uepg';
const R2_ENDPOINT =
  process.env.R2_ENDPOINT ||
  (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : '');

export function isR2Configured(): boolean {
  return Boolean(
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_ENDPOINT &&
    R2_BUCKET_NAME
  );
}

export function getR2Client(): S3Client | null {
  if (!isR2Configured()) return null;
  try {
    return new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || '',
        secretAccessKey: R2_SECRET_ACCESS_KEY || '',
      },
    });
  } catch (err) {
    console.warn('Aviso ao inicializar R2 client:', err);
    return null;
  }
}

/**
 * Faz upload de um arquivo para o bucket do Cloudflare R2
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | Blob | string,
  contentType: string = 'application/octet-stream'
) {
  const client = getR2Client();
  if (!client) {
    throw new Error('Cloudflare R2 não está configurado.');
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body as any,
    ContentType: contentType,
  });

  return await client.send(command);
}

/**
 * Gera uma URL assinada temporária para visualização/download de arquivo seguro
 */
export async function getR2SignedUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
  const client = getR2Client();
  if (!client) {
    throw new Error('Cloudflare R2 não está configurado.');
  }

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Remove um arquivo do Cloudflare R2
 */
export async function deleteFromR2(key: string) {
  const client = getR2Client();
  if (!client) return null;

  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    return await client.send(command);
  } catch (err) {
    console.warn('Aviso ao excluir do R2:', err);
    return null;
  }
}
