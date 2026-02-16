# Server Components Standards

This document outlines the **mandatory** patterns for Server Components in the liftingdiary application. These rules are critical for compatibility with Next.js 15+ and ensuring proper server-side rendering.

## Next.js 15+ Critical Requirements

### 1. Async Params and SearchParams

**CRITICAL**: In Next.js 15+, `params` and `searchParams` are **Promises** and MUST be awaited before use.

This is a breaking change from Next.js 14 and earlier versions. Failing to await these will cause runtime errors.

#### ✅ REQUIRED Pattern

```typescript
// ✅ CORRECT - Awaiting params
interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  // MUST await params before accessing properties
  const { id } = await params;

  // MUST await searchParams before accessing properties
  const { tab } = await searchParams;

  // Now safe to use id and tab
  const data = await fetchData(id);

  return <div>ID: {id}, Tab: {tab}</div>;
}
```

#### ❌ FORBIDDEN Patterns

```typescript
// ❌ WRONG - Not awaiting params
interface PageProps {
  params: {
    id: string;  // WRONG: Not a Promise
  };
}

export default async function Page({ params }: PageProps) {
  const { id } = params;  // ERROR: params is a Promise, not an object
  return <div>ID: {id}</div>;
}

// ❌ WRONG - Destructuring before await
interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = params;  // ERROR: Can't destructure a Promise
  return <div>ID: {id}</div>;
}

// ❌ WRONG - Accessing property before await
export default async function Page({ params }: PageProps) {
  const id = params.id;  // ERROR: params is a Promise, doesn't have .id
  return <div>ID: {id}</div>;
}
```

### 2. Type Definitions

**CRITICAL**: Always type `params` and `searchParams` as Promises in Next.js 15+.

```typescript
// ✅ CORRECT - Promise types
interface PageProps {
  params: Promise<{
    workoutId: string;
    exerciseId: string;
  }>;
  searchParams: Promise<{
    filter?: string;
    sort?: 'asc' | 'desc';
  }>;
}

// ❌ WRONG - Direct object types
interface PageProps {
  params: {
    workoutId: string;  // WRONG: Should be Promise<{...}>
  };
  searchParams: {
    filter?: string;  // WRONG: Should be Promise<{...}>
  };
}
```

### 3. Multiple Dynamic Segments

When using multiple dynamic route segments, await params once and destructure all segments:

```typescript
// ✅ CORRECT - Single await, multiple segments
// Route: /dashboard/workout/[workoutId]/exercise/[exerciseId]

interface PageProps {
  params: Promise<{
    workoutId: string;
    exerciseId: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { workoutId, exerciseId } = await params;

  const workout = await getWorkout(workoutId);
  const exercise = await getExercise(exerciseId);

  return (
    <div>
      <h1>{workout.name}</h1>
      <h2>{exercise.name}</h2>
    </div>
  );
}

// ❌ WRONG - Multiple awaits for same params
export default async function Page({ params }: PageProps) {
  const { workoutId } = await params;
  // ... some code ...
  const { exerciseId } = await params;  // Unnecessary second await
}
```

## Server Component Patterns

### 1. Data Fetching

Server Components are ideal for data fetching. Always fetch data at the component level:

```typescript
// ✅ CORRECT - Fetching data in Server Component
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserWorkouts } from '@/data/workouts';

export default async function WorkoutsPage() {
  // 1. Check authentication
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // 2. Fetch data
  const workouts = await getUserWorkouts(userId);

  // 3. Render with data
  return (
    <div>
      {workouts.map(workout => (
        <WorkoutCard key={workout.id} workout={workout} />
      ))}
    </div>
  );
}
```

### 2. Authentication Checks

Every protected Server Component MUST check authentication:

```typescript
// ✅ CORRECT - Authentication check pattern
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Safe to proceed with authenticated user
  return <div>Protected content</div>;
}

// ❌ WRONG - Missing authentication check
export default async function ProtectedPage() {
  // No auth check - anyone can access
  return <div>Protected content</div>;
}
```

### 3. Combining Params with Data Fetching

When using dynamic routes, await params first, then use for data fetching:

```typescript
// ✅ CORRECT - Full pattern with params, auth, and data fetching
import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { getUserWorkout } from '@/data/workouts';

interface WorkoutPageProps {
  params: Promise<{
    workoutId: string;
  }>;
}

export default async function WorkoutPage({ params }: WorkoutPageProps) {
  // 1. Check authentication
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // 2. Await and extract params
  const { workoutId } = await params;

  // 3. Fetch data with both userId and params
  const workout = await getUserWorkout(workoutId, userId);

  // 4. Handle not found
  if (!workout) {
    notFound();
  }

  // 5. Render
  return (
    <div>
      <h1>{workout.name}</h1>
      {/* ... */}
    </div>
  );
}
```

