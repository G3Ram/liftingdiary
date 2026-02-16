# Routing Standards

## Overview

This document outlines the routing architecture and standards for the liftingdiary application. All application routes follow a consistent structure with proper authentication and authorization.

## Route Structure

### Dashboard-Centric Architecture

**CRITICAL**: All application routes must be accessed via the `/dashboard` prefix.

```
/dashboard              # Main dashboard (protected)
/dashboard/workouts     # Workouts list (protected)
/dashboard/exercises    # Exercises list (protected)
/dashboard/profile      # User profile (protected)
```

### Public vs Protected Routes

**Public Routes** (accessible without authentication):
- `/` - Landing page
- `/sign-in` - Sign in page
- `/sign-up` - Sign up page
- `/api/webhooks/*` - Webhook endpoints

**Protected Routes** (require authentication):
- `/dashboard` - All routes under this prefix
- `/dashboard/*` - All sub-routes

## Route Protection

### Middleware-Based Protection

Route protection MUST be implemented using Next.js middleware, not component-level checks.

**Location**: `src/middleware.ts`

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  // Protect all routes except public ones
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
```

### Key Principles

1. **Middleware First**: Never rely on client-side or component-level auth checks for route protection
2. **Explicit Public Routes**: Define public routes explicitly using `createRouteMatcher`
3. **Default to Protected**: Any route not explicitly marked as public is protected
4. **Consistent Matcher**: Use the recommended matcher pattern to avoid protecting static assets

## Route Organization

### File-Based Routing (App Router)

```
src/app/
├── layout.tsx                 # Root layout
├── page.tsx                   # Landing page (public)
├── sign-in/
│   └── [[...sign-in]]/
│       └── page.tsx           # Clerk sign-in (public)
├── sign-up/
│   └── [[...sign-up]]/
│       └── page.tsx           # Clerk sign-up (public)
└── dashboard/
    ├── layout.tsx             # Dashboard layout (protected)
    ├── page.tsx               # Dashboard home (protected)
    ├── workouts/
    │   ├── page.tsx           # Workouts list
    │   ├── [id]/
    │   │   └── page.tsx       # Workout detail
    │   └── new/
    │       └── page.tsx       # Create workout
    └── exercises/
        ├── page.tsx           # Exercises list
        └── [id]/
            └── page.tsx       # Exercise detail
```

### Layout Hierarchy

1. **Root Layout** (`app/layout.tsx`):
   - Wraps entire application
   - Includes ClerkProvider
   - Defines global fonts and metadata

2. **Dashboard Layout** (`app/dashboard/layout.tsx`):
   - Shared layout for all dashboard routes
   - Navigation, sidebar, or header components
   - Already protected by middleware

## Navigation Patterns

### Link Components

Always use Next.js `<Link>` for internal navigation:

```typescript
import Link from 'next/link';

// ✅ Correct
<Link href="/dashboard/workouts">View Workouts</Link>

// ❌ Avoid
<a href="/dashboard/workouts">View Workouts</a>
```

### Programmatic Navigation

Use the `useRouter` hook from `next/navigation`:

```typescript
'use client';

import { useRouter } from 'next/navigation';

export function MyComponent() {
  const router = useRouter();

  const handleNavigate = () => {
    router.push('/dashboard/workouts');
  };

  return <button onClick={handleNavigate}>Go to Workouts</button>;
}
```

### Redirect Patterns

**Server Components** (preferred for auth redirects):

```typescript
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return <div>Dashboard</div>;
}
```

**Server Actions**:

```typescript
'use server';

import { redirect } from 'next/navigation';

export async function createWorkout(formData: FormData) {
  // ... create workout logic

  redirect('/dashboard/workouts');
}
```

## Route Parameters

### Dynamic Routes

Use square brackets for dynamic segments:

```typescript
// app/dashboard/workouts/[id]/page.tsx
type Params = Promise<{ id: string }>;

export default async function WorkoutPage({ params }: { params: Params }) {
  const { id } = await params;

  // Fetch workout data using id
  return <div>Workout {id}</div>;
}
```

### Catch-All Routes

Use `[...slug]` for catch-all segments:

```typescript
// app/dashboard/docs/[...slug]/page.tsx
type Params = Promise<{ slug: string[] }>;

