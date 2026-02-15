'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { createWorkoutAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

export function NewWorkoutForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    // Extract and type the data
    const input = {
      name: (formData.get('name') as string) || null,
      startedAt: date,
    };

    // Call Server Action with typed parameters
    const result = await createWorkoutAction(input);

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    // Success - navigate to dashboard
    router.push('/dashboard');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Workout Name (Optional)</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="e.g., Morning Leg Day"
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label>Start Date</Label>
        <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
              type="button"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(date, 'do MMM yyyy')}
            </Button>
          </DialogTrigger>
          <DialogContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => {
                if (newDate) {
                  setDate(newDate);
                  setIsCalendarOpen(false);
                }
              }}
              initialFocus
            />
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          asChild
        >
          <Link href="/dashboard">Cancel</Link>
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Creating...' : 'Create Workout'}
        </Button>
      </div>
    </form>
  );
}