### 4. Passing Data to Client Components

Server Components should fetch data and pass it as props to Client Components:

```typescript
// ✅ CORRECT - Server Component fetches, Client Component receives
// app/workouts/page.tsx (Server Component)
import { auth } from '@clerk/nextjs/server';
import { getUserWorkouts } from '@/data/workouts';
import { WorkoutsList } from './workouts-list';

export default async function WorkoutsPage() {
  const { userId } = await auth();
  const workouts = await getUserWorkouts(userId!);

  // Pass data as props to Client Component
  return <WorkoutsList workouts={workouts} />;
}

// app/workouts/workouts-list.tsx (Client Component)
'use client';

interface WorkoutsListProps {
  workouts: Array<{
    id: string;
    name: string | null;
    startedAt: Date;
  }>;
}

export function WorkoutsList({ workouts }: WorkoutsListProps) {
  // Client-side interactivity
  return (
    <div>
      {workouts.map(workout => (
        <div key={workout.id} onClick={() => console.log(workout.id)}>
          {workout.name}
        </div>
      ))}
    </div>
  );
}
```

## Error Handling

### 1. Not Found Errors

Use `notFound()` from `next/navigation` for 404 errors:

```typescript
// ✅ CORRECT - Using notFound()
import { notFound } from 'next/navigation';

export default async function WorkoutPage({ params }: WorkoutPageProps) {
  const { userId } = await auth();
  const { workoutId } = await params;

  const workout = await getUserWorkout(workoutId, userId!);

  if (!workout) {
    notFound();  // Returns 404 page
  }

  return <div>{workout.name}</div>;
}
```

### 2. Redirects

Use `redirect()` for navigation (only in Server Components, not Server Actions):

```typescript
// ✅ CORRECT - Redirecting unauthenticated users
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return <div>Protected content</div>;
}
```

## SearchParams Patterns

### 1. Basic SearchParams Usage

```typescript
// ✅ CORRECT - Awaiting searchParams
// URL: /workouts?filter=completed&sort=desc

interface PageProps {
  searchParams: Promise<{
    filter?: string;
    sort?: string;
  }>;
}

export default async function WorkoutsPage({ searchParams }: PageProps) {
  const { filter, sort } = await searchParams;

  // Use searchParams for filtering/sorting
  const workouts = await getWorkouts({
    filter: filter || 'all',
    sort: sort || 'asc',
  });

  return <div>{/* ... */}</div>;
}
```

### 2. Optional SearchParams

SearchParams are always optional (URL might not have query string):

```typescript
// ✅ CORRECT - Handling optional searchParams
interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { page, limit } = await searchParams;

  // Provide defaults for optional params
  const pageNumber = page ? parseInt(page) : 1;
  const limitNumber = limit ? parseInt(limit) : 10;

  const data = await fetchPaginated(pageNumber, limitNumber);

  return <div>{/* ... */}</div>;
}
```

## Parallel Data Fetching

Server Components can fetch data in parallel using `Promise.all`:

```typescript
// ✅ CORRECT - Parallel data fetching
export default async function DashboardPage({ params }: PageProps) {
  const { userId } = await auth();
  const { workoutId } = await params;

  // Fetch multiple data sources in parallel
  const [workout, exercises, recentWorkouts] = await Promise.all([
    getUserWorkout(workoutId, userId!),
    getUserExercises(userId!),
    getRecentWorkouts(userId!, 5),
  ]);

  return (
    <div>
      <WorkoutDetails workout={workout} />
      <ExerciseList exercises={exercises} />
      <RecentWorkouts workouts={recentWorkouts} />
    </div>
  );
}
```

## Metadata Generation

### 1. Static Metadata

```typescript
// ✅ CORRECT - Static metadata
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Workouts | Lifting Diary',
  description: 'View and manage your workouts',
};

export default async function WorkoutsPage() {
  // ...
}
```

### 2. Dynamic Metadata

For dynamic routes, generate metadata must also await params:

```typescript
// ✅ CORRECT - Dynamic metadata with awaited params
import type { Metadata } from 'next';

interface Props {
  params: Promise<{
    workoutId: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // MUST await params in generateMetadata too
  const { workoutId } = await params;

  const workout = await getWorkout(workoutId);

  return {
    title: `${workout?.name || 'Workout'} | Lifting Diary`,
    description: `View workout details`,
  };
}

export default async function WorkoutPage({ params }: Props) {
  const { workoutId } = await params;
  // ...
}
```

