# Data Mutations Standards

This document outlines the **mandatory** data mutation patterns for the liftingdiary application. These rules ensure security, type safety, validation, and maintainability.

## Core Principles

### Three-Layer Architecture

**CRITICAL**: All data mutations MUST follow this three-layer architecture:

```
Client Component → Server Action → Data Layer Helper → Database
```

1. **Client Component** - Calls Server Action with typed parameters
2. **Server Action** - Validates input with Zod, calls data layer helper
3. **Data Layer Helper** - Performs database operation using Drizzle ORM
4. **Database** - Executed via Drizzle ORM (no raw SQL)

## 1. Data Layer Helpers

### Required Pattern

**CRITICAL**: ALL database mutations (INSERT, UPDATE, DELETE) MUST be done through helper functions in the `/src/data` directory.

#### Directory Structure
```
src/
  data/
    workouts.ts       # Workout CRUD operations
    exercises.ts      # Exercise CRUD operations
    sets.ts           # Set CRUD operations
    [...etc]          # Other domain-specific files
```

#### ✅ REQUIRED
- All mutations use helper functions in `/src/data`
- Helper functions use Drizzle ORM exclusively
- Each function has a single, clear responsibility
- Functions are properly typed with TypeScript
- Functions accept `userId` for user-owned data
- Functions return typed results (not `any`)

#### ❌ FORBIDDEN
- Direct database calls in Server Actions
- Direct database calls in Server Components
- Raw SQL queries (use Drizzle ORM)
- Inline database operations without helper functions
- Helper functions without proper TypeScript types

### Data Layer Examples

```typescript
// ✅ CORRECT - src/data/workouts.ts
import { db } from '@/db';
import { workouts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Create a new workout for a user
 */
export async function createWorkout(
  data: {
    name: string | null;
    startedAt: Date;
  },
  userId: string
) {
  const [workout] = await db
    .insert(workouts)
    .values({
      ...data,
      userId,
      completedAt: null,
    })
    .returning();

  return workout;
}

/**
 * Update a workout (only if owned by user)
 */
export async function updateWorkout(
  workoutId: string,
  data: {
    name?: string | null;
    completedAt?: Date | null;
  },
  userId: string
) {
  const [workout] = await db
    .update(workouts)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(workouts.id, workoutId),
        eq(workouts.userId, userId) // CRITICAL: Security check
      )
    )
    .returning();

  return workout;
}

/**
 * Delete a workout (only if owned by user)
 */
export async function deleteWorkout(workoutId: string, userId: string) {
  const [deleted] = await db
    .delete(workouts)
    .where(
      and(
        eq(workouts.id, workoutId),
        eq(workouts.userId, userId) // CRITICAL: Security check
      )
    )
    .returning();

  return deleted;
}
```

#### ❌ WRONG Patterns
```typescript
// ❌ WRONG - Raw SQL
export async function createWorkout(data: any, userId: string) {
  return await db.execute(
    `INSERT INTO workouts (user_id, name) VALUES (${userId}, ${data.name})`
  );
}

// ❌ WRONG - No TypeScript types
export async function updateWorkout(id, data, userId) {
  return await db.update(workouts).set(data);
}

// ❌ WRONG - Missing userId security check
export async function deleteWorkout(workoutId: string) {
  return await db.delete(workouts).where(eq(workouts.id, workoutId));
}
```

## 2. Server Actions

### Required Pattern

**CRITICAL**: ALL data mutations MUST be performed through Server Actions in colocated `actions.ts` files.

#### File Colocation
```
src/
  app/
    dashboard/
      page.tsx          # Server Component
      dashboard-client.tsx  # Client Component
      actions.ts        # Server Actions for this route
    workouts/
      page.tsx
      actions.ts        # Server Actions for this route
```

#### ✅ REQUIRED
- Server Actions in `actions.ts` files colocated with routes
- File starts with `'use server'` directive
- All parameters are properly typed (NO `FormData`)
- All inputs validated with Zod schemas
- Authentication checked via `auth()` from Clerk
- Data layer helpers called for database operations
- `revalidatePath()` called after mutations
- Proper error handling with meaningful messages
- Return typed results (success/error objects)

