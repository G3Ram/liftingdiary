import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { NewWorkoutForm } from './new-workout-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function NewWorkoutPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New Workout</CardTitle>
          <CardDescription>
            Start a new workout session by providing a name and date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewWorkoutForm />
        </CardContent>
      </Card>
    </div>
  );
}
