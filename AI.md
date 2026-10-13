# AI.md — Team 9 shared context for humans and AI assistants

> **Read this whole file before touching the repo.** Each of us uses a different AI tool
> (Claude, ChatGPT, Copilot, Cursor, …). Point your assistant at this file first so we all work
> from the same rules, the same folder ownership, and the same DB ↔ API ↔ UI contract.

---

## 1. What this repo is

- **Course:** CS6.302 Software System Development, **Assignment 2 (a.k.a. 1B): Front End Design**.
- **Team:** Team 9 → repo/zip name **`9_a1b`**.
- **Project:** **P1 BiteStream** (food delivery + real-time driver logistics).
- **Deadline:** **Thu 15 Oct 2026, 11:59 PM**. Late = −10 %/day (max 3 days).
- **What we're doing:** we **inherited another team's Assignment 1 database** (PostgreSQL + MongoDB)
  and must (1) get it running and fix it, (2) build a small API layer, and (3) build a web UI that
  lets users run all four Assignment 1 workflows from a browser.
- **Guiding rule from the spec:** *"keep it simple and let the database (stored procedures, triggers,
  views, aggregation pipelines) do the real work."* The API should **call** the DB objects, not
  re-implement their logic in JS/Python.

Source documents (in repo root):

| File | What it is |
|---|---|
| `Assignment1b.pdf` | **The spec we're graded on** (screens, deliverables, rubric). |
| `assign1_ssd_v1.pdf` | Original Assignment 1 spec. The inherited DB must satisfy the **Project 1: BiteStream** section. |
| `Team Allocations.pdf` | Team 9 = Anuj Sharma, Vedant Bhatt, Sounak Banerjee, Aditya Chintala. **Sounak is not part of the working team.** We are 3 people (see §2). |
| `M26CS6.302_ Assignment 2 - FrontEnd _ Moodle.pdf` | Moodle page (deadline, submission notes). |

---

## 2. Who does what (folder ownership)

| Person | Role | Owns (writes to) | Hands off |
|---|---|---|---|
| **Aditya Chintala** | **Data verification**: check the inherited schema, procedures, pipelines and seed data against the A1 spec, fix them, and **make sure Vedant gets correct data when he generates it on his own machine** | `sql/`, `mongo/`, `data_generation/` (seeders + a verify script), `docs/handover_note.md`, `performance/` | **DB contract** (§5), **data-generation handoff** (§5.4), **DB bootstrap info for compose** (§5.5) |
| **Vedant Bhatt** | **Backend / API (middleware)**. Generates his own local data with Aditya's seeders. | `api/`, `docs/api_endpoints.md` | API endpoints (§6) that Anuj's frontend uses. API env vars and port for compose. |
| **Anuj Sharma** | **Frontend + `docker-compose.yaml`** | `web/`, `docs/design/` (users, wireframes, style guide), **`docker-compose.yaml`** (postgres, mongo, seeding, api, web) | Screens (§7). The one-command run used by graders and the demo. |
| **Everyone** | — | `README.md` (append your own section/rows), tests in your own folder | — |

> **Team size:** the allocation sheet lists 4 members, but **Sounak Banerjee is not participating**.
> Only the three people above are working on this. The README contribution table should reflect
> that honestly. Consider informing the TAs early, since marks are scaled by contribution.

**Rules for everyone (and their AI):**

1. **Stay in your folders.** If you need a change in someone else's area, ask them or open a PR and tell them about it. Don't silently edit it.
2. **Never change the DB contract (§5) on the API/UI side.** If the DB doesn't give you what you need, ask Aditya to add a view, function or field.
3. **Every change to inherited files (`sql/`, `mongo/`, `data_generation/`) must be logged** in §9 of this file *and* in the README. The rubric awards marks for documenting fixes.
4. The rubric expects **everyone to contribute to both design and code**, and the README needs a **contribution table**. Marks are scaled for unequal work.
5. At the **viva, anyone can be asked about any part, including the inherited DB code**. Everyone should read §5 and §8.
6. Never commit `node_modules/`, `venv/`, `__pycache__/`, build output, `.env` with real passwords, or DB dumps. The submission zip must stay **under 20 MB**.

---

## 3. Order of work (dependencies)

