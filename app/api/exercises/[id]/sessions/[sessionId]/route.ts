import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLocalDateTime } from '@/lib/utils/dateUtils';

export async function PUT(
  request: Request,
  { params }: { params: { id: string; sessionId: string } }
) {
  try {
    const body = await request.json();
    const { sets, reps, weight, duration, notes, setsData } = body;

    const session = await prisma.exerciseSession.update({
      where: { id: params.sessionId },
      data: {
        sets,
        reps,
        weight,
        duration,
        setsData,
        notes,
        completedAt: getLocalDateTime(), // Update completion time
      },
      include: {
        exercise: true,
      },
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('Failed to update exercise session:', error);
    return NextResponse.json(
      { error: 'Failed to update exercise session' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; sessionId: string } }
) {
  try {
    await prisma.exerciseSession.delete({
      where: { id: params.sessionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
