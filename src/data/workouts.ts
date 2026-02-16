import { db } from '@/db';
import { workouts } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

/**
 * Get all workouts for a specific user
 * @param userId - The authenticated user's ID from Clerk
 * @returns Array of user's workouts with exercises and sets
 */
export async function getUserWorkouts(userId: string) {
  const userWorkouts = await db.query.workouts.findMany({
    where: eq(workouts.userId, userId),
    orderBy: [desc(workouts.startedAt)],
    with: {
      workoutExercises: {
        with: {
          exercise: true,
          sets: {
            orderBy: (sets, { asc }) => [asc(sets.setNumber)],
          },
        },
        orderBy: (workoutExercises, { asc }) => [asc(workoutExercises.order)],
      },
    },
  });

  return userWorkouts;
}

/**
 * Get workouts for a specific user on a specific date
 * @param userId - The authenticated user's ID from Clerk
 * @param date - The date to filter workouts by
 * @returns Array of user's workouts for the specified date
 */
export async function getUserWorkoutsByDate(userId: string, date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const userWorkouts = await db.query.workouts.findMany({
    where: and(
      eq(workouts.userId, userId),
      // Filter by date range
    ),
    orderBy: [desc(workouts.startedAt)],
    with: {
      workoutExercises: {
        with: {
          exercise: true,
          sets: {
            orderBy: (sets, { asc }) => [asc(sets.setNumber)],
          },
        },
        orderBy: (workoutExercises, { asc }) => [asc(workoutExercises.order)],
      },
    },
  });

  // Filter by date in memory since we need to check startedAt timestamp
  return userWorkouts.filter((workout) => {
    const workoutDate = new Date(workout.startedAt);
    return workoutDate >= startOfDay && workoutDate <= endOfDay;
  });
}

/**
 * Get a specific workout for a user
 * @param workoutId - The workout ID
 * @param userId - The authenticated user's ID from Clerk
 * @returns Workout if found and owned by user, undefined otherwise
 */
export async function getUserWorkout(workoutId: string, userId: string) {
  return await db.query.workouts.findFirst({
    where: and(
      eq(workouts.id, workoutId),
      eq(workouts.userId, userId) // CRITICAL: Security check
    ),
    with: {
      workoutExercises: {
        with: {
          exercise: true,
          sets: {
            orderBy: (sets, { asc }) => [asc(sets.setNumber)],
          },
        },
        orderBy: (workoutExercises, { asc }) => [asc(workoutExercises.order)],
      },
    },
  });
}

/**
 * Create a new workout for a user
 * @param data - Workout data (name and startedAt)
 * @param userId - The authenticated user's ID from Clerk
 * @returns Created workout
 */
export async function createWorkout(
  data: {
    name: string | null;
    startedAt: Date;
  },
  userId: string
) {
  const [workout] = await db
    .insert(workouts)
    .values({
      ...data,
      userId,
      completedAt: null,
    })
    .returning();

  return workout;
}

/**
 * Update a workout (only if owned by user)
 * @param workoutId - The workout ID to update
 * @param data - Workout data to update
 * @param userId - The authenticated user's ID from Clerk
 * @returns Updated workout if found and owned by user, undefined otherwise
 */
export async function updateWorkout(
  workoutId: string,
  data: {
    name?: string | null;
    startedAt?: Date;
    completedAt?: Date | null;
  },
  userId: string
) {
  const [workout] = await db
    .update(workouts)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(workouts.id, workoutId),
        eq(workouts.userId, userId) // CRITICAL: Security check
      )
    )
    .returning();

  return workout;
}
