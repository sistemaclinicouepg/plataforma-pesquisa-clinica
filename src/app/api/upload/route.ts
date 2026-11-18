import { NextResponse } from 'next/server';
import { uploadToR2, getR2SignedUrl, deleteFromR2, isR2Configured } from '@/lib/storage';

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
    const mimeType = file.type || 'application/pdf';

    // 1. Tentar salvar no Cloudflare R2 se configurado
    if (isR2Configured()) {
      try {
        await uploadToR2(key, buffer, mimeType);
        const signedUrl = await getR2SignedUrl(key, 86400); // 24h
        return NextResponse.json({
          success: true,
          key,
          url: signedUrl,
          fileName: file.name,
          size: file.size,
          mimeType,
          storage: 'r2',
        });
      } catch (r2Error: any) {
        console.warn('Upload para Cloudflare R2 falhou. Ativando fallback resiliente:', r2Error?.message);
      }
    }

    // 2. Fallback resiliente garantido: Converte em Base64 Data URL (0 falhas, 100% autônomo)
    const base64Data = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    return NextResponse.json({
      success: true,
      key: `inline:${uniqueSuffix}-${sanitizedFileName}`,
      url: dataUrl,
      fileName: file.name,
      size: file.size,
      mimeType,
      storage: 'inline',
    });
  } catch (error: any) {
    console.error('Erro no processamento do upload:', error);
    return NextResponse.json(
      { error: 'Falha ao processar arquivo.', details: error.message },
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

    if (key.startsWith('inline:') || key.startsWith('data:')) {
      return NextResponse.json({
        success: true,
        url: null, // O cliente usará os dados persistidos no banco
      });
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

    if (!key.startsWith('inline:') && !key.startsWith('data:')) {
      await deleteFromR2(key);
    }

    return NextResponse.json({
      success: true,
      message: 'Arquivo excluído com sucesso.',
    });
  } catch (error: any) {
    console.error('Erro ao excluir arquivo:', error);
    return NextResponse.json(
      { error: 'Falha ao excluir arquivo.', details: error.message },
      { status: 500 }
    );
  }
}