#### ❌ FORBIDDEN
- Using `FormData` as parameter type
- Accepting unvalidated inputs
- Direct database calls in Server Actions
- Missing authentication checks
- Not calling `revalidatePath()` after mutations
- Returning `any` type
- Exposing raw database errors to client

### Server Action Examples

```typescript
// ✅ CORRECT - app/dashboard/actions.ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createWorkout, updateWorkout, deleteWorkout } from '@/data/workouts';

// Define Zod schemas for validation
const createWorkoutSchema = z.object({
  name: z.string().min(1).max(100).nullable(),
  startedAt: z.date(),
});

const updateWorkoutSchema = z.object({
  workoutId: z.string().uuid(),
  name: z.string().min(1).max(100).nullable().optional(),
  completedAt: z.date().nullable().optional(),
});

const deleteWorkoutSchema = z.object({
  workoutId: z.string().uuid(),
});

/**
 * Create a new workout
 */
export async function createWorkoutAction(input: {
  name: string | null;
  startedAt: Date;
}) {
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

/**
 * Update a workout
 */
export async function updateWorkoutAction(input: {
  workoutId: string;
  name?: string | null;
  completedAt?: Date | null;
}) {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  const validation = updateWorkoutSchema.safeParse(input);

  if (!validation.success) {
    return {
      success: false,
      error: 'Invalid input',
      details: validation.error.flatten(),
    };
  }

  try {
    const { workoutId, ...data } = validation.data;
    const workout = await updateWorkout(workoutId, data, userId);

    if (!workout) {
      return { success: false, error: 'Workout not found' };
    }

    revalidatePath('/dashboard');
    revalidatePath(`/workouts/${workoutId}`);

    return { success: true, workout };
  } catch (error) {
    console.error('Failed to update workout:', error);
    return { success: false, error: 'Failed to update workout' };
  }
}

/**
 * Delete a workout
 */
export async function deleteWorkoutAction(input: { workoutId: string }) {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  const validation = deleteWorkoutSchema.safeParse(input);

  if (!validation.success) {
    return {
      success: false,
      error: 'Invalid input',
      details: validation.error.flatten(),
    };
  }

  try {
    const deleted = await deleteWorkout(validation.data.workoutId, userId);

    if (!deleted) {
      return { success: false, error: 'Workout not found' };
    }

    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Failed to delete workout:', error);
    return { success: false, error: 'Failed to delete workout' };
  }
}
```

#### ❌ WRONG Patterns
```typescript
// ❌ WRONG - Using FormData
'use server';

export async function createWorkoutAction(formData: FormData) {
  const name = formData.get('name') as string;
  // Don't use FormData as parameter type
}

// ❌ WRONG - No Zod validation
'use server';

export async function createWorkoutAction(input: any) {
  // Accepting unvalidated input - SECURITY RISK
  const workout = await createWorkout(input, userId);
}

// ❌ WRONG - Direct database call
'use server';

import { db } from '@/db';

export async function createWorkoutAction(input: any) {
  // Don't call database directly - use data layer
  const [workout] = await db.insert(workouts).values(input).returning();
}

// ❌ WRONG - No authentication check
'use server';

export async function createWorkoutAction(input: any, userId: string) {
  // Never trust userId from client - SECURITY RISK
  const workout = await createWorkout(input, userId);
}

// ❌ WRONG - No error handling
'use server';

export async function createWorkoutAction(input: any) {
  const workout = await createWorkout(input, userId);
  // What if this throws an error?
  return workout;
}

// ❌ WRONG - Not revalidating
'use server';

export async function createWorkoutAction(input: any) {
  const workout = await createWorkout(input, userId);
  // Missing revalidatePath() - UI won't update
  return { success: true, workout };
}
```

## 3. Input Validation with Zod

### Required Pattern

**CRITICAL**: ALL Server Action inputs MUST be validated using Zod schemas before processing.

#### ✅ REQUIRED
- Install `zod` package (`npm install zod`)
- Define Zod schema for each Server Action
- Use `safeParse()` for validation (not `parse()`)
- Return validation errors to client
- Validate before calling data layer
- Use TypeScript inference from Zod schemas

#### Installation
```bash
npm install zod
```

### Zod Schema Examples

