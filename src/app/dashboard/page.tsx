import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserWorkouts } from '@/data/workouts'
import { DashboardClient } from './dashboard-client'

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // Fetch workouts for the authenticated user
  const workouts = await getUserWorkouts(userId)

  return <DashboardClient workouts={workouts} />
}
