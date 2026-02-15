'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createWorkout } from '@/data/workouts';

// Define Zod schema for validation
const createWorkoutSchema = z.object({
  name: z.string().min(1).max(100).nullable(),
  startedAt: z.date({
    required_error: 'Start date is required',
    invalid_type_error: 'Start date must be a valid date',
  }),
});

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;

// Define return types for the action
type ActionSuccess = {
  success: true;
  workout: Awaited<ReturnType<typeof createWorkout>>;
};

type ActionError = {
  success: false;
  error: string;
  details?: z.ZodFormattedError<CreateWorkoutInput>;
};

export type CreateWorkoutActionResult = ActionSuccess | ActionError;

/**
 * Create a new workout
 */
export async function createWorkoutAction(input: {
  name: string | null;
  startedAt: Date;
}): Promise<CreateWorkoutActionResult> {
  // 1. Authenticate
  const { userId } = await auth();

  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  // 2. Validate input
  const validation = createWorkoutSchema.safeParse(input);

  if (!validation.success) {
    return {
      success: false,
      error: 'Invalid input',
      details: validation.error.flatten(),
    };
  }

  // 3. Call data layer
  try {
    const workout = await createWorkout(validation.data, userId);

    // 4. Revalidate
    revalidatePath('/dashboard');

    return { success: true, workout };
  } catch (error) {
    console.error('Failed to create workout:', error);
    return { success: false, error: 'Failed to create workout' };
  }
}