```typescript
// ✅ CORRECT - Comprehensive Zod schemas
import { z } from 'zod';

// Create workout schema
export const createWorkoutSchema = z.object({
  name: z
    .string()
    .min(1, 'Name must not be empty')
    .max(100, 'Name must be less than 100 characters')
    .nullable(),
  startedAt: z.date({
    required_error: 'Start date is required',
    invalid_type_error: 'Start date must be a valid date',
  }),
});

// Update workout schema (partial)
export const updateWorkoutSchema = z.object({
  workoutId: z.string().uuid('Invalid workout ID'),
  name: z.string().min(1).max(100).nullable().optional(),
  completedAt: z.date().nullable().optional(),
});

// Create exercise schema
export const createExerciseSchema = z.object({
  name: z
    .string()
    .min(1, 'Exercise name is required')
    .max(100, 'Exercise name must be less than 100 characters')
    .trim(),
});

// Create set schema
export const createSetSchema = z.object({
  workoutExerciseId: z.string().uuid('Invalid workout exercise ID'),
  setNumber: z
    .number()
    .int('Set number must be an integer')
    .positive('Set number must be positive'),
  reps: z
    .number()
    .int('Reps must be an integer')
    .positive('Reps must be positive')
    .nullable(),
  weight: z
    .number()
    .positive('Weight must be positive')
    .nullable(),
});

// Infer TypeScript types from schemas
export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type CreateSetInput = z.infer<typeof createSetSchema>;
```

### Using Zod in Server Actions

```typescript
// ✅ CORRECT - Proper validation flow
'use server';

import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  age: z.number().positive(),
});

export async function myAction(input: unknown) {
  // Use safeParse to validate
  const validation = schema.safeParse(input);

  if (!validation.success) {
    // Return validation errors
    return {
      success: false,
      error: 'Validation failed',
      details: validation.error.flatten(),
    };
  }

  // validation.data is now typed correctly
  const { name, age } = validation.data;

  // Continue with validated data
  // ...
}
```

#### ❌ WRONG Patterns
```typescript
// ❌ WRONG - Using parse() instead of safeParse()
export async function myAction(input: unknown) {
  const data = schema.parse(input); // Throws error, not graceful
}

// ❌ WRONG - No validation
export async function myAction(input: any) {
  // Accepting any input without validation
  const result = await someOperation(input);
}

// ❌ WRONG - Manual validation
export async function myAction(input: any) {
  if (!input.name || input.name.length < 1) {
    return { error: 'Invalid name' };
  }
  // Use Zod instead of manual checks
}
```

## 4. Client Component Integration

### Calling Server Actions

```typescript
// ✅ CORRECT - Client Component calling Server Action
'use client';

import { useState } from 'react';
import { createWorkoutAction } from './actions';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function CreateWorkoutForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    // Extract and type the data
    const input = {
      name: formData.get('name') as string | null,
      startedAt: new Date(formData.get('date') as string),
    };

    // Call Server Action with typed parameters
    const result = await createWorkoutAction(input);

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    // Success - navigate or update UI
    router.push('/dashboard');
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" type="text" />
      <input name="date" type="date" />

      {error && <p className="text-red-500">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Workout'}
      </Button>
    </form>
  );
}
```

### Using with useTransition

```typescript
// ✅ CORRECT - Using useTransition for optimistic updates
'use client';

import { useTransition } from 'react';
import { deleteWorkoutAction } from './actions';

export function DeleteWorkoutButton({ workoutId }: { workoutId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteWorkoutAction({ workoutId });

      if (!result.success) {
        alert(result.error);
      }
    });
  }

  return (
    <button onClick={handleDelete} disabled={isPending}>
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
```

## 5. Security Requirements

### User Data Isolation

**CRITICAL**: Every mutation MUST enforce user data isolation.

#### Required Security Pattern

1. **Get `userId` from `auth()`** - Never from client input
2. **Pass `userId` to data layer** - Every mutation function
3. **Filter by `userId` in WHERE clause** - For updates and deletes
4. **Set `userId` in INSERT** - For creates

```typescript
// ✅ CORRECT - Secure mutation pattern
'use server';

import { auth } from '@clerk/nextjs/server';

export async function updateWorkoutAction(input: any) {
  // 1. Get userId from auth
  const { userId } = await auth();

  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  // 2. Pass userId to data layer
  const workout = await updateWorkout(input.workoutId, input.data, userId);

  return { success: true, workout };
}

// Data layer filters by userId
export async function updateWorkout(workoutId: string, data: any, userId: string) {
  // 3. Filter by userId in WHERE clause
  return await db
    .update(workouts)
    .set(data)
    .where(
      and(
        eq(workouts.id, workoutId),
        eq(workouts.userId, userId) // CRITICAL: Security check
      )
    )
    .returning();
}
```

