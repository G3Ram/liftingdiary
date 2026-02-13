'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
              filteredWorkouts.map((workout) => {
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
              })
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No workouts logged for this date
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
