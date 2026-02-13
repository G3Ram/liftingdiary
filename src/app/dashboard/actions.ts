'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { workouts } from '@/db/schema'

export async function createWorkoutAction(formData: FormData) {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  const name = formData.get('name') as string
  const dateStr = formData.get('date') as string

  if (!dateStr) {
    throw new Error('Date is required')
  }

  const startedAt = new Date(dateStr)

  // Create the workout
  const [workout] = await db
    .insert(workouts)
    .values({
      userId,
      name: name || null,
      startedAt,
      completedAt: null, // Workout is in progress
    })
    .returning()

  revalidatePath('/dashboard')

  return { success: true, workoutId: workout.id }
}
