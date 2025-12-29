import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLocalDateTime, parseLocalDateTime } from '@/lib/utils/dateUtils';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get today's date in local time
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Get all sessions for this exercise
    const sessions = await prisma.exerciseSession.findMany({
      where: {
        exerciseId: params.id,
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    // Find today's session by parsing local datetime
    const todaySession = sessions.find(session => {
      const sessionDate = parseLocalDateTime(session.completedAt);
      return sessionDate >= todayStart && sessionDate < todayEnd;
    });

    if (todaySession) {
      return NextResponse.json(todaySession);
    } else {
      return NextResponse.json(null);
    }
  } catch (error) {
    console.error('Failed to fetch today\'s session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch today\'s session' },
      { status: 500 }
    );
  }
}
