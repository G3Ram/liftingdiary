# Authentication Standards

This document outlines the **mandatory** authentication patterns for the liftingdiary application. These rules are critical for security, user experience, and maintainability.

## Authentication Provider

### Clerk

**CRITICAL**: This application uses [Clerk](https://clerk.com/) for authentication. All authentication-related functionality MUST use Clerk.

#### ✅ REQUIRED
- Use `@clerk/nextjs` package for all authentication
- Use Clerk's provided components, hooks, and utilities
- Follow Clerk's best practices for Next.js App Router

#### ❌ FORBIDDEN
- Creating custom authentication logic
- Using other authentication libraries (NextAuth, Auth.js, Firebase Auth, etc.)
- Implementing custom JWT handling or session management
- Bypassing Clerk's authentication mechanisms

## Core Setup

### 1. Middleware Configuration

**CRITICAL**: Authentication middleware MUST be configured at the root level in `middleware.ts`.

```typescript
// ✅ CORRECT - middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
```

#### ❌ WRONG Patterns
```typescript
// ❌ WRONG - Don't use deprecated patterns
import { authMiddleware } from "@clerk/nextjs/server";
export default authMiddleware();

// ❌ WRONG - Don't manually check authentication in middleware
export function middleware(request: NextRequest) {
  // Manual auth checking
}
```

### 2. Provider Setup

**CRITICAL**: The entire application MUST be wrapped in `<ClerkProvider>` in the root layout.

```typescript
// ✅ CORRECT - app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

#### ❌ WRONG Patterns
```typescript
// ❌ WRONG - Missing ClerkProvider
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

// ❌ WRONG - ClerkProvider not at root level
export default function SomeComponent() {
  return (
    <ClerkProvider>
      <div>Only this component is protected</div>
    </ClerkProvider>
  );
}
```

## Authentication in Server Components

### Getting the User ID

**CRITICAL**: In Server Components, ALWAYS use `auth()` from `@clerk/nextjs/server` to get the authenticated user's ID.

```typescript
// ✅ CORRECT - Server Component
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserWorkouts } from '@/data/workouts';

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Now safe to use userId
  const workouts = await getUserWorkouts(userId);

  return <div>{/* ... */}</div>;
}
```

### Required Pattern

1. **Call `auth()`** to get authentication state
2. **Check `userId`** for null/undefined
3. **Redirect** if not authenticated
4. **Use `userId`** for data fetching

#### ❌ WRONG Patterns
```typescript
// ❌ WRONG - Using client-side hooks in Server Component
'use client'; // Don't do this just for auth
import { useUser } from '@clerk/nextjs';

export default function ServerComponent() {
  const { user } = useUser();
  // ...
}

// ❌ WRONG - Not checking for null
export default async function DashboardPage() {
  const { userId } = await auth();
  // Assuming userId exists without checking
  const workouts = await getUserWorkouts(userId); // Could crash!
}

// ❌ WRONG - Not redirecting unauthenticated users
export default async function DashboardPage() {
  const { userId } = await auth();
  // No redirect - page shows error state
}
```

## Authentication in Server Actions

### Pattern for Server Actions

**CRITICAL**: Server Actions MUST verify authentication on every call.

```typescript
// ✅ CORRECT - Server Action
'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { workouts } from '@/db/schema';

export async function createWorkoutAction(formData: FormData) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  const name = formData.get('name') as string;

  // Create workout for authenticated user
  const [workout] = await db
    .insert(workouts)
    .values({
      userId,  // CRITICAL: Always set userId
      name,
      startedAt: new Date(),
    })
    .returning();

  revalidatePath('/dashboard');

  return { success: true, workoutId: workout.id };
}
```

### Required Pattern

1. **Call `auth()`** at the start of every Server Action
2. **Check `userId`** and throw error if not authenticated
3. **Use `userId`** for all data operations
4. **Never trust client input** for user identification

#### ❌ WRONG Patterns
```typescript
// ❌ WRONG - Not checking authentication
'use server';

export async function createWorkoutAction(formData: FormData) {
  // No auth check - SECURITY VULNERABILITY
  const workout = await db.insert(workouts).values({...});
}

// ❌ WRONG - Trusting userId from client
'use server';

export async function deleteWorkoutAction(workoutId: string, userId: string) {
  // NEVER trust userId from client - SECURITY VULNERABILITY
  await db.delete(workouts).where(eq(workouts.id, workoutId));
}

// ✅ CORRECT - Get userId from auth
'use server';

