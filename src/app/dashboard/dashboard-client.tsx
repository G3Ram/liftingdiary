'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// Type definitions matching our database schema
interface WorkoutSet {
  id: string
  setNumber: number
  reps: number | null
  weight: string | null
}

interface WorkoutExercise {
  id: string
  order: number
  exercise: {
    id: string
    name: string
  }
  sets: WorkoutSet[]
}

interface Workout {
  id: string
  name: string | null
  startedAt: Date
  completedAt: Date | null
  workoutExercises: WorkoutExercise[]
}

interface DashboardClientProps {
  workouts: Workout[]
}

export function DashboardClient({ workouts }: DashboardClientProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  // Filter workouts by selected date
  const filteredWorkouts = selectedDate
    ? workouts.filter((workout) => {
        const workoutDate = new Date(workout.startedAt)
        return (
          workoutDate.getDate() === selectedDate.getDate() &&
          workoutDate.getMonth() === selectedDate.getMonth() &&
          workoutDate.getFullYear() === selectedDate.getFullYear()
        )
      })
    : workouts

  // Check if selected date is in the past (before today)
  const isDateInPast = selectedDate
    ? (() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const selected = new Date(selectedDate)
        selected.setHours(0, 0, 0, 0)
        return selected < today
      })()
    : false

  // Calculate workout duration in minutes
  const getWorkoutDuration = (workout: Workout): number => {
    if (!workout.completedAt) return 0
    const start = new Date(workout.startedAt).getTime()
    const end = new Date(workout.completedAt).getTime()
    return Math.round((end - start) / 1000 / 60)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Workout Dashboard</h1>
        <p className="text-muted-foreground">
          Track and view your workout progress
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Section */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Select Date</CardTitle>
              <CardDescription>
                {selectedDate ? format(selectedDate, 'do MMM yyyy') : 'Pick a date'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
        </div>

        {/* Workouts List Section */}
        <div className="lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold">
              Workouts for {selectedDate ? format(selectedDate, 'do MMM yyyy') : 'selected date'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredWorkouts.length} workout{filteredWorkouts.length !== 1 ? 's' : ''} logged
            </p>
          </div>

          <div className="space-y-4">
            {filteredWorkouts.length > 0 ? (
              <>
                {filteredWorkouts.map((workout) => {
                  const duration = getWorkoutDuration(workout)
                  return (
                    <Card key={workout.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle>{workout.name || 'Untitled Workout'}</CardTitle>
                            <CardDescription>
                              {duration > 0 ? `${duration} minutes • ` : ''}
                              {format(new Date(workout.startedAt), 'do MMM yyyy')}
                            </CardDescription>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {workout.workoutExercises.length} exercise{workout.workoutExercises.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {workout.workoutExercises.map((workoutExercise) => {
                            const totalSets = workoutExercise.sets.length
                            const firstSet = workoutExercise.sets[0]

                            return (
                              <div
                                key={workoutExercise.id}
                                className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                              >
                                <div className="font-medium">{workoutExercise.exercise.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {totalSets} × {firstSet?.reps || 0} reps
                                  {firstSet?.weight && parseFloat(firstSet.weight) > 0
                                    ? ` @ ${firstSet.weight} lbs`
                                    : ''}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
                {/* Show "Start New Workout" button for today and future dates even when workouts exist */}
                {!isDateInPast && (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Link href="/dashboard/workout/new">
                        <Button>Start New Workout</Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  {isDateInPast ? (
                    // Show playful message for past dates with no data
                    <div>
                      <p className="text-2xl mb-2">🦴</p>
                      <p className="text-muted-foreground mb-1">
                        No workouts logged for this date
                      </p>
                      <p className="text-sm text-muted-foreground/70">
                        Looks like this was a rest day! 💤
                      </p>
                    </div>
                  ) : (
                    // Show "Start New Workout" button for today and future dates
                    <>
                      <p className="text-muted-foreground mb-4">
                        No workouts logged for this date
                      </p>
                      <Link href="/dashboard/workout/new">
                        <Button>Start New Workout</Button>
                      </Link>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
