import { NextResponse } from 'next/server';
import { uploadToR2, getR2SignedUrl } from '@/lib/storage';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'uploads';

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${folder}/${uniqueSuffix}-${sanitizedFileName}`;

    await uploadToR2(key, buffer, file.type || 'application/octet-stream');

    const signedUrl = await getR2SignedUrl(key, 86400); // 24h

    return NextResponse.json({
      success: true,
      key,
      url: signedUrl,
      fileName: file.name,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error: any) {
    console.error('Erro no upload para R2:', error);
    return NextResponse.json(
      { error: 'Falha ao processar upload para o storage.', details: error.message },
      { status: 500 }
    );
  }
}
