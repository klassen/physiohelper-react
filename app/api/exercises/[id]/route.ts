import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLocalDateTime } from '@/lib/utils/dateUtils';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const exercise = await prisma.exercise.findUnique({
      where: { id: params.id },
      include: {
        workoutSets: {
          orderBy: {
            completedAt: 'desc',
          },
        },
      },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: 'Exercise not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(exercise);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch exercise' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, type, description, targetSets, targetReps, targetDuration, targetDaysPerWeek, archived } = body;

    const exercise = await prisma.exercise.update({
      where: { id: params.id },
      data: {
        name,
        type,
        description,
        targetSets: targetSets ? parseInt(targetSets) : undefined,
        targetReps: targetReps ? parseInt(targetReps) : null,
        targetDuration: targetDuration ? parseInt(targetDuration) : null,
        targetDaysPerWeek: targetDaysPerWeek ? parseInt(targetDaysPerWeek) : undefined,
        archived: archived !== undefined ? archived : undefined,
        updatedAt: getLocalDateTime(),
      },
    });

    return NextResponse.json(exercise);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update exercise' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.exercise.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete exercise' },
      { status: 500 }
    );
  }
}
