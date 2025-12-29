import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get the exercise to determine type
    const exercise = await prisma.exercise.findUnique({
      where: { id: params.id },
      select: { type: true },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: 'Exercise not found' },
        { status: 404 }
      );
    }

    // Get all sessions for this exercise
    const sessions = await prisma.exerciseSession.findMany({
      where: {
        exerciseId: params.id,
      },
      select: {
        duration: true,
        reps: true,
        setsData: true,
      },
    });

    // Find the maximum value based on exercise type
    let personalBest: number | null = null;
    
    if (sessions.length > 0) {
      const allValues: number[] = [];
      
      // Extract all individual set values from setsData
      sessions.forEach(session => {
        if (session.setsData) {
          try {
            const setsArray = JSON.parse(session.setsData);
            if (Array.isArray(setsArray)) {
              allValues.push(...setsArray.filter((v): v is number => typeof v === 'number'));
            }
          } catch (e) {
            // If setsData parsing fails, fall back to average values
            if (exercise.type === 'TIME_BASED' && session.duration) {
              allValues.push(session.duration);
            } else if (exercise.type === 'REP_BASED' && session.reps) {
              allValues.push(session.reps);
            }
          }
        } else {
          // For sessions without setsData, use the average values
          if (exercise.type === 'TIME_BASED' && session.duration) {
            allValues.push(session.duration);
          } else if (exercise.type === 'REP_BASED' && session.reps) {
            allValues.push(session.reps);
          }
        }
      });
      
      if (allValues.length > 0) {
        personalBest = Math.max(...allValues);
      }
    }

    return NextResponse.json({
      personalBest,
      totalSessions: sessions.length,
    });
  } catch (error) {
    console.error('Failed to fetch personal best:', error);
    return NextResponse.json(
      { error: 'Failed to fetch personal best' },
      { status: 500 }
    );
  }
}
