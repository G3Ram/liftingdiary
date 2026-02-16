import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { getUserWorkout } from '@/data/workouts';
import { EditWorkoutForm } from './edit-workout-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface EditWorkoutPageProps {
  params: Promise<{
    workoutId: string;
  }>;
}

export default async function EditWorkoutPage({ params }: EditWorkoutPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const { workoutId } = await params;

  // Fetch the workout for the authenticated user
  const workout = await getUserWorkout(workoutId, userId);

  // If workout doesn't exist or doesn't belong to user, show 404
  if (!workout) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Edit Workout</CardTitle>
          <CardDescription>
            Update your workout details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditWorkoutForm
            workoutId={workout.id}
            initialName={workout.name}
            initialStartedAt={workout.startedAt}
          />
        </CardContent>
      </Card>
    </div>
  );
}
