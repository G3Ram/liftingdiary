'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { updateWorkout } from '@/data/workouts';

// Define Zod schema for validation
const updateWorkoutSchema = z.object({
  workoutId: z.string().uuid('Invalid workout ID'),
  name: z.string().min(1).max(100).nullable().optional(),
  startedAt: z.date({
    invalid_type_error: 'Start date must be a valid date',
  }).optional(),
  completedAt: z.date().nullable().optional(),
});

export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;

// Define return types for the action
type ActionSuccess = {
  success: true;
  workout: Awaited<ReturnType<typeof updateWorkout>>;
};

type ActionError = {
  success: false;
  error: string;
  details?: z.ZodFormattedError<UpdateWorkoutInput>;
};

export type UpdateWorkoutActionResult = ActionSuccess | ActionError;

/**
 * Update an existing workout
 */
export async function updateWorkoutAction(input: {
  workoutId: string;
  name?: string | null;
  startedAt?: Date;
  completedAt?: Date | null;
}): Promise<UpdateWorkoutActionResult> {
  // 1. Authenticate
  const { userId } = await auth();

  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  // 2. Validate input
  const validation = updateWorkoutSchema.safeParse(input);

  if (!validation.success) {
    return {
      success: false,
      error: 'Invalid input',
      details: validation.error.flatten(),
    };
  }

  // 3. Call data layer
  try {
    const { workoutId, ...data } = validation.data;
    const workout = await updateWorkout(workoutId, data, userId);

    if (!workout) {
      return { success: false, error: 'Workout not found or you do not have permission to edit it' };
    }

    // 4. Revalidate
    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/workout/${workoutId}`);

    return { success: true, workout };
  } catch (error) {
    console.error('Failed to update workout:', error);
    return { success: false, error: 'Failed to update workout' };
  }
}