```
[Aditya] Get the inherited DB running → verify against the A1 spec → fix → freeze DB contract (§5)
        │      └─ ship: reset+seed commands, expected counts, verify script (§5.4)
        │      └─ ship: DB bootstrap order + env vars for compose (§5.5)
        │
        ├──► [Vedant] seeds his OWN local DB with Aditya's scripts → runs verify script → builds api/
        │           │
        │           └──► [Anuj] wires screens to the real API (may mock earlier using §6 draft)
        │
        └──► [Anuj] docker-compose.yaml: postgres + mongo + init/seed (from §5.5) + api + web
[Anuj]   users + wireframes + style guide in docs/design/ can start NOW (no DB needed)
[Vedant] docs/api_endpoints.md sketch can start NOW (spec requires it before the UI)
```

Given the deadline, **don't wait in series**. Vedant and Anuj should start against the draft
contract in §5 and §6, and Aditya should flag any contract change in the team chat right away.

---

## 4. Current repo state (as inherited, commit `bc3cbe5` + `2f68f56`)

```
9_a1b/
├── README.md                  # only contains the GitHub URL (needs a full rewrite)
├── docker-compose.yaml        # EMPTY (0 bytes). Anuj owns this; it becomes the single compose file
├── api/docker-compose.yaml    # EMPTY. Anuj to remove or merge into the root one
├── web/docker-compose.yaml    # EMPTY. Anuj to remove or merge into the root one
├── sql/01..06_*.sql           # inherited PostgreSQL scripts
├── mongo/01..03_*.js          # inherited MongoDB scripts (mongosh)
└── data_generation/           # postgres_seeder.py, mongo_seeder.py, requirements.txt
```

**Missing A1 deliverables in what we inherited:** `docs/relational_erd.png`,
`docs/mongo_schema_map.json`, `performance/` (EXPLAIN / executionStats output), and a README with
setup steps, assumptions and EXPLAIN plans.

**Target structure for submission** (from `Assignment1b.pdf`):

```
9_a1b/
├── README.md        # setup, assumptions, tech choices + justification, screenshots,
│                    # contribution table, repo URL + final commit hash, demo video link
├── docs/
│   ├── handover_note.md     # ~1 page: what worked / didn't / what we changed & why / advice
│   ├── api_endpoints.md     # endpoint list with inputs & outputs
│   └── design/              # user descriptions, wireframes, style guide
├── sql/  mongo/  data_generation/   # inherited + our fixes
├── api/             # server layer
└── web/             # front end
```

---

## 5. DB contract (what the API can rely on)

> **Status: DRAFT. This describes the inherited code as written. Aditya will mark it FROZEN after
> verification.** Names here are the source of truth for the API.

### 5.1 PostgreSQL (db name `bitestream`)

Run order: `01_schema_ddl` → `02_indexes` → `03_triggers_and_audit` → `04_stored_procedures` →
`05_materialized_views` → (seed) → `REFRESH MATERIALIZED VIEW mv_restaurant_daily_revenue;` once.
`06_window_analytics.sql` is a query, not DDL.

