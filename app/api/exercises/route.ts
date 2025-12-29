import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLocalDateTime } from '@/lib/utils/dateUtils';

export async function GET() {
  try {
    const exercises = await prisma.exercise.findMany({
      include: {
        workoutSets: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(exercises);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch exercises' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, description, targetSets, targetReps, targetDuration, targetDaysPerWeek } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const now = getLocalDateTime();
    const exercise = await prisma.exercise.create({
      data: {
        name,
        type: type || 'REP_BASED',
        description,
        targetSets: parseInt(targetSets) || 3,
        targetReps: targetReps ? parseInt(targetReps) : null,
        targetDuration: targetDuration ? parseInt(targetDuration) : null,
        targetDaysPerWeek: parseInt(targetDaysPerWeek) || 3,
        createdAt: now,
        updatedAt: now,
      },
    });

    return NextResponse.json(exercise, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create exercise' },
      { status: 500 }
    );
  }
}