#### ❌ SECURITY VULNERABILITIES
```typescript
// ❌ WRONG - Trusting userId from client
'use server';

export async function updateWorkoutAction(input: {
  workoutId: string;
  userId: string; // NEVER accept userId from client
  data: any;
}) {
  await updateWorkout(input.workoutId, input.data, input.userId);
}

// ❌ WRONG - No userId filter
export async function updateWorkout(workoutId: string, data: any) {
  // Any user can update any workout - SECURITY VULNERABILITY
  return await db.update(workouts).set(data).where(eq(workouts.id, workoutId));
}

// ❌ WRONG - No authentication check
'use server';

export async function deleteWorkoutAction(workoutId: string) {
  // No auth check - anyone can call this - SECURITY VULNERABILITY
  await deleteWorkout(workoutId);
}
```

## 6. Error Handling

### Required Pattern

**CRITICAL**: All Server Actions MUST handle errors gracefully.

```typescript
// ✅ CORRECT - Comprehensive error handling
'use server';

export async function createWorkoutAction(input: unknown) {
  try {
    // 1. Authentication error
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // 2. Validation error
    const validation = schema.safeParse(input);

    if (!validation.success) {
      return {
        success: false,
        error: 'Validation failed',
        details: validation.error.flatten(),
      };
    }

    // 3. Database error
    const workout = await createWorkout(validation.data, userId);

    if (!workout) {
      return { success: false, error: 'Failed to create workout' };
    }

    revalidatePath('/dashboard');

    return { success: true, workout };
  } catch (error) {
    // 4. Unexpected error
    console.error('Unexpected error in createWorkoutAction:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}
```

### Error Response Types

```typescript
// Define standard error response types
type ActionError = {
  success: false;
  error: string;
  details?: any;
};

type ActionSuccess<T> = {
  success: true;
  data: T;
};

type ActionResult<T> = ActionSuccess<T> | ActionError;

// Use in Server Actions
export async function myAction(input: any): Promise<ActionResult<Workout>> {
  // ...
}
```

## 7. Cache Revalidation

### Required Pattern

**CRITICAL**: All mutations MUST call `revalidatePath()` to update the UI.

```typescript
// ✅ CORRECT - Revalidate affected paths
'use server';

import { revalidatePath } from 'next/cache';

export async function updateWorkoutAction(input: any) {
  const workout = await updateWorkout(input.workoutId, input.data, userId);

  // Revalidate all affected paths
  revalidatePath('/dashboard'); // List page
  revalidatePath(`/workouts/${input.workoutId}`); // Detail page
  revalidatePath('/'); // Home page if it shows workouts

  return { success: true, workout };
}
```

#### ❌ WRONG - Missing revalidation
```typescript
// ❌ WRONG - UI won't update automatically
export async function updateWorkoutAction(input: any) {
  const workout = await updateWorkout(input.workoutId, input.data, userId);
  // Missing revalidatePath() - user won't see changes
  return { success: true, workout };
}
```

## Complete Example: Full Stack Mutation

