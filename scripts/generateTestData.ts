// Script to generate test historical data for exercises
// Run with: npx tsx scripts/generateTestData.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getLocalDateTime(daysAgo: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function generateTestData() {
  try {
    // Delete all existing sessions
    console.log('Deleting existing test data...');
    await prisma.exerciseSession.deleteMany({});
    console.log('✓ Cleared all sessions\n');

    // Fetch all active exercises
    const exercises = await prisma.exercise.findMany({
      where: { archived: false }
    });

    if (exercises.length === 0) {
      console.log('No exercises found. Please create some exercises first.');
      return;
    }

    console.log(`Found ${exercises.length} exercise(s). Generating test data...`);

    for (const exercise of exercises) {
      console.log(`\nGenerating data for: ${exercise.name} (${exercise.type})`);
      
      // Generate sessions for random days in the last 30 days
      const sessionDays = [0, 1, 2, 4, 5, 7, 9, 11, 13, 15, 16, 18, 20, 22, 24, 26, 28]; // Some days over the month
      
      for (const daysAgo of sessionDays) {
        // First 15 days (29-15 days ago) use base goals
        // Last 15 days (14-0 days ago) use 30% higher goals
        const isRecentPeriod = daysAgo <= 14;
        const targetMultiplier = isRecentPeriod ? 1.3 : 1.0;
        
        const targetSets = exercise.targetSets;
        const targetReps = exercise.targetReps ? Math.round(exercise.targetReps * targetMultiplier) : null;
        const targetDuration = exercise.targetDuration ? Math.round(exercise.targetDuration * targetMultiplier) : null;
        
        const sets = Math.floor(Math.random() * 2) + targetSets - 1; // targetSets ± 1
        
        if (exercise.type === 'REP_BASED') {
          // Generate rep-based session
          const setsData = [];
          for (let i = 0; i < sets; i++) {
            const baseReps = targetReps || 10;
            const variance = Math.floor(Math.random() * 6) - 2; // -2 to +3
            setsData.push(Math.max(1, baseReps + variance));
          }
          
          const avgReps = Math.round(setsData.reduce((a, b) => a + b, 0) / setsData.length);
          
          await prisma.exerciseSession.create({
            data: {
              exerciseId: exercise.id,
              sets,
              reps: avgReps,
              setsData: JSON.stringify(setsData),
              targetSets,
              targetReps,
              targetDuration,
              completedAt: getLocalDateTime(daysAgo),
            }
          });
          
          console.log(`  - ${daysAgo} days ago: ${sets} sets × ${setsData.join(', ')} reps (goal: ${targetReps})`);
        } else {
          // Generate time-based session
          const setsData = [];
          for (let i = 0; i < sets; i++) {
            const baseTime = targetDuration || 180;
            const variance = Math.floor(Math.random() * 31) - 10; // -10 to +20 seconds
            setsData.push(Math.max(1, baseTime + variance));
          }
          
          const avgDuration = Math.round(setsData.reduce((a, b) => a + b, 0) / setsData.length);
          
          await prisma.exerciseSession.create({
            data: {
              exerciseId: exercise.id,
              sets,
              duration: avgDuration,
              setsData: JSON.stringify(setsData),
              targetSets,
              targetReps,
              targetDuration,
              completedAt: getLocalDateTime(daysAgo),
            }
          });
          
          const formatTime = (seconds: number) => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${String(secs).padStart(2, '0')}`;
          };
          
          console.log(`  - ${daysAgo} days ago: ${sets} sets × ${setsData.map(formatTime).join(', ')} (goal: ${formatTime(targetDuration || 0)})`);
        }
      }
    }

    console.log('\n✅ Test data generated successfully!');
  } catch (error) {
    console.error('Error generating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateTestData();
