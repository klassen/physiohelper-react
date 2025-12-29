import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLocalDateTime } from '@/lib/utils/dateUtils';

export async function GET() {
  try {
    const workouts = await prisma.workout.findMany({
      include: {
        exercises: {
          include: {
            exercise: true,
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
        sessions: {
          orderBy: {
            completedAt: 'desc',
          },
          take: 7, // Get recent sessions for progress tracking
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(workouts);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch workouts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, targetDaysPerWeek, exercises } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const now = getLocalDateTime();
    const workout = await prisma.workout.create({
      data: {
        name,
        description,
        targetDaysPerWeek: targetDaysPerWeek || 3,
        createdAt: now,
        updatedAt: now,
        exercises: exercises ? {
          create: exercises.map((ex: any, index: number) => ({
            exerciseId: ex.exerciseId,
            targetSets: ex.targetSets || 3,
            targetReps: ex.targetReps,
            targetDuration: ex.targetDuration,
            orderIndex: index,
          })),
        } : undefined,
      },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
        },
      },
    });

    return NextResponse.json(workout, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create workout' },
      { status: 500 }
    );
  }
}
