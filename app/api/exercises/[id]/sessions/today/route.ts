import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLocalDate, parseLocalDateTime } from '@/lib/utils/dateUtils';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get the current date from query parameter (client-provided) or fallback to server time
    const { searchParams } = new URL(request.url);
    const clientDate = searchParams.get('date') || getLocalDate();
    
    // Parse the date to create start and end bounds for "today"
    const [year, month, day] = clientDate.split('-').map(Number);
    const todayStart = new Date(year, month - 1, day);
    const todayEnd = new Date(year, month - 1, day + 1);

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
