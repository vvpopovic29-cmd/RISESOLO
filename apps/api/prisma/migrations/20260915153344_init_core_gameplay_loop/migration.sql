-- CreateEnum
CREATE TYPE "xp_source" AS ENUM ('WORKOUT_COMPLETE', 'DAILY_QUEST_COMPLETE');

-- CreateEnum
CREATE TYPE "exercise_type" AS ENUM ('CALISTHENICS', 'GYM', 'SKILL');

-- CreateEnum
CREATE TYPE "exercise_difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "quest_type" AS ENUM ('DAILY');

-- CreateEnum
CREATE TYPE "quest_status" AS ENUM ('AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "workout_session_status" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar_url" TEXT,
    "age" INTEGER,
    "height_cm" INTEGER,
    "weight_kg" DECIMAL(5,2),
    "training_type" TEXT,
    "experience_level" TEXT,
    "onboarded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "player_stats" (
    "user_id" TEXT NOT NULL,
    "strength" INTEGER NOT NULL DEFAULT 1,
    "agility" INTEGER NOT NULL DEFAULT 1,
    "endurance" INTEGER NOT NULL DEFAULT 1,
    "vitality" INTEGER NOT NULL DEFAULT 1,
    "intelligence" INTEGER NOT NULL DEFAULT 1,
    "stat_points" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_stats_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "progression" (
    "user_id" TEXT NOT NULL,
    "total_xp" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "last_activity_date" DATE,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progression_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "xp_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source" "xp_source" NOT NULL,
    "source_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "type" "exercise_type" NOT NULL,
    "difficulty" "exercise_difficulty" NOT NULL,
    "equipment" TEXT NOT NULL,
    "movement_pattern" TEXT NOT NULL,
    "primary_muscles" TEXT[],
    "secondary_muscles" TEXT[],
    "instructions" TEXT[],
    "form_cues" TEXT[],
    "safety_notes" TEXT[],
    "default_sets" INTEGER,
    "default_reps" TEXT,
    "hold_seconds" INTEGER,
    "rest_seconds" INTEGER,
    "progression_chain" TEXT,
    "progression_order" INTEGER,
    "video_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "quest_type" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target_reps" INTEGER,
    "target_sets" INTEGER,
    "xp_reward" INTEGER NOT NULL,
    "coin_reward" INTEGER NOT NULL,
    "status" "quest_status" NOT NULL DEFAULT 'AVAILABLE',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workouts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workout_id" TEXT,
    "status" "workout_session_status" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_sets" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "set_number" INTEGER NOT NULL,
    "reps" INTEGER,
    "weight_kg" DECIMAL(6,2),
    "duration_seconds" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_username_key" ON "profiles"("username");

-- CreateIndex
CREATE INDEX "xp_events_user_id_created_at_idx" ON "xp_events"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "xp_events_user_id_source_source_id_key" ON "xp_events"("user_id", "source", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_slug_key" ON "exercises"("slug");

-- CreateIndex
CREATE INDEX "exercises_category_difficulty_idx" ON "exercises"("category", "difficulty");

-- CreateIndex
CREATE INDEX "exercises_progression_chain_progression_order_idx" ON "exercises"("progression_chain", "progression_order");

-- CreateIndex
CREATE UNIQUE INDEX "quests_user_id_date_type_key" ON "quests"("user_id", "date", "type");

-- CreateIndex
CREATE INDEX "workout_sessions_user_id_status_idx" ON "workout_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "workout_sets_session_id_idx" ON "workout_sets"("session_id");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progression" ADD CONSTRAINT "progression_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
