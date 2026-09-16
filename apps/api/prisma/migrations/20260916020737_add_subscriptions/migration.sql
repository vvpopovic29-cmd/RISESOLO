-- CreateEnum
CREATE TYPE "subscription_store" AS ENUM ('APP_STORE', 'PLAY_STORE', 'STRIPE', 'PROMOTIONAL', 'UNKNOWN');

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entitlement_id" TEXT NOT NULL,
    "product_id" TEXT,
    "store" "subscription_store" NOT NULL DEFAULT 'UNKNOWN',
    "expires_at" TIMESTAMP(3),
    "will_renew" BOOLEAN NOT NULL DEFAULT false,
    "original_transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
