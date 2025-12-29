import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addDecember27Data() {
  console.log('Adding exercise data for December 27, 2025...');
  
  // Get all exercises
  const exercises = await prisma.exercise.findMany();
  
  // Find each exercise
  const penguinWalk = exercises.find(e => e.name.toLowerCase().includes('penguin'));
  const trampolineJumping = exercises.find(e => e.name.toLowerCase().includes('trampoline'));
  const treadmillWalk = exercises.find(e => e.name.toLowerCase().includes('treadmill'));
  const squats = exercises.find(e => e.name.toLowerCase().includes('squat'));
  
  const completedAt = '2025-12-27 14:30:00';
  
  // Penguin Walk - 3 x 30 reps
  if (penguinWalk) {
    await prisma.exerciseSession.create({
      data: {
        exerciseId: penguinWalk.id,
        sets: 3,
        reps: 30,
        duration: null,
        setsData: JSON.stringify([30, 30, 30]),
        targetSets: penguinWalk.targetSets,
        targetReps: penguinWalk.targetReps,
        targetDuration: penguinWalk.targetDuration,
        completedAt
      }
    });
    console.log('✅ Added Penguin Walk session');
  }
  
  // Trampoline jumping - 1 x 5:00 (300 seconds)
  if (trampolineJumping) {
    await prisma.exerciseSession.create({
      data: {
        exerciseId: trampolineJumping.id,
        sets: 1,
        reps: null,
        duration: 300,
        setsData: JSON.stringify([300]),
        targetSets: trampolineJumping.targetSets,
        targetReps: trampolineJumping.targetReps,
        targetDuration: trampolineJumping.targetDuration,
        completedAt
      }
    });
    console.log('✅ Added Trampoline jumping session');
  }
  
  // Treadmill walk - 1 x 5:00 (300 seconds)
  if (treadmillWalk) {
    await prisma.exerciseSession.create({
      data: {
        exerciseId: treadmillWalk.id,
        sets: 1,
        reps: null,
        duration: 300,
        setsData: JSON.stringify([300]),
        targetSets: treadmillWalk.targetSets,
        targetReps: treadmillWalk.targetReps,
        targetDuration: treadmillWalk.targetDuration,
        completedAt
      }
    });
    console.log('✅ Added Treadmill walk session');
  }
  
  // Squats - 2 x 10 reps, 1 x 12 reps (3 sets total)
  if (squats) {
    await prisma.exerciseSession.create({
      data: {
        exerciseId: squats.id,
        sets: 3,
        reps: 10, // Average or first set rep count
        duration: null,
        setsData: JSON.stringify([10, 10, 12]),
        targetSets: squats.targetSets,
        targetReps: squats.targetReps,
        targetDuration: squats.targetDuration,
        completedAt
      }
    });
    console.log('✅ Added Squats session');
  }
  
  console.log('\n✅ All December 27 data added successfully!');
  
  await prisma.$disconnect();
}

addDecember27Data()
  .catch((error) => {
    console.error('Error adding data:', error);
    process.exit(1);
  });