| Object | Shape / behaviour |
|---|---|
| `users` | `id UUID PK`, `name VARCHAR(120)`, `wallet_balance DECIMAL(10,2) CHECK >= 0` |
| `restaurants` | `id UUID PK`, `name VARCHAR(160)`, `latitude`, `longitude` (DOUBLE) |
| `orders` | `id UUID PK`, `user_id FK`, `restaurant_id FK`, `total_amount > 0`, `status ∈ {PREPARING, DELIVERING, DELIVERED}`, `created_at TIMESTAMPTZ DEFAULT NOW()` |
| `wallet_audit_logs` | `id UUID PK`, `user_id FK`, `amount_changed` (always positive), `action_type ∈ {DEBIT, CREDIT}`, `balance_after`, **`timestamp`** TIMESTAMPTZ. **Insert-only:** UPDATE/DELETE raise an error. |
| `idx_active_user_order` | Partial **unique** index: at most one order per user with status PREPARING/DELIVERING → violation SQLSTATE **`23505`**. |
| `trg_users_wallet_balance_audit` | AFTER UPDATE OF `wallet_balance` on `users` → inserts one `wallet_audit_logs` row. |
| `CALL sp_execute_checkout(user_id UUID, restaurant_id UUID, amount DECIMAL)` | Locks the user, checks balance, debits the wallet (fires the trigger), inserts a PREPARING order. **Returns nothing** (the API must look up the new order and audit row itself). **Does not COMMIT/ROLLBACK itself**: the caller must `BEGIN; SET TRANSACTION ISOLATION LEVEL REPEATABLE READ; CALL …; COMMIT/ROLLBACK`. |
| Errors raised by checkout | `22023` amount ≤ 0 · `23503` restaurant/user doesn't exist · `P0001` "Insufficient wallet balance" · `23505` already has an active order (partial unique index) · `23514` CHECK violation (fallback). **The API should map these to friendly UI messages.** |
| `mv_restaurant_daily_revenue` | `(restaurant_id, revenue_date, order_count, daily_revenue)` for DELIVERED orders, one row per restaurant per day. Unique index exists, so CONCURRENTLY works. |
| `SELECT fn_refresh_restaurant_daily_revenue()` | `REFRESH MATERIALIZED VIEW CONCURRENTLY`. Fails if the MV was never populated (it's created `WITH NO DATA`). |
| `sql/06_window_analytics.sql` | Last 90 days. Returns `(restaurant_id, revenue_date, daily_revenue, moving_avg_7_day, period_revenue, revenue_rank)`; `revenue_rank` is `DENSE_RANK()` by period revenue. |

### 5.2 MongoDB (db name `bitestream`)

| Collection | Shape |
|---|---|
| `menus` | `{_id: ObjectId, restaurant_id: PG-UUID-string, restaurant_name (= PG name), location: GeoJSON Point of the restaurant, categories:[{name, items:[{item_id, name, description, price, available, customization_addons?:[{name, price}], dietary_tags?:[…]}]}], updated_at}`. One per PG restaurant (200). |
| `reviews` | `{_id: ObjectId, restaurant_id: PG-UUID-string, user_id: PG-UUID-string, rating: 1..5, comment, sentiment_tags:[string], created_at}`. 110,000 docs over the past 365 days. |
| `driverPings` | `{_id: ObjectId, driver_id: INT 1..2000, active: bool, location: GeoJSON Point [lng, lat], created_at}`. 510,000 docs in Hyderabad, created within 10 min of seeding, so **they all expire ~2 h after seeding**. Indexes: 2dsphere on `location`, **TTL 7200 s** on `created_at`, and `active`. |
| `mongo/02_workflow3_geonear.js` | `$geoNear` around a fixed point (Hyderabad 17.3850, 78.4867), `maxDistance 5000`, `active: true`, top 10. |
| `mongo/03_workflow4_facet.js` | `$match restaurant_id` → `$facet {rating_distribution, most_frequent_tags, overall_average_rating}`. |

✅ **Cross-DB key fixed (2026-10-14):** Mongo `restaurant_id` / `user_id` are now the Postgres UUIDs as strings.
So `db.menus.findOne({restaurant_id: pgId})` and `db.reviews.find({restaurant_id: pgId})` just work.

### 5.3 Planned DB additions for the UI (Aditya will confirm in §9)

These are things the UI spec needs that the inherited DB does not provide yet:

- **MV "last refreshed" time.** Postgres doesn't store this. Plan: add an `mv_refresh_log` table that the refresh function writes to.
- **Order status transitions** (PREPARING → DELIVERING → DELIVERED). The spec requires a UI for this so the partial index can be demonstrated. Plan: a small `sp_advance_order_status(order_id)` or a plain guarded UPDATE.
- **Wallet top-up (CREDIT)** so demo users can recover from "insufficient balance". Optional.
- **Shared restaurant key** between Postgres and Mongo, and restaurants/pings in the **same city**.
- **Live ping generator** so the map shows new pings while we poll (TTL deletes seeded pings after 2 h).
- **Seed data with spread-out dates and some active orders** (see §8).

### 5.4 Data-generation handoff (Aditya → Vedant)

**Current way to seed (works now; tested 2026-10-14, about 15 s total):**

```bash
cp .env.example .env            # then edit PGUSER/PGPASSWORD for your machine
python3 -m venv data_generation/.venv && data_generation/.venv/bin/pip install -r data_generation/requirements.txt
createdb bitestream
for f in sql/0[1-5]*.sql; do psql -v ON_ERROR_STOP=1 -d bitestream -f "$f"; done
mongosh mongo/01_collections_and_indexes.js          # drops + recreates Mongo collections and indexes
cd data_generation
.venv/bin/python postgres_seeder.py --clear          # MUST run first (Mongo seeders read PG ids)
.venv/bin/python mongo_seeder.py                     # driverPings; re-run if pings expired (2 h TTL)
.venv/bin/python reviews_seeder.py
.venv/bin/python menus_seeder.py
```

**Demo fixtures (fixed IDs, same on every machine):**

| Fixture | ID | State after seeding |
|---|---|---|
| Demo Restaurant (Charminar) | `00000000-0000-4000-8000-0000000000a1` | 17.3616, 78.4747; has a menu, ~550 reviews, drivers within 5 km |
| Demo User (Rich Wallet) | `00000000-0000-4000-8000-000000000001` | about ₹44.6k, no active order, so checkout succeeds |
| Demo User (Low Balance) | `00000000-0000-4000-8000-000000000002` | **₹45.00**, so checkout fails with *insufficient balance* (`P0001`) |
| Demo User (Active Order) | `00000000-0000-4000-8000-000000000003` | has a **PREPARING** order, so checkout fails with *active order* (`23505`) |

**Expected counts (default flags):** users 5,000 · restaurants 200 · orders 100,300 (100,000 DELIVERED + 300 live, about 188 PREPARING / 112 DELIVERING) · wallet_audit_logs 129,966 (29,666 CREDIT / 100,300 DEBIT) · orders span ~121 days · menus 200 · reviews 110,000 · driverPings 510,000 (until they expire).


Vedant generates data **on his own machine** with our scripts. Aditya's job is to make sure that
produces a **correct, complete and reproducible** dataset. Aditya delivers:

1. **One documented sequence** (README section, later also run by compose) that goes:
   reset (drop/recreate both DBs) → `sql/01..05` → `mongo/01` → `postgres_seeder.py` →
   `mongo_seeder.py` → first MV refresh. Nothing manual beyond it.
2. **Config only via env vars:** `PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD MONGO_URI`. No hardcoded passwords.
3. **Deterministic data:** a fixed random seed, so Vedant, Anuj and the graders get the same IDs and counts. Optionally provide a `--small` mode for fast local runs.
4. **Known demo fixtures** with stable, documented IDs: at least one rich user, one low-balance user (to trigger *insufficient balance*), one user with an active order (to trigger the *active-order conflict*), and one restaurant with nearby drivers, reviews and a menu.
5. **Expected counts table** (users, restaurants, orders by status, audit rows by type, menus, reviews, live pings).
6. **A verify script** (planned: `data_generation/verify_data.py`). Vedant runs it after seeding. It prints PASS/FAIL for:
   - row counts within the expected ranges
   - dates spread over ≥ 90 days
   - presence of active orders
   - every order debit has a matching audit row
   - restaurant IDs resolve in Postgres **and** Mongo
   - pings exist near the fixture restaurant
   - the MV is populated
   - WF1–WF4 each run and return non-empty results

   **If it fails on Vedant's side, that's Aditya's bug to fix, not Vedant's.**

### 5.5 DB bootstrap info for `docker-compose.yaml` (Aditya → Anuj)

> **Status: TO BE FILLED by Aditya after verification.** Anuj, build the compose file from this.

| Item | Value (draft) |
|---|---|
| Postgres image / port | `postgres:16` · `5432` |
| Mongo image / port | `mongo:7` · `27017` |
| DB names | Postgres `bitestream`, Mongo `bitestream` |
| Env vars | `PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD MONGO_URI` (values in `.env.example`, not committed with real secrets) |
| Schema init | `sql/01..05` in order, then `mongo/01_collections_and_indexes.js` (**drops collections**, so run it once, before seeding) |
| Seeding | A one-shot `seeder` service (Python + `data_generation/requirements.txt`) that runs both seeders and the first MV refresh, then exits. It must **not re-seed on every `up`**. |
| Health | API should start only after the seeder succeeds (`depends_on: condition: service_completed_successfully`) |
| Live pings | A small long-running ping generator (planned) so the map has fresh data despite the 2 h TTL |

---

## 6. API sketch (Backend owns; draft for frontend to mock against)

Tech is our choice (justify in README). Keep handlers thin: call the procedure, query, MV or pipeline.
**Paginate every list** (the spec says never load 50k+ rows into the browser).

| Method & path | Input | Output | Backed by |
|---|---|---|---|
| `GET /api/users?page&limit&q` | paging, name search | `{items:[{id,name,wallet_balance}], total}` | `users` |
| `GET /api/users/:id` | — | user + recent orders | `users`, `orders` |
| `GET /api/restaurants?page&limit&q` | paging, search | list | `restaurants` |
| `GET /api/restaurants/:id` | — | restaurant + menu (Mongo) | `restaurants` + `menus` |
| `GET /api/orders?page&limit&status&user_id&restaurant_id` | filters | list | `orders` |
| `GET /api/orders/:id` | — | detail | `orders` |
| `POST /api/checkout` | `{user_id, restaurant_id, amount}` | `{order, balance_before, balance_after, audit_entry}` or `{error_code, message}` | `sp_execute_checkout` |
| `POST /api/orders/:id/advance` | — | updated order | status transition (§5.3) |
| `GET /api/users/:id/audit?from&to&page` | date range | rows with **running balance** | `wallet_audit_logs` |
| `GET /api/analytics/moving-average?restaurant_id` | restaurant | daily series | `06_window_analytics.sql` |
| `GET /api/analytics/ranking` | — | DENSE_RANK table | `06_window_analytics.sql` |
| `GET /api/analytics/summary` | — | MV totals + `last_refreshed` | `mv_restaurant_daily_revenue` |
| `POST /api/analytics/refresh` | — | `{last_refreshed}` | `fn_refresh_restaurant_daily_revenue()` |
| `GET /api/drivers/nearby?lng&lat&radius=5000` | origin | drivers sorted by distance | `$geoNear` pipeline |
| `GET /api/restaurants/:id/reviews/analytics` | — | facet result | `$facet` pipeline |
| `GET /api/restaurants/:id/menu` | — | menu document | `menus` |

**Checkout must run in one transaction** on one connection:
`BEGIN; SET TRANSACTION ISOLATION LEVEL REPEATABLE READ; read balance_before; CALL sp_execute_checkout(...); read new order + newest audit row + balance_after; COMMIT;`
On any error: `ROLLBACK` and map the SQLSTATE (§5.1) to a friendly message.

---

## 7. Screens (Frontend owns) — required by `Assignment1b.pdf`

| Screen | Must show |
|---|---|
| **Browse** | users, restaurants, orders: pagination, search/filter, detail view |
| **Transaction (WF1)** | place-order form → balance **before/after**, friendly errors for *insufficient balance* and *already has an active order*, and the **new `wallet_audit_logs` row** after success |
| **Audit trail** | read-only audit log for a chosen user, **date filter**, **running balance** |
| **Analytics (WF2 + MV)** | **7-day moving average chart** per restaurant, **DENSE_RANK table**, MV summary numbers with a **"last refreshed" time + Refresh button** |
| **Map (WF3)** | `$geoNear` results around a **selectable origin**, **5 km radius**, list sorted by distance, **new pings appear by polling** (no full page reload) |
| **Reviews (WF4)** | `$facet` charts: rating distribution, top tags, average rating, plus a **readable Menu document** |

General: loading / empty / error state on every screen. Works on a laptop and reasonably on a phone.
An **actor switcher** (pick the demo user; no real login). A way to **advance order status**.
Design deliverables: users + goals, wireframes, consistent colours/fonts/components, in `docs/design/`.

---

## 8. DB verification checklist (Aditya): baseline results

Status legend: ✅ verified OK · ⚠️ works but deviates / caveat · ❌ confirmed broken · 🔧 fixed (updated as fixes land)

### 8.0 Baseline run of the inherited code, unmodified (2026-10-14)

**Environment:** PostgreSQL **18.6** (Homebrew, local), MongoDB **8.0.34** (official tarball in `~/mongodb-8.0`), Python 3.14 venv, psycopg2 2.9.13, pymongo 4.18.3. No Docker.
**Throwaway DBs:** Postgres `bitestream_inherited`, Mongo `bitestream`.

| Step | Result |
|---|---|
| `sql/01..05` on an empty DB | ✅ All apply cleanly. ✅ All five are **re-runnable** (applied twice, no errors). |
| `postgres_seeder.py` (env `PGUSER/PGDATABASE`) | ✅ Exit 0 in **86 s**: 1,000 users, 100 restaurants, **200,000 orders**, **200,000 audit rows**. |
| `mongo/01_collections_and_indexes.js` | ✅ Creates 3 collections + all indexes (2dsphere, TTL 7200 s, etc.). |
| `mongo_seeder.py` | ✅ Exit 0 in **7 s**: 100 menus, 50,000 reviews, 500,000 pings, **then the TTL deleted 251,609 pings within ~1 min → 248,391 left**. |
| `mongo/02_workflow3_geonear.js` | ✅ Runs, uses the 2dsphere index (no COLLSCAN). 23,691 pings within 5 km, from 2,000 drivers, up to 27 pings per driver. |
| `mongo/03_workflow4_facet.js` | ✅ Runs, uses `idx_reviews_restaurant` (no COLLSCAN). 480 reviews for restaurant 1, avg 3.06. |
| `sql/06_window_analytics.sql` | ✅ Runs in **113 ms** (Bitmap Index Scan on `idx_orders_status_created_at`). ❌ Only **100 of 9,000** day-rows are non-zero (see 8.2 #1). |
| Audit-trail query (`WHERE user_id=… ORDER BY timestamp DESC LIMIT 50`) | ✅ 0.1 ms, Index Scan on `idx_wallet_audit_user_timestamp`. |

### 8.1 Against the A1 BiteStream spec

| # | Requirement (A1 spec) | Where | Status / evidence |
|---|---|---|---|
| 1 | `users.wallet_balance DECIMAL(10,2) CHECK >= 0` | `sql/01_schema_ddl.sql:7-13` | ✅ |
| 2 | `wallet_audit_logs` fields + `timestamp DEFAULT NOW()` | `sql/01_schema_ddl.sql:44-60` | ✅ |
| 3 | `restaurants`, `orders` (status enum, FKs) | `sql/01_schema_ddl.sql:15-42` | ✅ The status CHECK rejects `'CANCELLED'`. |
| 4 | Trigger AFTER UPDATE OF wallet_balance → immutable audit | `sql/03_triggers_and_audit.sql` | ✅ The DEBIT row is written on checkout, and the CREDIT row on a manual top-up. ✅ UPDATE/DELETE on the audit log are rejected. ⚠️ `TRUNCATE` bypasses immutability (row triggers don't fire). ⚠️ INSERTs into `users` don't log the opening balance. |
| 5 | Partial unique index `idx_active_user_order` | `sql/02_indexes.sql:6-8` | ✅ A second active order fails with `23505`, and the debit is rolled back with the statement. |
| 6 | MV **joining restaurants** with **total completed order count and revenue** + REFRESH CONCURRENTLY fn | `sql/05_materialized_views.sql` | ❌ The MV is **per-day** and **doesn't JOIN restaurants**. 🔧 The seeder now does the first plain refresh, so `fn_refresh_restaurant_daily_revenue()` works after seeding. *(Was: it* **fails on a fresh install** ("CONCURRENTLY cannot be used when the materialized view is not populated"), and the seeder never does the first plain refresh. ✅ After one manual refresh, CONCURRENTLY works. No last-refreshed tracking. |
| 7 | 2dsphere on `DriverPings.location`, TTL 7200 on `created_at` | `mongo/01_collections_and_indexes.js` | ✅ Both present. Note: the collection is named `driverPings` (camelCase), and the script **drops** collections, so run it *before* seeding. |
| 8 | WF1 `sp_execute_checkout`: **starts a REPEATABLE READ txn**, debits, inserts order, **COMMIT**; **catch** insufficient-balance and **ROLLBACK** | `sql/04_stored_procedures.sql` | ⚠️ Partly. ✅ Success, plus clear errors: `P0001` insufficient balance, `23505` active order, `22023` amount ≤ 0, `23503` unknown user or restaurant. Balance is unchanged after every failure. ✅ Concurrency is safe: two simultaneous checkouts by one user → one succeeds, the other gets **`40001` serialization failure**. ❌ The procedure **does not start a REPEATABLE READ txn or COMMIT itself** (confirmed: CALL inside an outer txn is undone by the outer ROLLBACK). ❌ It doesn't **catch** anything (errors propagate). It never relies on the CHECK constraint. ❌ It **returns nothing** (no order id). |
| 9 | WF2 CTE + window: 7-day moving avg per restaurant + DENSE_RANK | `sql/06_window_analytics.sql` | ✅ Query logic is correct (calendarized, `ROWS 6 PRECEDING`, DENSE_RANK). ❌ **Output is meaningless with the seeded data** (8.2 #1). The window is relative to `CURRENT_DATE`, last 90 days. |
| 10 | WF3 `$geoNear` closest **active driver** within 5 km **of a restaurant** | `mongo/02_workflow3_geonear.js` | ⚠️ Runs and uses the index, but: the point is hardcoded (not a restaurant), it returns **pings, not distinct drivers** (up to 27 pings per driver in range), and it includes stale pings (the top 10 contained pings >2 h old that were about to be purged). |
| 11 | WF4 `$facet`: rating dist, top tags via `$unwind`, avg | `mongo/03_workflow4_facet.js` | ✅ Correct output and index use. ⚠️ Keyed by int `restaurant_id = 1` (see 8.2 #4). |
| 12 | ≥100k audit rows, ≥50k orders | `data_generation/postgres_seeder.py` | ✅ 200,000 / 200,000 in 86 s. (My earlier "very slow" guess was wrong.) |
| 13 | ≥500k geo pings | `data_generation/mongo_seeder.py` | 🔧 **Fixed:** 510,000 inserted, 0 older than 2 h (all expire together ~2 h after seeding; re-run `mongo_seeder.py`). *(Was:* 500,000 inserted, but **50.3% were already older than the 2 h TTL → 248,391 remained after ~1 min**, and all are gone after 2 h. |
| 14 | ERD, mongo schema map, EXPLAIN / executionStats in README / `performance/` | — | ❌ **Missing** from the inherited repo. (The indexes *are* used, see 8.0.) |

### 8.2 Data-quality issues that will break the UI

| # | Issue | Where | Status / evidence |
|---|---|---|---|
| 1 | **All orders and audit rows get `NOW()` at seed time.** | `postgres_seeder.py`, `04_stored_procedures.sql:68-79` | 🔧 **Fixed:** orders span 121 days, and WF2 has 16,321 of 18,000 non-zero day-rows. *(Was:* all 200,000 orders within **85 seconds on one day**.) Audit rows also span 1 day. The WF2 chart is a single spike. The audit date filter is useless. |
| 2 | **Every seeded order is immediately set to DELIVERED** | `postgres_seeder.py:136-143` | 🔧 **Fixed:** 300 live orders via `sp_execute_checkout` (about 188 PREPARING / 112 DELIVERING). *(Was: 0 active.)* |
| 3 | **Restaurants are spread over the whole globe; pings are in Hyderabad** | `postgres_seeder.py:53-54` vs `mongo_seeder.py:221-229` | 🔧 **Fixed:** 200/200 restaurants are in the Hyderabad ping area. *(Was:* **0 of 100** (lat −90..87, lng −177..178). |
| 4 | **No shared key between Postgres and Mongo** | both seeders | 🔧 **Fixed:** Mongo uses PG UUID strings; 200/200 menu and review restaurant_ids resolve in PG. *(Was:* PG restaurant ids are UUIDs, Mongo `restaurant_id` is a number 1..100. Names differ ("Test Restaurant N" vs "Restaurant N"). Review `user_id`s don't exist in PG. |
| 5 | ₹1,000,000 starting balance, no CREDIT events | `postgres_seeder.py:20` | 🔧 **Fixed:** realistic balances (median ≈ ₹2.9k), 29,666 CREDIT rows, 179 users under ₹200, plus the ₹45 demo user. *(Was:* final balances ₹996,235–997,677. 0 users can hit "insufficient balance". 100% of audit rows are DEBIT. |
| 6 | Hardcoded password, not idempotent, no fixed random seed | `postgres_seeder.py:12` | 🔧 **Fixed:** `.env` / CLI args, `--clear`, `--seed 42` (reruns give identical IDs and amounts). *(Was:* confirmed by reading. Works with `PGUSER/PGPASSWORD` env overrides. A rerun would add another 1,000 users and 100 restaurants. |
| 7 | All menu items share the same two add-ons and description; items are random per category (e.g. "Paneer Tikka" under "Desserts") | `mongo_seeder.py:110-124` | 🔧 **Fixed:** category-specific items and add-ons, optional `dietary_tags`. |
| 8 | Inherited git history squashed into one commit (`bc3cbe5`) | git | ⚠️ Mention in the handover note. |
| — | *Good news:* the data is internally consistent | — | ✅ Every DEBIT matches an order. Every user's balance equals their latest `balance_after`. |

### 8.3 Verification procedure (to run next)

1. Spin up Postgres 16 + Mongo 7 locally (temporary containers, until Anuj's compose is ready), run the scripts in order, run both seeders, and record the timings and row counts.
2. For each row in 8.1 and 8.2: test it, mark ✅/❌, and write the evidence (query + output) in `docs/handover_note.md` or `performance/`.
3. Test WF1 edge cases: success, insufficient balance, second active order (`23505`), unknown user/restaurant, amount ≤ 0, two concurrent checkouts for the same user.
4. Run `EXPLAIN (ANALYZE, BUFFERS)` for WF2 and the audit/browse queries, and `explain("executionStats")` for WF3/WF4. Save the output to `performance/`.
5. Fix, log each fix in §9, then mark §5 **FROZEN** and tell the team.
6. Write the **verify script** (§5.4) and **dry-run it from a clean machine state** exactly as Vedant will: reset → schema → seed → verify. It must pass end to end before handing over.
7. Fill in §5.5 so Anuj can wire the DB containers and the seeding step into `docker-compose.yaml`.

---

## 9. Change log of inherited files (append-only)

| Date | Who | File | Change | Why |
|---|---|---|---|---|
| 2026-10-13 | Aditya | `AI.md` | Created | Shared team/AI context |
| 2026-10-13 | Aditya | `AI.md` | Named roles (Vedant = backend, Anuj = frontend + compose). Sounak not participating. Added §5.4 and §5.5 | Team roles confirmed |
| 2026-10-14 | Aditya | `AI.md` | §8 filled with baseline run results (no code changed yet) | Step 1 verification |
| 2026-10-14 | Aditya | `data_generation/postgres_seeder.py` | Rewritten in the structure of the GigTask-P5 seeder (argparse, logging, .env, Faker `en_IN`, `--seed`, `--clear`, batched `execute_values`, MV refresh). Consistent wallet ledger, 120-day spread, Hyderabad restaurants, 300 live orders via `sp_execute_checkout`, demo fixtures. | Fix 8.2 #1–6. Team asked to reuse the GigTask seeders. |
| 2026-10-14 | Aditya | `data_generation/mongo_seeder.py` | Now seeds **only** driverPings (510k, timestamps within last 10 min) | Fix 8.1 #13 (TTL purge). Mirrors the GigTask split. |
| 2026-10-14 | Aditya | `data_generation/reviews_seeder.py`, `menus_seeder.py` (new) | Reviews/menus split out; keyed by PG UUIDs; varied ratings/tags/items | Fix 8.2 #4, #7 |
| 2026-10-14 | Aditya | `data_generation/requirements.txt`, `.env.example` (new) | Added Faker + python-dotenv; env template | Same as GigTask-P5 |

---

## 10. Submission checklist

- [ ] `README.md`: setup steps (a new person can run everything), assumptions, tech choices + justification, screenshots, **contribution table**, **GitHub URL + final commit hash**, **demo video link (≤ 5 min)**
- [ ] `docs/handover_note.md` (~1 page, honest and specific)
- [ ] `docs/api_endpoints.md`
- [ ] `docs/design/`: users, wireframes, style guide
- [ ] All 4 workflows + browse working through the UI, with meaningful failure messages
- [ ] A few thoughtful tests (at least: checkout success, insufficient balance, active-order conflict)
- [ ] `docker-compose.yaml` (Anuj): postgres, mongo, DB init + seed, api, web. `docker compose up` on a fresh clone works.
- [ ] Verify script passes on Vedant's machine and inside compose (Aditya)
- [ ] Moodle: **one** zip named exactly `9_a1b.zip`, < 20 MB, no `node_modules`/`venv`/`__pycache__`/build/dumps
- [ ] Everyone has rehearsed the demo and can explain the inherited DB code (viva = 25 marks)
