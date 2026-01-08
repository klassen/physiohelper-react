import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLocalDateTime } from '@/lib/utils/dateUtils';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { sets, reps, weight, duration, notes, setsData, completedAt } = body;

    // Get the exercise to snapshot the current targets
    const exercise = await prisma.exercise.findUnique({
      where: { id: params.id },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: 'Exercise not found' },
        { status: 404 }
      );
    }

    // Use client-provided completedAt if available, otherwise fallback to server time
    const now = completedAt || getLocalDateTime();
    const session = await prisma.exerciseSession.create({
      data: {
        exerciseId: params.id,
        completedAt: now,
        sets,
        reps,
        weight,
        duration,
        setsData,
        notes,
        targetSets: exercise.targetSets,
        targetReps: exercise.targetReps,
        targetDuration: exercise.targetDuration,
      },
      include: {
        exercise: true,
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create exercise session' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sessions = await prisma.exerciseSession.findMany({
      where: {
        exerciseId: params.id,
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch exercise sessions' },
      { status: 500 }
    );
  }
}
