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
| `menus` | `{_id: uuid-string, restaurant_id: INT 1..100, restaurant_name, categories:[{name, items:[{item_id, name, description, price, available, customization_addons:[{name, price}]}]}], updated_at}` |
| `reviews` | `{_id, restaurant_id: INT, user_id: uuid-string, rating: 1..5, comment, sentiment_tags:[string], created_at}` |
| `driverPings` | `{_id, driver_id: INT 1..2000, active: bool, location: GeoJSON Point [lng, lat], created_at}`. Indexes: 2dsphere on `location`, **TTL 7200 s** on `created_at`, and `active`. |
| `mongo/02_workflow3_geonear.js` | `$geoNear` around a fixed point (Hyderabad 17.3850, 78.4867), `maxDistance 5000`, `active: true`, top 10. |
| `mongo/03_workflow4_facet.js` | `$match restaurant_id` → `$facet {rating_distribution, most_frequent_tags, overall_average_rating}`. |

⚠️ **Known cross-DB mismatch (see §8):** Postgres restaurant IDs are UUIDs, but Mongo uses ints
`1..100`. Until this is fixed, the API **cannot** link a Postgres restaurant to its Mongo
menu/reviews. Don't build around the ints. Wait for Aditya's fix.

### 5.3 Planned DB additions for the UI (Aditya will confirm in §9)

These are things the UI spec needs that the inherited DB does not provide yet:

- **MV "last refreshed" time.** Postgres doesn't store this. Plan: add an `mv_refresh_log` table that the refresh function writes to.
- **Order status transitions** (PREPARING → DELIVERING → DELIVERED). The spec requires a UI for this so the partial index can be demonstrated. Plan: a small `sp_advance_order_status(order_id)` or a plain guarded UPDATE.
- **Wallet top-up (CREDIT)** so demo users can recover from "insufficient balance". Optional.
- **Shared restaurant key** between Postgres and Mongo, and restaurants/pings in the **same city**.
- **Live ping generator** so the map shows new pings while we poll (TTL deletes seeded pings after 2 h).
- **Seed data with spread-out dates and some active orders** (see §8).

### 5.4 Data-generation handoff (Aditya → Vedant)

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

## 8. DB verification checklist (Aditya), with suspected issues

Status legend: ⬜ not checked · 🔍 suspected from reading code (not yet run) · ✅ verified OK · ❌ confirmed broken · 🔧 fixed

### 8.1 Against the A1 BiteStream spec

