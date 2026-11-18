import { NextResponse } from 'next/server';
import { uploadToR2, getR2SignedUrl, deleteFromR2 } from '@/lib/storage';

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Chave do arquivo não informada.' }, { status: 400 });
    }

    const signedUrl = await getR2SignedUrl(key, 86400); // 24h

    return NextResponse.json({
      success: true,
      url: signedUrl,
    });
  } catch (error: any) {
    console.error('Erro ao gerar URL assinada no R2:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar URL do arquivo.', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Chave do arquivo não informada.' }, { status: 400 });
    }

    await deleteFromR2(key);

    return NextResponse.json({
      success: true,
      message: 'Arquivo excluído com sucesso do storage.',
    });
  } catch (error: any) {
    console.error('Erro ao excluir arquivo do R2:', error);
    return NextResponse.json(
      { error: 'Falha ao excluir arquivo do storage.', details: error.message },
      { status: 500 }
    );
  }
}
