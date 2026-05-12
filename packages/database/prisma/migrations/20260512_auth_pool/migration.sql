-- CreateEnum: VirtualKeyStatus
CREATE TYPE "VirtualKeyStatus" AS ENUM ('active', 'revoked');

-- CreateTable: VirtualKey
CREATE TABLE "virtual_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rate_limits" JSONB,
    "budget" JSONB,
    "status" "VirtualKeyStatus" NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "virtual_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AuditLog
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "detail" JSONB,
    "operator" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "virtual_keys_key_prefix_key" ON "virtual_keys"("key_prefix");

-- CreateIndex
CREATE INDEX "virtual_keys_key_hash_idx" ON "virtual_keys"("key_hash");

-- CreateIndex
CREATE INDEX "virtual_keys_status_idx" ON "virtual_keys"("status");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "virtual_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
