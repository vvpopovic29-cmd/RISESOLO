-- CreateEnum
CREATE TYPE "guild_role" AS ENUM ('LEADER', 'OFFICER', 'MEMBER');

-- CreateEnum
CREATE TYPE "guild_raid_status" AS ENUM ('AVAILABLE', 'COMPLETED', 'EXPIRED');

-- CreateTable
CREATE TABLE "guilds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "description" TEXT,
    "total_xp" INTEGER NOT NULL DEFAULT 0,
    "treasury_coins" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_memberships" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "guild_role" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guild_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_messages" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guild_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_raids" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "week_start" DATE NOT NULL,
    "target_contributions" INTEGER NOT NULL,
    "coin_reward" INTEGER NOT NULL,
    "status" "guild_raid_status" NOT NULL DEFAULT 'AVAILABLE',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guild_raids_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guilds_name_key" ON "guilds"("name");

-- CreateIndex
CREATE UNIQUE INDEX "guilds_tag_key" ON "guilds"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "guild_memberships_user_id_key" ON "guild_memberships"("user_id");

-- CreateIndex
CREATE INDEX "guild_memberships_guild_id_idx" ON "guild_memberships"("guild_id");

-- CreateIndex
CREATE INDEX "guild_messages_guild_id_created_at_idx" ON "guild_messages"("guild_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "guild_raids_guild_id_week_start_key" ON "guild_raids"("guild_id", "week_start");

-- AddForeignKey
ALTER TABLE "guild_memberships" ADD CONSTRAINT "guild_memberships_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_memberships" ADD CONSTRAINT "guild_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_messages" ADD CONSTRAINT "guild_messages_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_messages" ADD CONSTRAINT "guild_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_raids" ADD CONSTRAINT "guild_raids_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
