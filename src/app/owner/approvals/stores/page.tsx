import { prisma } from "@/lib/prisma";
import { OwnerStoreApprovalsClient } from "@/components/owner/OwnerStoreApprovalsClient";
import { findSimilarApprovedUsernames, type UsernameCandidate } from "@/lib/username-similarity";

type PendingRetailRow = {
  id: string;
  username: string | null;
  name: string;
  shopId: string;
  shopName: string;
  similarUsernames: UsernameCandidate[];
};

export default async function OwnerStoreApprovalsPage() {
  const pending = await prisma.$queryRaw<Omit<PendingRetailRow, "similarUsernames">[]>`
    SELECT
      u."id" AS "id",
      u."username" AS "username",
      u."name" AS "name",
      u."shopId" AS "shopId",
      s."name" AS "shopName"
    FROM "User" u
    INNER JOIN "Shop" s ON s."id" = u."shopId"
    WHERE u."role" = 'RETAIL'
      AND u."approvedAt" IS NULL
    ORDER BY s."name" ASC, u."name" ASC
  `;

  const approved = await prisma.$queryRaw<UsernameCandidate[]>`
    SELECT "id", "username", "name"
    FROM "User"
    WHERE "role" = 'RETAIL'
      AND "approvedAt" IS NOT NULL
    ORDER BY "name" ASC
  `;

  const rows: PendingRetailRow[] = pending.map((r) => ({
    ...r,
    similarUsernames: findSimilarApprovedUsernames(r.username, approved, { limit: 5 }),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Approve stores</h1>
      <OwnerStoreApprovalsClient rows={rows} />
    </div>
  );
}

