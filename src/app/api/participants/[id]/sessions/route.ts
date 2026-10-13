import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sessions = await prisma.clinicalSession.findMany({
      where: { participantId: id },
      orderBy: { sessionNumber: 'asc' },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Erro ao buscar sessões clínicas:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar sessões clínicas do participante.' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const {
      sessionNumber,
      sessionType,
      sessionDate,
      shadeRight,
      shadeLeft,
      painScore0h,
      painScore1h,
      painScore24h,
      painScore48h,
      gingivalIrritation,
      adverseEvents,
      operatorName,
      evaluatorName,
      notes,
    } = body;

    if (!sessionNumber) {
      return NextResponse.json(
        { error: 'O número da sessão é obrigatório.' },
        { status: 400 }
      );
    }

    // Procura se já existe sessão registrada para este número
    const existing = await prisma.clinicalSession.findFirst({
      where: {
        participantId: id,
        sessionNumber: Number(sessionNumber),
      },
    });

    const parsedDate = sessionDate ? new Date(sessionDate) : new Date();

    let session;
    if (existing) {
      session = await prisma.clinicalSession.update({
        where: { id: existing.id },
        data: {
          sessionType: sessionType || existing.sessionType,
          sessionDate: parsedDate,
          shadeRight: shadeRight !== undefined ? shadeRight : existing.shadeRight,
          shadeLeft: shadeLeft !== undefined ? shadeLeft : existing.shadeLeft,
          painScore0h: painScore0h !== undefined ? (painScore0h === null ? null : Number(painScore0h)) : existing.painScore0h,
          painScore1h: painScore1h !== undefined ? (painScore1h === null ? null : Number(painScore1h)) : existing.painScore1h,
          painScore24h: painScore24h !== undefined ? (painScore24h === null ? null : Number(painScore24h)) : existing.painScore24h,
          painScore48h: painScore48h !== undefined ? (painScore48h === null ? null : Number(painScore48h)) : existing.painScore48h,
          gingivalIrritation: gingivalIrritation !== undefined ? gingivalIrritation : existing.gingivalIrritation,
          adverseEvents: adverseEvents !== undefined ? adverseEvents : existing.adverseEvents,
          operatorName: operatorName !== undefined ? operatorName : existing.operatorName,
          evaluatorName: evaluatorName !== undefined ? evaluatorName : existing.evaluatorName,
          notes: notes !== undefined ? notes : existing.notes,
        },
      });
    } else {
      session = await prisma.clinicalSession.create({
        data: {
          participantId: id,
          sessionNumber: Number(sessionNumber),
          sessionType: sessionType || 'INTERVENTION',
          sessionDate: parsedDate,
          shadeRight: shadeRight || null,
          shadeLeft: shadeLeft || null,
          painScore0h: painScore0h !== undefined && painScore0h !== null ? Number(painScore0h) : null,
          painScore1h: painScore1h !== undefined && painScore1h !== null ? Number(painScore1h) : null,
          painScore24h: painScore24h !== undefined && painScore24h !== null ? Number(painScore24h) : null,
          painScore48h: painScore48h !== undefined && painScore48h !== null ? Number(painScore48h) : null,
          gingivalIrritation: gingivalIrritation || 'Ausente',
          adverseEvents: adverseEvents || null,
          operatorName: operatorName || null,
          evaluatorName: evaluatorName || null,
          notes: notes || null,
        },
      });
    }

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Erro ao salvar sessão clínica:', error);
    return NextResponse.json(
      { error: 'Erro ao registrar sessão clínica.' },
      { status: 500 }
    );
  }
}
