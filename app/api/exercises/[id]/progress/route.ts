import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseLocalDateTime } from '@/lib/utils/dateUtils';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const exercise = await prisma.exercise.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        targetDaysPerWeek: true,
      },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: 'Exercise not found' },
        { status: 404 }
      );
    }

    // Calculate the date 7 days ago
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get all sessions
    const sessions = await prisma.exerciseSession.findMany({
      where: {
        exerciseId: params.id,
      },
      select: {
        id: true,
        completedAt: true,
      },
    });

    // Filter sessions from the last 7 days
    const recentSessions = sessions.filter(session => {
      const sessionDate = parseLocalDateTime(session.completedAt);
      return sessionDate >= sevenDaysAgo;
    });

    // Count unique days
    const uniqueDays = new Set(
      recentSessions.map(session => {
        const date = parseLocalDateTime(session.completedAt);
        return date.toLocaleDateString();
      })
    );

    const daysCompleted = uniqueDays.size;
    const targetDays = exercise.targetDaysPerWeek;

    return NextResponse.json({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      targetDaysPerWeek: targetDays,
      daysCompletedLast7Days: daysCompleted,
      progressPercentage: Math.round((daysCompleted / targetDays) * 100),
      isOnTrack: daysCompleted >= targetDays,
    });
  } catch (error) {
    console.error('Failed to fetch exercise progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exercise progress' },
      { status: 500 }
    );
  }
}