export async function deleteWorkoutAction(workoutId: string) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Delete only if owned by user
  await db.delete(workouts).where(
    and(
      eq(workouts.id, workoutId),
      eq(workouts.userId, userId)
    )
  );
}
```

## Clerk UI Components

### Client Components for UI

**CRITICAL**: Use Clerk's pre-built UI components for authentication flows. Never create custom auth forms.

```typescript
// ✅ CORRECT - Using Clerk UI components
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

export function Header() {
  return (
    <header>
      <SignedOut>
        <SignInButton mode="modal" />
        <SignUpButton mode="modal" />
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </header>
  );
}
```

### Available Components

- **`<SignInButton />`** - Button that opens sign-in flow
- **`<SignUpButton />`** - Button that opens sign-up flow
- **`<UserButton />`** - User profile menu with sign-out
- **`<SignedIn>`** - Renders children only when signed in
- **`<SignedOut>`** - Renders children only when signed out
- **`<SignIn />`** - Full sign-in page component
- **`<SignUp />`** - Full sign-up page component

### Component Modes

```typescript
// ✅ Modal mode (recommended for buttons)
<SignInButton mode="modal" />

// ✅ Navigation mode (redirects to dedicated page)
<SignInButton mode="navigation" />

// ✅ Custom redirect after sign-in
<SignInButton afterSignInUrl="/dashboard" />
```

#### ❌ WRONG Patterns
```typescript
// ❌ WRONG - Creating custom sign-in form
export function CustomSignIn() {
  return (
    <form>
      <input type="email" name="email" />
      <input type="password" name="password" />
      <button type="submit">Sign In</button>
    </form>
  );
}

// ❌ WRONG - Using useUser in Server Component
// Server Components cannot use hooks
export default async function Page() {
  const { user } = useUser(); // ERROR: Hooks only work in Client Components
}
```

## Client Components with Authentication

### Using Hooks

When you need authentication state in Client Components, use Clerk's hooks:

```typescript
// ✅ CORRECT - Client Component with auth
'use client';

import { useUser, useAuth } from '@clerk/nextjs';

export function UserProfile() {
  const { user, isLoaded } = useUser();
  const { userId } = useAuth();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Not signed in</div>;
  }

  return (
    <div>
      <p>Hello, {user.firstName}</p>
      <p>User ID: {userId}</p>
    </div>
  );
}
```

### Available Hooks

- **`useUser()`** - Full user object with profile data
- **`useAuth()`** - Authentication state and utilities
- **`useSignIn()`** - Sign-in flow control
- **`useSignUp()`** - Sign-up flow control

#### Important Notes

- ✅ **Always check `isLoaded`** before using auth data
- ✅ **Handle loading states** appropriately
- ✅ **Check for null user** before accessing properties
- ❌ **Never use hooks in Server Components**

## Route Protection

### Public Routes

Routes that don't require authentication:

```typescript
// app/page.tsx - Landing page
export default function HomePage() {
  return <div>Welcome to Lifting Diary</div>;
}
```

### Protected Routes

Routes that require authentication MUST check for `userId` and redirect:

```typescript
// ✅ CORRECT - Protected route
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return <div>Protected content</div>;
}
```

### Sign-In/Sign-Up Pages

Create dedicated routes for authentication flows:

```typescript
// ✅ app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn />
    </div>
  );
}

// ✅ app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignUp />
    </div>
  );
}
```

**Note**: The `[[...sign-in]]` and `[[...sign-up]]` catch-all routes are required for Clerk's multi-step authentication flows.

## Database Schema

### User Identification

**CRITICAL**: Use Clerk's `userId` as a string type in your database schema.

```typescript
// ✅ CORRECT - Database schema
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const workouts = pgTable('workouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull(), // Clerk user ID
  name: varchar('name'),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('workouts_user_id_idx').on(table.userId),
}));
```

### Schema Requirements

- ✅ **Use `varchar` type** for `userId` fields
- ✅ **Add `notNull()` constraint** to `userId`
- ✅ **Create indexes** on `userId` columns for performance
- ✅ **Add comments** indicating these are Clerk user IDs
- ❌ **Never use integer or UUID** for user IDs (Clerk uses strings)

## Security Best Practices

### Critical Rules

1. **Never trust client input for user identification**
   - Always get `userId` from `auth()` on the server
   - Never accept `userId` as a parameter from the client

2. **Always verify authentication in Server Actions**
   - Check `userId` at the start of every Server Action
   - Throw errors for unauthenticated requests

3. **Filter all queries by authenticated userId**
   - See `/docs/data-fetching.md` for data layer patterns
   - Every data function must accept and use `userId`

4. **Use Clerk's components, don't build custom auth**
   - Leverage Clerk's security features and best practices
   - Don't reinvent authentication flows

5. **Protect sensitive routes**
   - Check authentication in Server Components
   - Redirect unauthenticated users

## Example Patterns

### Complete Server Component Example

```typescript
// app/workouts/page.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserWorkouts } from '@/data/workouts';
import { WorkoutsList } from './workouts-list';

