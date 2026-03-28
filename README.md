# Mobile Zone — distribution MVP

Next.js (App Router) app for tracking phones by IMEI, SR assignments, shop deliveries, and payment confirmations. Nothing hits a shop’s balance until the shop confirms.

## Stack

- Next.js 15, TypeScript, Tailwind CSS  
- Prisma ORM with **SQLite** (`DATABASE_URL=file:./dev.db` → database file next to `prisma/schema.prisma`)  
- NextAuth (credentials) — **mock sign-in with phone only** (no OTP)

## Quick start

```bash
cp .env.example .env   # or use the committed defaults in .env for local dev only
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with a seeded phone:

| Role  | Phone        |
|-------|--------------|
| Admin | `+10000000001` |
| SR 1  | `+10000000002` |
| SR 2  | `+10000000003` |
| Shops | `+10000000004` … `+10000000008` |

## Routes

- **Admin:** `/admin/dashboard`, `/admin/inventory`, `/admin/shops`, `/admin/payments`  
- **SR:** `/sr/dashboard`, `/sr/deliveries`, `/sr/payments`  
- **Shop:** `/shop/dashboard`, `/shop/deliveries`, `/shop/payments`

## REST API (same rules as the UI)

- `POST /api/admin/assign` — JSON `{ productId, srId }`  
- `POST /api/sr/deliveries` — `{ productId, shopId }`  
- `POST /api/shop/deliveries/[id]/confirm`  
- `POST /api/sr/payments` — `{ shopId, amount, note? }`  
- `PATCH /api/shop/payments/[id]` — `{ decision: "CONFIRMED" | "REJECTED" }`  

All require a session cookie from the same NextAuth login.

## PostgreSQL later

1. Set `DATABASE_URL` to a Postgres URL.  
2. In `prisma/schema.prisma`, change `provider` to `"postgresql"`.  
3. Optionally replace `String` role/status fields with native `enum`s (see `src/lib/constants.ts` for allowed values).  
4. Run `npx prisma migrate dev`.

## Domain rules (enforced in services)

- **Delivery:** SR creates a pending delivery; stock moves to the shop only after the shop confirms.  
- **Payment:** SR logs `PENDING`; only `CONFIRMED` reduces amount due. `REJECTED` is ignored for balances.
