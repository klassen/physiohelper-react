import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLocalDateTime } from '@/lib/utils/dateUtils';

export async function GET() {
  try {
    const workoutSets = await prisma.workoutSet.findMany({
      include: {
        exercise: true,
      },
      orderBy: {
        completedAt: 'desc',
      },
    });
    return NextResponse.json(workoutSets);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch workout sets' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { exerciseId, reps, weight, duration, notes, completedAt } = body;

    if (!exerciseId || reps === undefined) {
      return NextResponse.json(
        { error: 'Exercise ID and reps are required' },
        { status: 400 }
      );
    }

    const workoutSet = await prisma.workoutSet.create({
      data: {
        exerciseId,
        reps,
        weight: weight ? parseFloat(weight) : null,
        duration: duration ? parseInt(duration) : null,
        notes,
        // Use client-provided completedAt if available, otherwise fallback to server time
        completedAt: completedAt || getLocalDateTime(),
      },
      include: {
        exercise: true,
      },
    });

    return NextResponse.json(workoutSet, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create workout set' },
      { status: 500 }
    );
  }
}
