import { pgTable, uuid, varchar, timestamp, integer, decimal, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Workouts table - stores individual workout sessions
export const workouts = pgTable('workouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull(), // Clerk user ID
  name: varchar('name'), // Optional workout name
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'), // Null if workout is in progress
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('workouts_user_id_idx').on(table.userId),
  startedAtIdx: index('workouts_started_at_idx').on(table.startedAt),
}));

// Exercises table - master list of exercise types
export const exercises = pgTable('exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').notNull(), // Clerk user ID who created this exercise
  name: varchar('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('exercises_user_id_idx').on(table.userId),
  nameIdx: index('exercises_name_idx').on(table.name),
}));

// Workout exercises table - exercises performed in a specific workout
export const workoutExercises = pgTable('workout_exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  workoutId: uuid('workout_id').notNull().references(() => workouts.id, { onDelete: 'cascade' }),
  exerciseId: uuid('exercise_id').notNull().references(() => exercises.id),
  order: integer('order').notNull(), // 0-indexed order of exercise in workout
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  workoutIdIdx: index('workout_exercises_workout_id_idx').on(table.workoutId),
  workoutIdOrderIdx: index('workout_exercises_workout_id_order_idx').on(table.workoutId, table.order),
}));

// Sets table - individual sets for each exercise in a workout
export const sets = pgTable('sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  workoutExerciseId: uuid('workout_exercise_id').notNull().references(() => workoutExercises.id, { onDelete: 'cascade' }),
  setNumber: integer('set_number').notNull(), // 1-indexed set number
  reps: integer('reps'), // Number of repetitions performed
  weight: decimal('weight', { precision: 10, scale: 2 }), // Weight used
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  workoutExerciseIdIdx: index('sets_workout_exercise_id_idx').on(table.workoutExerciseId),
  workoutExerciseIdSetNumberIdx: index('sets_workout_exercise_id_set_number_idx').on(table.workoutExerciseId, table.setNumber),
}));

// Relations
export const workoutsRelations = relations(workouts, ({ many }) => ({
  workoutExercises: many(workoutExercises),
}));

export const exercisesRelations = relations(exercises, ({ many }) => ({
  workoutExercises: many(workoutExercises),
}));

export const workoutExercisesRelations = relations(workoutExercises, ({ one, many }) => ({
  workout: one(workouts, {
    fields: [workoutExercises.workoutId],
    references: [workouts.id],
  }),
  exercise: one(exercises, {
    fields: [workoutExercises.exerciseId],
    references: [exercises.id],
  }),
  sets: many(sets),
}));

export const setsRelations = relations(sets, ({ one }) => ({
  workoutExercise: one(workoutExercises, {
    fields: [sets.workoutExerciseId],
    references: [workoutExercises.id],
  }),
}));