export default async function DocsPage({ params }: { params: Params }) {
  const { slug } = await params;

  // slug is an array: ['getting-started', 'installation']
  return <div>Docs: {slug.join('/')}</div>;
}
```

### Optional Catch-All Routes

Use `[[...slug]]` for optional catch-all:

```typescript
// app/dashboard/settings/[[...setting]]/page.tsx
// Matches:
// - /dashboard/settings
// - /dashboard/settings/profile
// - /dashboard/settings/account/notifications
```

## Search Params

### Reading Search Params (Server Components)

```typescript
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function WorkoutsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filter = params.filter || 'all';

  return <div>Filter: {filter}</div>;
}
```

### Reading Search Params (Client Components)

```typescript
'use client';

import { useSearchParams } from 'next/navigation';

export function FilterComponent() {
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter') || 'all';

  return <div>Filter: {filter}</div>;
}
```

### Updating Search Params

```typescript
'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export function FilterComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (newFilter: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('filter', newFilter);

    router.push(`/dashboard/workouts?${params.toString()}`);
  };

  return (
    <button onClick={() => updateFilter('strength')}>
      Show Strength Workouts
    </button>
  );
}
```

## API Routes

### Route Handlers

API routes follow the same `/dashboard` prefix pattern when appropriate:

```typescript
// app/api/workouts/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch and return workouts
  return NextResponse.json({ workouts: [] });
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Create workout
  return NextResponse.json({ success: true });
}
```

### Dynamic API Routes

```typescript
// app/api/workouts/[id]/route.ts
type Params = Promise<{ id: string }>;

export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  const { id } = await params;
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch and return specific workout
  return NextResponse.json({ workout: { id } });
}
```

## Best Practices

### 1. Consistent Route Naming

- Use lowercase with hyphens: `/dashboard/workout-plans` (not `/dashboard/WorkoutPlans`)
- Use plural for list views: `/dashboard/workouts`
- Use singular for detail views: `/dashboard/workout/[id]`

### 2. Avoid Client-Side Auth Checks

```typescript
// ❌ Don't do this
'use client';

import { useUser } from '@clerk/nextjs';

export default function DashboardPage() {
  const { user } = useUser();

  if (!user) {
    return <div>Please sign in</div>;
  }

  return <div>Dashboard</div>;
}

// ✅ Do this - let middleware handle it
// Middleware already protects /dashboard routes
export default function DashboardPage() {
  return <div>Dashboard</div>;
}
```

### 3. Type-Safe Params

Always type route params and search params:

```typescript
type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ filter?: string }>;

export default async function Page({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { filter } = await searchParams;

  // Type-safe usage
}
```

### 4. Loading and Error States

Provide proper loading and error UI:

```
app/dashboard/workouts/
├── page.tsx
├── loading.tsx    # Shown during async operations
└── error.tsx      # Shown when errors occur
```

### 5. Metadata for SEO

Define metadata in page components:

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Workouts | LiftingDiary',
  description: 'View and manage your workout history',
};

export default function WorkoutsPage() {
  return <div>Workouts</div>;
}
```

## Integration with Other Standards

### Authentication

Routes under `/dashboard` are automatically protected by middleware. For granular permissions within protected routes, refer to `/docs/auth.md`.

### Data Fetching

All data fetching in route components must follow patterns defined in `/docs/data-fetching.md`:
- Use Server Components by default
- Implement proper error handling
- Add loading states

### Data Mutations

Route handlers and Server Actions must follow patterns in `/docs/data-mutations.md`:
- Validate all inputs with Zod
- Use proper error handling
- Implement optimistic updates where appropriate

## Testing Routes

### Testing Protected Routes

Ensure middleware protection is working:

```typescript
// middleware.test.ts (example pattern)
describe('Middleware', () => {
  it('should redirect to sign-in for unauthenticated /dashboard access', async () => {
    const response = await fetch('http://localhost:3000/dashboard');
    expect(response.status).toBe(307); // Redirect
  });

  it('should allow authenticated access to /dashboard', async () => {
    const response = await fetch('http://localhost:3000/dashboard', {
      headers: { Authorization: 'Bearer <token>' },
    });
    expect(response.status).toBe(200);
  });
});
```

## Summary Checklist

When creating new routes:

- [ ] Route is under `/dashboard` prefix if it requires authentication
- [ ] Middleware configuration includes the route in protection logic
- [ ] File-based routing structure follows App Router conventions
- [ ] Route params are properly typed with `Promise<>` wrapper
- [ ] Search params are properly typed with `Promise<>` wrapper
- [ ] Loading and error states are implemented
- [ ] Metadata is defined for SEO
- [ ] Navigation uses Next.js `<Link>` or `useRouter`
- [ ] API routes implement proper authentication checks
- [ ] Route follows naming conventions (lowercase, hyphens, plural/singular)