## Complete Example

Here's a complete Server Component following all standards:

```typescript
// app/dashboard/workout/[workoutId]/page.tsx
import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { getUserWorkout } from '@/data/workouts';
import { WorkoutDetails } from './workout-details';

// Type definition with Promise params
interface WorkoutPageProps {
  params: Promise<{
    workoutId: string;
  }>;
  searchParams: Promise<{
    view?: 'detailed' | 'summary';
  }>;
}

// Dynamic metadata generation
export async function generateMetadata(
  { params }: WorkoutPageProps
): Promise<Metadata> {
  const { workoutId } = await params;
  const workout = await getUserWorkout(workoutId, 'temp-id');

  return {
    title: `${workout?.name || 'Workout'} | Lifting Diary`,
  };
}

// Server Component
export default async function WorkoutPage(
  { params, searchParams }: WorkoutPageProps
) {
  // 1. Authentication
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // 2. Await and extract params
  const { workoutId } = await params;
  const { view } = await searchParams;

  // 3. Fetch data
  const workout = await getUserWorkout(workoutId, userId);

  // 4. Handle not found
  if (!workout) {
    notFound();
  }

  // 5. Render - pass data to Client Component
  return (
    <div className="container mx-auto py-8">
      <WorkoutDetails
        workout={workout}
        view={view || 'detailed'}
      />
    </div>
  );
}
```

## Anti-Patterns to Avoid

### ❌ Not Awaiting Params

```typescript
// ❌ WRONG - This will fail at runtime
export default async function Page({ params }: PageProps) {
  const { id } = params;  // ERROR: Can't destructure Promise
  return <div>{id}</div>;
}
```

### ❌ Wrong Type Definitions

```typescript
// ❌ WRONG - params is not a direct object in Next.js 15+
interface PageProps {
  params: {
    id: string;  // Should be Promise<{ id: string }>
  };
}
```

### ❌ Client Component Data Fetching

```typescript
// ❌ WRONG - Don't fetch in Client Components
'use client';

export default function Page() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/data').then(setData);  // Use Server Components instead
  }, []);

  return <div>{data}</div>;
}
```

### ❌ Missing Authentication

```typescript
// ❌ WRONG - Protected route without auth check
export default async function ProtectedPage({ params }: PageProps) {
  const { id } = await params;
  const data = await fetchData(id);  // Anyone can access
  return <div>{data}</div>;
}
```

### ❌ Using Params in Client Components

```typescript
// ❌ WRONG - Client Components can't receive params directly
'use client';

export default function ClientPage({ params }: PageProps) {
  // Client Components don't receive params
  // Use Server Component to extract and pass as props
}

// ✅ CORRECT - Extract in Server Component
export default async function ServerPage({ params }: PageProps) {
  const { id } = await params;
  return <ClientComponent id={id} />;
}
```

## Checklist for Server Components

Before implementing any Server Component, verify:

- [ ] Component is async (not marked with 'use client')
- [ ] `params` typed as `Promise<{...}>` (Next.js 15+)
- [ ] `searchParams` typed as `Promise<{...}>` (Next.js 15+)
- [ ] `params` is awaited before accessing properties
- [ ] `searchParams` is awaited before accessing properties
- [ ] Authentication is checked for protected routes
- [ ] `userId` is obtained from `auth()`, not from params/searchParams
- [ ] Data is fetched using functions from `/src/data` directory
- [ ] Not found cases use `notFound()` from `next/navigation`
- [ ] Unauthenticated users redirected using `redirect()`
- [ ] Data is passed as props to Client Components (not fetched in them)
- [ ] `generateMetadata` also awaits params if used

## Summary

1. **Await Params** - CRITICAL: `params` and `searchParams` are Promises in Next.js 15+
2. **Proper Types** - Always type as `Promise<{...}>`
3. **Authentication First** - Check auth before accessing any data
4. **Data Fetching** - Fetch in Server Components, pass to Client Components
5. **Error Handling** - Use `notFound()` and `redirect()` appropriately
6. **Security** - Always filter data by authenticated `userId`
7. **Metadata** - Must also await params in `generateMetadata`

These patterns are **mandatory** and **non-negotiable** for Next.js 15+ compatibility and security.

## Resources

- [Next.js 15 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- [Server Components Documentation](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
- [Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
