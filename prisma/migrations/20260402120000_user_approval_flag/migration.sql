ALTER TABLE "User"
ADD COLUMN "approvedAt" TIMESTAMP(3);

-- Backfill existing accounts as approved (so current installs keep working).
UPDATE "User"
SET "approvedAt" = CURRENT_TIMESTAMP
WHERE "approvedAt" IS NULL
  AND "role" IN ('SR', 'RETAIL');

-- Helpful indexes for approval gating / listing.
CREATE INDEX "User_approvedAt_idx" ON "User"("approvedAt");
CREATE INDEX "User_role_idx" ON "User"("role");