export default async function WorkoutsPage() {
  // 1. Get authenticated user
  const { userId } = await auth();

  // 2. Protect the route
  if (!userId) {
    redirect('/sign-in');
  }

  // 3. Fetch user-specific data
  const workouts = await getUserWorkouts(userId);

  // 4. Pass data to Client Component
  return <WorkoutsList workouts={workouts} />;
}
```

### Complete Server Action Example

```typescript
// app/workouts/actions.ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { deleteWorkout } from '@/data/workouts';

export async function deleteWorkoutAction(workoutId: string) {
  // 1. Verify authentication
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  // 2. Perform action with userId
  // Data layer ensures user can only delete their own workouts
  await deleteWorkout(workoutId, userId);

  // 3. Revalidate affected paths
  revalidatePath('/workouts');

  return { success: true };
}
```

### Complete Client Component Example

```typescript
// components/user-profile.tsx
'use client';

import { useUser } from '@clerk/nextjs';

export function UserProfile() {
  const { user, isLoaded } = useUser();

  // 1. Handle loading state
  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  // 2. Handle unauthenticated state
  if (!user) {
    return null;
  }

  // 3. Safely access user data
  return (
    <div>
      <h2>{user.firstName} {user.lastName}</h2>
      <p>{user.primaryEmailAddress?.emailAddress}</p>
    </div>
  );
}
```

## Anti-Patterns to Avoid

### ❌ Custom Authentication
```typescript
// ❌ WRONG - Don't create custom auth
export async function customLogin(email: string, password: string) {
  // Custom authentication logic
}
```

### ❌ Storing Passwords
```typescript
// ❌ WRONG - Never store passwords
export const users = pgTable('users', {
  email: varchar('email'),
  password: varchar('password'), // NEVER DO THIS
});
```

### ❌ Client-Side User ID
```typescript
// ❌ WRONG - Don't trust userId from client
'use server';

export async function deleteWorkout(workoutId: string, userId: string) {
  // userId from client cannot be trusted
  await db.delete(workouts).where(eq(workouts.userId, userId));
}
```

### ❌ Missing Auth Checks
```typescript
// ❌ WRONG - No authentication check
'use server';

export async function updateWorkout(workoutId: string, data: any) {
  // Anyone can call this - SECURITY VULNERABILITY
  await db.update(workouts).set(data).where(eq(workouts.id, workoutId));
}
```

### ❌ Using Hooks in Server Components
```typescript
// ❌ WRONG - Hooks don't work in Server Components
export default async function Page() {
  const { user } = useUser(); // ERROR!
  return <div>{user.name}</div>;
}

// ✅ CORRECT - Use auth() instead
export default async function Page() {
  const { userId } = await auth();
  return <div>User ID: {userId}</div>;
}
```

## Environment Variables

### Required Configuration

Clerk requires environment variables to be configured:

```bash
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Optional - Custom sign-in/sign-up URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

**CRITICAL**: Never commit `.env.local` to version control. Add it to `.gitignore`.

## Checklist for Authentication

Before implementing any authentication-related feature, verify:

- [ ] Middleware is configured with `clerkMiddleware()`
- [ ] Root layout wraps app in `<ClerkProvider>`
- [ ] Server Components use `auth()` from `@clerk/nextjs/server`
- [ ] All protected routes check `userId` and redirect if null
- [ ] Server Actions verify authentication at the start
- [ ] `userId` is never accepted from client input
- [ ] Clerk UI components are used for sign-in/sign-up flows
- [ ] Database schema uses `varchar` type for `userId`
- [ ] Client Components use `useUser()` or `useAuth()` hooks
- [ ] Loading states are handled properly in Client Components
- [ ] Environment variables are configured correctly

## Summary

1. **Use Clerk Only** - All authentication must use `@clerk/nextjs`
2. **Middleware Required** - Configure `clerkMiddleware()` in `middleware.ts`
3. **Provider Required** - Wrap app in `<ClerkProvider>` in root layout
4. **Server Components** - Use `auth()` to get `userId`, check for null, redirect
5. **Server Actions** - Verify authentication on every call, throw on unauthorized
6. **Clerk UI Components** - Use pre-built components, never create custom auth
7. **Security First** - Never trust client input for user identification
8. **Database Schema** - Use `varchar` for Clerk user IDs

These patterns are **mandatory** and **non-negotiable**. They ensure security, maintainability, and a consistent user experience across the application.

## Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Next.js Quickstart](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Authentication](https://clerk.com/docs/authentication/overview)
- [Clerk Components](https://clerk.com/docs/components/overview)
