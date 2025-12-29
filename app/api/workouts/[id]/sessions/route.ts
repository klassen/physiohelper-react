import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLocalDateTime } from '@/lib/utils/dateUtils';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { notes, workoutSets } = body;

    const now = getLocalDateTime();
    const session = await prisma.workoutSession.create({
      data: {
        workoutId: params.id,
        completedAt: now,
        notes,
        workoutSets: workoutSets ? {
          create: workoutSets.map((set: any) => ({
            exerciseId: set.exerciseId,
            reps: set.reps,
            weight: set.weight,
            duration: set.duration,
            notes: set.notes,
            completedAt: now,
          })),
        } : undefined,
      },
      include: {
        workoutSets: {
          include: {
            exercise: true,
          },
        },
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create workout session' },
      { status: 500 }
    );
  }
}
