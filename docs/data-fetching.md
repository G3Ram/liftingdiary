# Data Fetching Standards

This document outlines the **mandatory** data fetching patterns for the liftingdiary application. These rules are critical for security, performance, and maintainability.

## Core Principles

### 1. Server Components Only

**CRITICAL**: ALL data fetching in this application MUST be done via Server Components.

#### ✅ ALLOWED
- Fetching data in Server Components (`.tsx` files in `app/` directory that don't have `'use client'`)
- Using async/await directly in Server Components
- Importing and calling data layer functions from Server Components

#### ❌ FORBIDDEN
- Fetching data in Client Components
- Fetching data via Route Handlers (API routes)
- Using `useEffect` with fetch/axios in client components
- Any client-side data fetching libraries (SWR, React Query, etc.)
- Fetching data in any other way not explicitly listed as allowed

### 2. Data Layer Pattern

All database queries MUST be performed through helper functions in the `/data` directory.

#### Directory Structure
```
src/
  data/
    users.ts          # User-related queries
    workouts.ts       # Workout-related queries
    exercises.ts      # Exercise-related queries
    [...etc]          # Other domain-specific query files
```

#### ✅ REQUIRED
- All database queries must use Drizzle ORM
- Each data file should export specific query functions
- Functions should be named descriptively (e.g., `getUserWorkouts`, `createWorkout`)

#### ❌ FORBIDDEN
- Raw SQL queries (use Drizzle ORM instead)
- Direct database queries in Server Components
- Inline database access without helper functions

## Security Requirements

### User Data Isolation

**CRITICAL SECURITY RULE**: A logged-in user can ONLY access their own data. They MUST NOT be able to access any other user's data.

#### Implementation Requirements

1. **Every data function MUST accept a `userId` parameter**
   ```typescript
   // ✅ CORRECT
   export async function getUserWorkouts(userId: string) {
     return await db.query.workouts.findMany({
       where: eq(workouts.userId, userId)
     });
   }

   // ❌ WRONG - No user filtering
   export async function getAllWorkouts() {
     return await db.query.workouts.findMany();
   }
   ```

2. **Always filter by userId in WHERE clauses**
   ```typescript
   // ✅ CORRECT - Filters by userId
   const workout = await db.query.workouts.findFirst({
     where: and(
       eq(workouts.id, workoutId),
       eq(workouts.userId, userId)  // CRITICAL: Always include this
     )
   });

   // ❌ WRONG - Missing userId filter
   const workout = await db.query.workouts.findFirst({
     where: eq(workouts.id, workoutId)
   });
   ```

3. **Validate userId from authenticated session**
   - Get userId from session/auth context
   - Never trust userId from request parameters or client input
   - Always verify authentication before calling data functions

## Example Patterns

### Server Component with Data Fetching

```typescript
// app/dashboard/page.tsx
import { getUser } from '@/data/users';
import { getUserWorkouts } from '@/data/workouts';
import { auth } from '@/lib/auth'; // Your auth implementation

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // ✅ CORRECT: Fetch data in Server Component
  const user = await getUser(session.user.id);
  const workouts = await getUserWorkouts(session.user.id);

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <WorkoutList workouts={workouts} />
    </div>
  );
}
```

### Data Layer Function

```typescript
// src/data/workouts.ts
import { db } from '@/lib/db';
import { workouts } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Get all workouts for a specific user
 * @param userId - The authenticated user's ID
 * @returns Array of user's workouts
 */
export async function getUserWorkouts(userId: string) {
  return await db.query.workouts.findMany({
    where: eq(workouts.userId, userId),
    orderBy: [desc(workouts.createdAt)]
  });
}

/**
 * Get a specific workout for a user
 * @param workoutId - The workout ID
 * @param userId - The authenticated user's ID
 * @returns Workout if found and owned by user, null otherwise
 */
export async function getUserWorkout(workoutId: string, userId: string) {
  return await db.query.workouts.findFirst({
    where: and(
      eq(workouts.id, workoutId),
      eq(workouts.userId, userId)  // CRITICAL: Security check
    )
  });
}

/**
 * Create a new workout for a user
 * @param data - Workout data
 * @param userId - The authenticated user's ID
 * @returns Created workout
 */
export async function createWorkout(
  data: { name: string; date: Date },
  userId: string
) {
  const [workout] = await db
    .insert(workouts)
    .values({
      ...data,
      userId,  // CRITICAL: Always set userId
    })
    .returning();

  return workout;
}
```

## Anti-Patterns to Avoid

### ❌ Client-Side Data Fetching
```typescript
// ❌ WRONG - Don't do this
'use client';

import { useEffect, useState } from 'react';

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState([]);

  useEffect(() => {
    fetch('/api/workouts')  // WRONG: Client-side fetching
      .then(res => res.json())
      .then(setWorkouts);
  }, []);

  return <div>{/* ... */}</div>;
}
```

### ❌ Route Handlers for Data Fetching
```typescript
// ❌ WRONG - Don't create API routes for data fetching
// app/api/workouts/route.ts

export async function GET() {
  const workouts = await db.query.workouts.findMany();
  return Response.json(workouts);
}
```

### ❌ Direct Database Queries in Components
```typescript
// ❌ WRONG - Don't query database directly in components
import { db } from '@/lib/db';

export default async function WorkoutsPage() {
  // WRONG: Query should be in /data layer
  const workouts = await db.query.workouts.findMany();

  return <div>{/* ... */}</div>;
}
```

### ❌ Raw SQL Queries
```typescript
// ❌ WRONG - Don't use raw SQL
export async function getUserWorkouts(userId: string) {
  return await db.execute(
    `SELECT * FROM workouts WHERE user_id = ${userId}`  // WRONG: Raw SQL
  );
}

// ✅ CORRECT - Use Drizzle ORM
export async function getUserWorkouts(userId: string) {
  return await db.query.workouts.findMany({
    where: eq(workouts.userId, userId)
  });
}
```

## When You Need Client Interactivity

If you need client-side interactivity (forms, buttons, etc.), use this pattern:

1. **Fetch data in Server Component**
2. **Pass data as props to Client Component**
3. **Use Server Actions for mutations**

```typescript
// app/workouts/page.tsx (Server Component)
import { getUserWorkouts } from '@/data/workouts';
import { WorkoutsList } from './workouts-list';
import { auth } from '@/lib/auth';

export default async function WorkoutsPage() {
  const session = await auth();
  const workouts = await getUserWorkouts(session.user.id);

  // Pass data to Client Component
  return <WorkoutsList initialWorkouts={workouts} userId={session.user.id} />;
}

// app/workouts/workouts-list.tsx (Client Component)
'use client';

import { deleteWorkoutAction } from './actions';

export function WorkoutsList({ initialWorkouts, userId }) {
  // Use Server Actions for mutations
  async function handleDelete(workoutId: string) {
    await deleteWorkoutAction(workoutId);
  }

  return (
    <div>
      {initialWorkouts.map(workout => (
        <div key={workout.id}>
          {workout.name}
          <button onClick={() => handleDelete(workout.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}

// app/workouts/actions.ts (Server Action)
'use server';

import { auth } from '@/lib/auth';
import { deleteWorkout } from '@/data/workouts';
import { revalidatePath } from 'next/cache';

export async function deleteWorkoutAction(workoutId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Data layer handles security check
  await deleteWorkout(workoutId, session.user.id);

  revalidatePath('/workouts');
}
```

## Checklist for Data Fetching

Before implementing any data fetching feature, verify:

- [ ] Data is fetched in a Server Component (not client component)
- [ ] Data is NOT fetched via Route Handlers
- [ ] Database queries use helper functions from `/data` directory
- [ ] Helper functions use Drizzle ORM (no raw SQL)
- [ ] Every query filters by `userId`
- [ ] `userId` is obtained from authenticated session (never from client input)
- [ ] User can ONLY access their own data
- [ ] No sensitive data is exposed to unauthorized users

## Summary

1. **Server Components ONLY** - All data fetching must happen server-side
2. **Data Layer Pattern** - Use `/data` directory helper functions
3. **Drizzle ORM** - No raw SQL queries
4. **Security First** - Always filter by authenticated userId
5. **User Isolation** - Users can only access their own data

These patterns are **mandatory** and **non-negotiable**. They ensure security, performance, and maintainability of the application.
