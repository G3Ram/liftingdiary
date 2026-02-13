'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Mock workout data type
interface Workout {
  id: string
  name: string
  exercises: {
    name: string
    sets: number
    reps: number
    weight: number
  }[]
  duration: number
  completedAt: Date
}

// Mock workout data for UI demonstration
const mockWorkouts: Workout[] = [
  {
    id: '1',
    name: 'Upper Body Push',
    exercises: [
      { name: 'Bench Press', sets: 3, reps: 8, weight: 185 },
      { name: 'Overhead Press', sets: 3, reps: 10, weight: 95 },
      { name: 'Tricep Dips', sets: 3, reps: 12, weight: 0 }
    ],
    duration: 45,
    completedAt: new Date()
  },
  {
    id: '2',
    name: 'Lower Body',
    exercises: [
      { name: 'Squats', sets: 4, reps: 6, weight: 225 },
      { name: 'Romanian Deadlifts', sets: 3, reps: 8, weight: 185 },
      { name: 'Leg Press', sets: 3, reps: 12, weight: 315 }
    ],
    duration: 60,
    completedAt: new Date()
  }
]

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

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
              {mockWorkouts.length} workout{mockWorkouts.length !== 1 ? 's' : ''} logged
            </p>
          </div>

          <div className="space-y-4">
            {mockWorkouts.length > 0 ? (
              mockWorkouts.map((workout) => (
                <Card key={workout.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{workout.name}</CardTitle>
                        <CardDescription>
                          {workout.duration} minutes • {format(workout.completedAt, 'do MMM yyyy')}
                        </CardDescription>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {workout.exercises.length} exercises
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {workout.exercises.map((exercise, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="font-medium">{exercise.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {exercise.sets} × {exercise.reps} reps
                            {exercise.weight > 0 && ` @ ${exercise.weight} lbs`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
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