| # | Requirement (A1 spec) | Where | Status / note |
|---|---|---|---|
| 1 | `users.wallet_balance DECIMAL(10,2) CHECK >= 0` | `sql/01_schema_ddl.sql:7-13` | ⬜ looks right |
| 2 | `wallet_audit_logs` fields + `timestamp DEFAULT NOW()` | `sql/01_schema_ddl.sql:44-60` | ⬜ looks right |
| 3 | `restaurants`, `orders` (status enum, FKs) | `sql/01_schema_ddl.sql:15-42` | ⬜ looks right |
| 4 | Trigger AFTER UPDATE OF wallet_balance → immutable audit | `sql/03_triggers_and_audit.sql` | ⬜ looks right (+ immutability trigger) |
| 5 | Partial unique index `idx_active_user_order` | `sql/02_indexes.sql:6-8` | ⬜ matches spec exactly |
| 6 | MV **joining restaurants** with **total completed order count and revenue** + REFRESH CONCURRENTLY fn | `sql/05_materialized_views.sql` | 🔍 MV is **per-day** and **doesn't JOIN restaurants** (no name). Created `WITH NO DATA`, so the first CONCURRENTLY refresh fails until a plain refresh is run. No last-refreshed tracking. |
| 7 | 2dsphere on `DriverPings.location`, TTL 7200 on `created_at` | `mongo/01_collections_and_indexes.js` | ⬜ looks right. Note: script **drops** collections, so run it *before* seeding. |
| 8 | WF1 `sp_execute_checkout`: **starts a REPEATABLE READ txn**, debits, inserts order, **COMMIT**; **catch** insufficient-balance and **ROLLBACK** | `sql/04_stored_procedures.sql` | 🔍 Procedure **doesn't control the transaction** (relies on the caller) and **doesn't catch/rollback**. It pre-checks balance instead of relying on the CHECK constraint. Doesn't return the new order id. Decide: fix in-proc, or document the caller contract. |
| 9 | WF2 CTE + window: 7-day moving avg per restaurant + DENSE_RANK | `sql/06_window_analytics.sql` | 🔍 Query logic looks sound (calendarized, ROWS 6 PRECEDING). **But see 8.2 #1:** seeded dates make it meaningless. |
| 10 | WF3 `$geoNear` closest **active driver** within 5 km **of a restaurant** | `mongo/02_workflow3_geonear.js` | 🔍 Hardcoded point, not a real restaurant. Returns **pings, not distinct drivers** (same driver can appear many times). Doesn't filter stale pings. |
| 11 | WF4 `$facet`: rating dist, top tags via `$unwind`, avg | `mongo/03_workflow4_facet.js` | ⬜ looks right. Uses int `restaurant_id = 1`. |
| 12 | ≥100k audit rows, ≥50k orders | `data_generation/postgres_seeder.py` | 🔍 Targets 200k orders → 200k DEBIT audits, but one order per round-trip with `ORDER BY random()` (very slow). Verify the actual counts. |
| 13 | ≥500k geo pings | `data_generation/mongo_seeder.py` | 🔍 Pings are timestamped 0–240 min ago, and the TTL is 120 min, so **about half are deleted within ~1 min**, and **all are gone after 2 h**. Count will be < 500k. |
| 14 | ERD, mongo schema map, EXPLAIN / executionStats in README / `performance/` | — | 🔍 **Missing** from the inherited repo. |

### 8.2 Data-quality issues that will break the UI

| # | Issue | Where | Impact |
|---|---|---|---|
| 1 | **All orders and audit rows get `created_at = NOW()` at seed time** (the procedure uses the default, and the seeder never backdates). | `postgres_seeder.py`, `04_stored_procedures.sql:68-79` | 7-day moving-average chart = a single spike. The audit date filter is useless. |
| 2 | **Every seeded order is immediately set to DELIVERED** → zero active orders. No status variety. | `postgres_seeder.py:136-143` | Can't demo the partial index or status transitions without making data by hand. |
| 3 | **Restaurants are placed randomly across the whole globe** (lat −90..90, lng −180..180), but **driver pings are in Hyderabad**. | `postgres_seeder.py:53-54` vs `mongo_seeder.py:221-229` | `$geoNear` from any real restaurant returns **nothing**. |
| 4 | **No shared key between Postgres and Mongo**: PG restaurants are UUIDs, Mongo `restaurant_id` is int 1..100. Review `user_id`s are random UUIDs unrelated to PG users. Names differ ("Test Restaurant N" vs "Restaurant N"). | both seeders | The UI can't show a restaurant's menu/reviews. |
| 5 | Starting balance ₹1,000,000 for all users, and no CREDIT events ever. | `postgres_seeder.py:20` | "Insufficient balance" never happens naturally. The audit trail is all DEBIT. Need some low-balance demo users. |
| 6 | Default PG password `"2306"` is hardcoded. Seeders aren't idempotent (a rerun duplicates users/restaurants). Seeders aren't seeded with a fixed `random.seed`, so every run produces different data. | `postgres_seeder.py:12` | Vedant's local data won't match anyone else's. Reruns corrupt counts. Move credentials to env vars (§5.5), add a clean reset, and fix the random seed. |
| 7 | All menu items share the same two add-ons and the same description. | `mongo_seeder.py:110-124` | Cosmetic. "Flexible catalog" isn't very flexible. |
| 8 | Inherited git history looks squashed into one commit (`bc3cbe5`). The spec says *"Keep the Assignment 1 commit history intact."* | git | Mention it honestly in the handover note. |

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
