import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLocalDateTime, parseLocalDateTime } from '@/lib/utils/dateUtils';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const workout = await prisma.workout.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        targetDaysPerWeek: true,
      },
    });

    if (!workout) {
      return NextResponse.json(
        { error: 'Workout not found' },
        { status: 404 }
      );
    }

    // Calculate the date 7 days ago
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get all sessions in the last 7 days
    const sessions = await prisma.workoutSession.findMany({
      where: {
        workoutId: params.id,
      },
      select: {
        id: true,
        completedAt: true,
      },
    });

    // Filter sessions from the last 7 days using local date parsing
    const recentSessions = sessions.filter(session => {
      const sessionDate = parseLocalDateTime(session.completedAt);
      return sessionDate >= sevenDaysAgo;
    });

    // Count unique days (in case of multiple sessions per day)
    const uniqueDays = new Set(
      recentSessions.map(session => {
        const date = parseLocalDateTime(session.completedAt);
        return date.toLocaleDateString();
      })
    );

    const daysCompleted = uniqueDays.size;
    const targetDays = workout.targetDaysPerWeek;
    const progressPercentage = Math.round((daysCompleted / targetDays) * 100);

    return NextResponse.json({
      workoutId: workout.id,
      workoutName: workout.name,
      targetDaysPerWeek: targetDays,
      daysCompletedLast7Days: daysCompleted,
      progressPercentage,
      isOnTrack: daysCompleted >= targetDays,
      recentSessions: recentSessions.map(s => ({
        id: s.id,
        completedAt: s.completedAt,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch workout progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workout progress' },
      { status: 500 }
    );
  }
}