### 1. Database Schema
```typescript
// src/db/schema.ts
export const workouts = pgTable('workouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull(),
  name: varchar('name'),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 2. Data Layer
```typescript
// src/data/workouts.ts
import { db } from '@/db';
import { workouts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function createWorkout(
  data: { name: string | null; startedAt: Date },
  userId: string
) {
  const [workout] = await db
    .insert(workouts)
    .values({
      ...data,
      userId,
      completedAt: null,
    })
    .returning();

  return workout;
}
```

### 3. Server Action
```typescript
// app/dashboard/actions.ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createWorkout } from '@/data/workouts';

const createWorkoutSchema = z.object({
  name: z.string().min(1).max(100).nullable(),
  startedAt: z.date(),
});

export async function createWorkoutAction(input: {
  name: string | null;
  startedAt: Date;
}) {
  const { userId } = await auth();

  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  const validation = createWorkoutSchema.safeParse(input);

  if (!validation.success) {
    return {
      success: false,
      error: 'Invalid input',
      details: validation.error.flatten(),
    };
  }

  try {
    const workout = await createWorkout(validation.data, userId);
    revalidatePath('/dashboard');
    return { success: true, workout };
  } catch (error) {
    console.error('Failed to create workout:', error);
    return { success: false, error: 'Failed to create workout' };
  }
}
```

### 4. Client Component
```typescript
// app/dashboard/create-workout-form.tsx
'use client';

import { useState } from 'react';
import { createWorkoutAction } from './actions';
import { Button } from '@/components/ui/button';

export function CreateWorkoutForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const result = await createWorkoutAction({
      name: formData.get('name') as string | null,
      startedAt: new Date(formData.get('date') as string),
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    // Success - form submitted
    e.currentTarget.reset();
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" type="text" placeholder="Workout name" />
      <input name="date" type="date" required />
      {error && <p className="text-red-500">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create'}
      </Button>
    </form>
  );
}
```

## Anti-Patterns to Avoid

### ❌ FormData Parameters
```typescript
// ❌ WRONG
export async function myAction(formData: FormData) {
  const name = formData.get('name');
}

// ✅ CORRECT
export async function myAction(input: { name: string }) {
  const validation = schema.safeParse(input);
}
```

### ❌ Direct Database Calls
```typescript
// ❌ WRONG
'use server';
import { db } from '@/db';

export async function myAction(input: any) {
  await db.insert(workouts).values(input);
}

// ✅ CORRECT
'use server';
import { createWorkout } from '@/data/workouts';

export async function myAction(input: any) {
  await createWorkout(input, userId);
}
```

### ❌ No Validation
```typescript
// ❌ WRONG
export async function myAction(input: any) {
  await createWorkout(input, userId);
}

// ✅ CORRECT
export async function myAction(input: any) {
  const validation = schema.safeParse(input);
  if (!validation.success) {
    return { success: false, error: 'Invalid input' };
  }
  await createWorkout(validation.data, userId);
}
```

### ❌ No Error Handling
```typescript
// ❌ WRONG
export async function myAction(input: any) {
  const result = await createWorkout(input, userId);
  return result;
}

// ✅ CORRECT
export async function myAction(input: any) {
  try {
    const result = await createWorkout(input, userId);
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Operation failed' };
  }
}
```

## Checklist for Data Mutations

Before implementing any data mutation, verify:

- [ ] Zod package is installed (`npm install zod`)
- [ ] Data layer helper function exists in `/src/data` directory
- [ ] Helper function uses Drizzle ORM (no raw SQL)
- [ ] Helper function accepts `userId` parameter
- [ ] Helper function filters by `userId` for updates/deletes
- [ ] Server Action is in colocated `actions.ts` file
- [ ] Server Action has `'use server'` directive
- [ ] Server Action parameters are typed (NOT `FormData`)
- [ ] Zod schema is defined for input validation
- [ ] Server Action uses `safeParse()` to validate input
- [ ] Server Action checks authentication via `auth()`
- [ ] Server Action calls data layer helper (not database directly)
- [ ] Server Action has try-catch error handling
- [ ] Server Action calls `revalidatePath()` after mutation
- [ ] Server Action returns typed result (`success`/`error`)
- [ ] Client Component handles loading and error states

## Summary

1. **Three-Layer Architecture** - Client → Server Action → Data Layer → Database
2. **Data Layer Required** - All mutations through `/src/data` helpers
3. **Drizzle ORM Only** - No raw SQL queries
4. **Server Actions Required** - Colocated `actions.ts` files
5. **Typed Parameters** - NO `FormData`, use typed objects
6. **Zod Validation** - ALL inputs validated with Zod schemas
7. **Authentication Required** - Check `userId` from `auth()`
8. **Security First** - Always filter by authenticated `userId`
9. **Error Handling** - Graceful error handling with typed responses
10. **Cache Revalidation** - Call `revalidatePath()` after mutations

These patterns are **mandatory** and **non-negotiable**. They ensure type safety, input validation, security, and maintainability across all data mutations.

## Resources

- [Zod Documentation](https://zod.dev/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Next.js Revalidation](https://nextjs.org/docs/app/building-your-application/data-fetching/revalidating)
