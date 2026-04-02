import { prisma } from "@/lib/prisma";
import { OwnerAccountsApprovalsClient } from "@/components/owner/OwnerAccountsApprovalsClient";
import { findSimilarApprovedUsernames, type UsernameCandidate } from "@/lib/username-similarity";

type PendingSrRow = {
  id: string;
  username: string | null;
  name: string;
  phone: string | null;
  fieldRoleName: string | null;
  similarUsernames: UsernameCandidate[];
};

export default async function OwnerAccountsApprovalsPage() {
  const pending = await prisma.$queryRaw<Omit<PendingSrRow, "similarUsernames">[]>`
    SELECT
      u."id" AS "id",
      u."username" AS "username",
      u."name" AS "name",
      u."phone" AS "phone",
      fr."name" AS "fieldRoleName"
    FROM "User" u
    LEFT JOIN "FieldRole" fr ON fr."id" = u."fieldRoleId"
    WHERE u."role" = 'SR'
      AND u."approvedAt" IS NULL
    ORDER BY u."name" ASC
  `;

  const approved = await prisma.$queryRaw<UsernameCandidate[]>`
    SELECT "id", "username", "name"
    FROM "User"
    WHERE "role" = 'SR'
      AND "approvedAt" IS NOT NULL
    ORDER BY "name" ASC
  `;

  const rows: PendingSrRow[] = pending.map((r) => ({
    ...r,
    similarUsernames: findSimilarApprovedUsernames(r.username, approved, { limit: 5 }),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Approve accounts</h1>
      <OwnerAccountsApprovalsClient rows={rows} />
    </div>
  );
}

