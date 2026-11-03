# Lab_Link Test Infrastructure Specification

## 1. Overview
The Lab_Link test infrastructure is built on **Vitest 2.1.8** with **JSDOM**, integrated directly with the repository's Vite build configuration and TypeScript path mapping (`@/*` -> `./src/*`).

## 2. Test Configuration (`vitest.config.ts`)
- **Engine**: Vitest 2.1.8
- **Environment**: `jsdom` (provides browser DOM APIs for component and hook testing)
- **Path Aliases**: `@/` mapped to `./src/`
- **Global Setup**: `./tests/setup.ts` (polyfills `matchMedia`, `ResizeObserver`, `scrollTo`, and configures global Supabase mock client)
- **File Matching**: `tests/**/*.test.{ts,tsx}`

## 3. Stateful In-Memory Database & Supabase Mock (`tests/mocks/mockDb.ts`)
Rather than brittle, hollow mocks, the test suite is backed by a stateful in-memory PostgreSQL/Supabase engine:
- **Relational Tables**: `items`, `categories`, `departments`, `profiles`, `user_roles`, `user_departments`, `issued_items`, `borrow_requests`, `maintenance_records`, `notifications`, `audit_logs`, `otp_verifications`.
- **Query Operations**: `.select()`, `.insert()`, `.update()`, `.delete()`, `.eq()`, `.is()`, `.or()`, `.order()`, `.limit()`, `.single()`, `.maybeSingle()`.
- **RPC Contracts**:
  - `create_otp(p_email, p_otp)`
  - `verify_otp(p_email, p_otp)`
  - `kiosk_checkout(p_item_id, p_due_date)`
  - `kiosk_return(p_issued_item_id)`
  - `update_item_repair_status(p_item_id, p_status)`
- **Edge Functions**:
  - `send-email`: Dispatches template emails (verification, welcome)
  - `create-user`: Handles user creation, role assignment, and profile initialization
  - `delete-user`: Cascades related records, preserves audit trail, prevents deleting default admin
- **Auth Simulation**: `signInWithPassword`, `signUp`, `signOut`, `getSession`, `getUser`, `onAuthStateChange`.

## 4. Test Suite Hierarchy
The test suite is structured into four distinct verification tiers:

```
tests/
├── setup.ts
├── mocks/
│   ├── mockDb.ts
│   └── supabaseMock.ts
├── utils/
│   └── testWrapper.tsx
├── tier1-features/
│   ├── auth.test.ts             # Auth sign-in, sign-out, session, role validation
│   ├── items-stock.test.ts      # Item search, categorization, stock badges
│   ├── qr-parser.test.ts        # QR format parsing (UUID, LABLINK, URL, JSON)
│   ├── borrow-limits.test.ts    # Half-stock borrow limits, loan period defaults
│   ├── repair-status.test.ts    # Maintenance record status, turnaround metrics
│   └── notifications.test.ts    # Notification queries, read status, deep links
├── tier2-boundaries/
│   ├── zero-stock.test.ts       # Strict 0 limit when stock depleted, negative bounds
│   ├── qr-edge-cases.test.ts    # Malformed, injection, multi-slash, non-UUID checks
│   ├── unauthenticated-guards.test.ts # Unauthenticated RPCs & permission guards
│   └── edge-dates-numbers.test.ts     # Overdue dates, leap bounds, NaN progress safeguards
├── tier3-combinations/
│   ├── checkout-return-cycle.test.ts  # Checkout -> decrement -> Return -> restore
│   └── repair-lifecycle.test.ts       # Claim -> in_progress -> completed -> available
└── tier4-workflows/
    ├── user-onboarding-workflow.test.ts # Register -> OTP -> activate -> assign role -> login
    └── item-lifecycle-workflow.test.ts  # Create -> QR -> request -> approve -> checkout -> return -> audit
```

## 5. Execution Commands
```bash
# Run all tests once
npm test
# or
npx vitest run

# Run specific tier
npx vitest run tests/tier1-features/
npx vitest run tests/tier2-boundaries/
npx vitest run tests/tier3-combinations/
npx vitest run tests/tier4-workflows/

# Run in watch mode
npx vitest
```
