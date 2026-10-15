# AI.md: Team 9 shared context for humans and AI assistants

> **Read this whole file before touching the repo.** Each of us uses a different AI tool
> (Claude, ChatGPT, Copilot, Cursor, …). Point your assistant at this file first so we all work
> from the same rules, the same folder ownership, and the same DB ↔ API ↔ UI contract.
> For *why* the database is built the way it is, read [`docs/database_guide.md`](docs/database_guide.md).

---

## 1. What this repo is

- **Course:** CS6.302 Software System Development, **Assignment 2 (a.k.a. 1B): Front End Design**.
- **Team:** Team 9 → repo/zip name **`9_a1b`**.
- **Project:** **P1 BiteStream** (food delivery + real-time driver logistics).
- **Deadline:** **Thu 15 Oct 2026, 11:59 PM**. Late = −10 %/day (max 3 days).
- **What we're doing:** we **inherited another team's Assignment 1 database** (PostgreSQL + MongoDB),
  verified and fixed it (done, see §8), and now build a small API layer and a web UI that lets
  users run all four Assignment 1 workflows from a browser.
- **Guiding rule from the spec:** *"keep it simple and let the database (stored procedures, triggers,
  views, aggregation pipelines) do the real work."* The API should **call** the DB objects, not
  re-implement their logic in JS/Python.
- **Docker:** the team runs everything with `docker compose watch` (Postgres, Mongo, API, web,
  live driver pings). Seeding is a separate step from the host. The README has the exact steps
  (and a no-Docker alternative).

Source documents (in repo root):

| File | What it is |
|---|---|
| `Assignment1b.pdf` | **The spec we're graded on** (screens, deliverables, rubric). |
| `assign1_ssd_v1.pdf` | Original Assignment 1 spec. The DB satisfies its **Project 1: BiteStream** section (§8). |
| `Team Allocations.pdf` | Team 9 = Anuj Sharma, Vedant Bhatt, Sounak Banerjee, Aditya Chintala. **Sounak is not part of the working team.** We are 3 people (see §2). |
| `M26CS6.302_ Assignment 2 - FrontEnd _ Moodle.pdf` | Moodle page (deadline, submission notes). |

---

## 2. Who does what (folder ownership)

| Person | Role | Owns (writes to) | Hands off |
|---|---|---|---|
| **Aditya Chintala** | **Data verification**: verify the inherited DB against the A1 spec, fix it, and **make sure Vedant gets correct data when he seeds his own machine** | `sql/`, `mongo/`, `data_generation/`, `performance/`, `docs/handover_note.md`, `docs/database_guide.md`, `docs/relational_erd.*`, `docs/mongo_schema_map.json` | **DB contract** (§5, frozen), **seeding steps + fixtures** (§5.4) |
| **Vedant Bhatt** | **Backend / API (middleware)**. Seeds his own local DB with Aditya's seeders. | `api/`, `docs/api_endpoints.md` | API endpoints (§6) that Anuj's frontend uses. API run steps + env vars in the README. |
| **Anuj Sharma** | **Frontend + `docker-compose.yaml`** | `web/`, `docs/design/` (users, wireframes, style guide), `docker-compose.yaml` | Screens (§7). The compose stack. |
| **Everyone** | — | `README.md` (fill your own TODO sections/rows), tests in your own folder | — |

> **Team size:** the allocation sheet lists 4 members, but **Sounak Banerjee is not participating**.
> Decide as a team how to state that in the README contribution table (marks are scaled by
> contribution), and consider telling the TAs early.

**Rules for everyone (and their AI):**

1. **Stay in your folders.** If you need a change in someone else's area, ask them or open a PR and tell them about it. Don't silently edit it.
2. **Never change the DB contract (§5) on the API/UI side.** If the DB doesn't give you what you need, ask Aditya to add a view, function or field.
3. **Every change to inherited files (`sql/`, `mongo/`, `data_generation/`) must be logged** in §9 of this file *and* in the README. The rubric awards marks for documenting fixes.
4. The rubric expects **everyone to contribute to both design and code**, and the README needs a **contribution table**.
5. At the **viva, anyone can be asked about any part, including the inherited DB code**. Everyone should read §5 and `docs/database_guide.md` §1 + §11.
6. Never commit `node_modules/`, `.venv/`, `__pycache__/`, build output, `.env`, or DB dumps. The submission zip must stay **under 20 MB**.

---

## 3. Order of work (dependencies)

```
[Aditya] verify → fix → freeze DB contract (§5)                         ✅ DONE 2026-10-14
        │      └─ seeding steps, expected counts, demo fixtures (§5.4)   ✅ DONE
        │
        ├──► [Vedant] seeds his OWN local DB (§5.4) → builds api/ against §5
        │           │
        │           └──► [Anuj] wires screens to the real API (may mock earlier using §6)
[Anuj]   users + wireframes + style guide in docs/design/ (no DB needed)
[Vedant] docs/api_endpoints.md (spec requires it before the UI)
```

---

## 4. Repo state

```
9_a1b/
├── README.md               # setup (Docker + seeding), tests, EXPLAIN summary, changes, assumptions; tech/team TODOs
├── AI.md                   # this file
├── .env.example            # PG* + MONGO_URI template (copy to .env, which is git-ignored)
├── sql/01..06_*.sql        # PostgreSQL (verified + fixed)
├── mongo/01..03_*.js       # MongoDB (verified + fixed)
├── data_generation/        # postgres_seeder.py, mongo_seeder.py (DriverPings), reviews_seeder.py, menus_seeder.py, live_pings.py
├── performance/            # EXPLAIN / executionStats evidence + generate_reports.sh
├── docs/                   # handover_note.md, database_guide.md, relational_erd.png/.svg, mongo_schema_map.json
├── docker-compose.yaml     # postgres, mongo, backend, frontend, live-pings (Anuj; live-pings added by Aditya)
├── api/                    # Vedant: FastAPI + api/tests (pytest)
└── web/                    # Anuj: React/Vite + web/tests (node --test)
```

Still to add for submission: `docs/api_endpoints.md`, `docs/design/`, demo video, README TODOs (tech choices, contributions, commit hash).

---

## 5. DB contract (what the API can rely on)

> **Status: FROZEN (2026-10-14).** Verified on PostgreSQL 18.6 + MongoDB 8.0.34. Names here are the
> source of truth for the API. Ask Aditya before relying on anything not listed.

### 5.1 PostgreSQL (db name `bitestream`)

Run order: `sql/01` → `02` → `03` → `04` → `05` (all idempotent). `06_window_analytics.sql` is a query.

| Object | Shape / behaviour |
|---|---|
| `users` | `id UUID PK`, `name VARCHAR(120)`, `wallet_balance DECIMAL(10,2) CHECK >= 0` |
| `restaurants` | `id UUID PK`, `name VARCHAR(160)`, `latitude`, `longitude` (FLOAT8) |
| `orders` | `id UUID PK`, `user_id FK`, `restaurant_id FK`, `total_amount > 0`, `status ∈ {PREPARING, DELIVERING, DELIVERED}`, `created_at TIMESTAMPTZ DEFAULT NOW()` |
| `wallet_audit_logs` | `id UUID PK`, `user_id FK`, `amount_changed` (**always positive**), `action_type ∈ {DEBIT, CREDIT}`, `balance_after` (= the running balance), **`"timestamp"`** TIMESTAMPTZ. **Insert-only:** UPDATE/DELETE raise an error. |
| `trg_users_wallet_balance_audit` | Any `UPDATE users SET wallet_balance = …` writes one audit row automatically (DEBIT or CREDIT). |
| `idx_active_user_order` | At most **one PREPARING/DELIVERING order per user** → violation `23505`. |
| **`CALL sp_execute_checkout(user_id, restaurant_id, amount)`** | **Workflow 1.** Returns one row: **`p_order_id`**. Owns its **REPEATABLE READ** transaction: locks the user, debits (CHECK), the trigger writes the DEBIT row, inserts a PREPARING order, COMMITs. On failure: ROLLBACK + error. **Must be called in autocommit mode**, NOT inside `BEGIN … COMMIT` (that gives `2D000 invalid transaction termination`). psycopg2: `conn.autocommit = True`. node-postgres: plain `client.query('CALL …')`. |
| Checkout errors (SQLSTATE) | `P0001` insufficient balance · `23505` user already has an active order · `22023` amount ≤ 0 · `23503` user/restaurant doesn't exist · `40001` concurrent checkout (safe to retry). **Map these to friendly UI messages.** |
| Balance before/after for the UI | After a successful CALL, read the newest audit row for that user: `balance_after` = new balance, and `balance_after + amount_changed` = old balance (consistent by construction). |
| Advance order status | Plain `UPDATE orders SET status = 'DELIVERING' / 'DELIVERED' WHERE id = …`. Delivering it frees the user to order again. |
| Wallet top-up (optional) | Plain `UPDATE users SET wallet_balance = wallet_balance + X WHERE id = …`. The trigger logs a CREDIT. |
| `mv_restaurant_revenue_summary` | **Spec MV:** `(restaurant_id, restaurant_name, completed_order_count, total_revenue, last_completed_order_at)`, one row per restaurant, DELIVERED orders only. |
| `SELECT fn_refresh_restaurant_revenue_summary()` | `REFRESH MATERIALIZED VIEW CONCURRENTLY` (no read blocking) **and logs it** in `mv_refresh_log`. |
| `mv_restaurant_daily_revenue` + `fn_refresh_restaurant_daily_revenue()` | Per restaurant per day `(restaurant_id, revenue_date, order_count, daily_revenue)`. Also concurrent-refreshable and logged. |
| **`SELECT fn_refresh_all_revenue_views()`** | Refreshes **both** views (each logged) and returns the latest refresh time. Used by the Analytics Refresh button. |
| `mv_refresh_log` | `(id, view_name, refreshed_at TIMESTAMPTZ, duration_ms, refresh_mode)`, one row per refresh. "Last refreshed" = `MAX(refreshed_at) WHERE view_name = …`. `sql/05` creates it, keeps a compatible existing table, or drops and recreates an incompatible one, then makes sure each view has a logged refresh. |
| `sql/06_window_analytics.sql` | **Workflow 2.** Last 90 days. Returns `(restaurant_id, revenue_date, daily_revenue, moving_avg_7_day, period_revenue, revenue_rank)`, 90 rows per restaurant. `revenue_rank` = `DENSE_RANK()` by period revenue. Wrap it in a CTE and filter by `restaurant_id` for one restaurant's chart. |

### 5.2 MongoDB (db name `bitestream`)

Collection names are **capitalized as in the spec**. Shapes and examples are in [`docs/mongo_schema_map.json`](docs/mongo_schema_map.json).

| Collection | Shape |
|---|---|
| `Menus` | `{restaurant_id: PG-UUID-string (unique), restaurant_name, location: GeoJSON Point, categories:[{name, items:[{item_id, name, description, price, available, customization_addons?, dietary_tags?}]}], updated_at}`. One per PG restaurant (200). |
| `Reviews` | `{restaurant_id: PG-UUID-string, user_id: PG-UUID-string, rating: int 1..5, comment, sentiment_tags:[string], created_at}`. 110,000. |
| `DriverPings` | `{driver_id: int 1..2000, active: bool, location: GeoJSON Point [lng, lat], created_at}`. 510,000 seeded (expire 2 h after seeding, TTL) **plus live pings**: the `live-pings` service (`data_generation/live_pings.py`) moves 150 drivers and inserts their pings every 5 s. |
| **Workflow 3** (`mongo/02_workflow3_geonear.js`) | `$geoNear` (near = restaurant's `Menus.location`, `maxDistance: 5000`, `query: {active: true}`) → `$group` by `driver_id` (nearest ping) → `$sort` → `$limit 10`. For the map's **selectable origin**, pass any `[lng, lat]` as `near`. |
| **Workflow 4** (`mongo/03_workflow4_facet.js`) | `$match {restaurant_id}` → `$facet {rating_distribution, most_frequent_tags, overall_average_rating}`. |

Mongo `restaurant_id` / `user_id` **are the Postgres UUIDs as strings**, so join them in the API.

### 5.3 Limits and conventions

- **Amounts:** orders and wallet balances fit `DECIMAL(10,2)`, max **₹9,99,99,999.99**. The browser rejects
  bigger amounts (and top-ups that would push a balance over it). The API returns `400 AMOUNT_TOO_LARGE`, and
  a database overflow (SQLSTATE `22003`) maps to the same code.
- **"Last refreshed"** comes from `mv_refresh_log` (in the database, survives API restarts).
- **Revenue = `DELIVERED` orders only.** Chart and ranking are live; MV totals change on Refresh.
- **Time zones:** the audit date filter uses whole days in `?tz=` (the browser's IANA zone), falling back to IST.

### 5.4 Seeding your own machine (Aditya → Vedant)

Full steps: README → "Setup (Docker, recommended)". Short version (≈15 s, with `docker compose watch` running):

```bash
cp .env.example .env    # PGUSER=postgres / PGPASSWORD=postgres (compose and the seeders both read it)
python3 -m venv data_generation/.venv && data_generation/.venv/bin/pip install -r data_generation/requirements.txt
cd data_generation && .venv/bin/python postgres_seeder.py --clear && .venv/bin/python mongo_seeder.py \
  && .venv/bin/python reviews_seeder.py && .venv/bin/python menus_seeder.py
```

Schemas are created by the containers on an empty volume. If your volume predates a change in `sql/`,
run `docker compose down -v` (then start and seed again) or apply the changed file with `psql -f` in the container.

**Demo fixtures (fixed IDs, identical on every machine):**

| Fixture | ID | State after seeding |
|---|---|---|
| Demo Restaurant (Charminar) | `00000000-0000-4000-8000-0000000000a1` | 17.3616, 78.4747. Menu, ~570 reviews, drivers within 5 km. |
| Demo User (Rich Wallet) | `00000000-0000-4000-8000-000000000001` | ≈ ₹44.6k, no active order, so checkout succeeds |
| Demo User (Low Balance) | `00000000-0000-4000-8000-000000000002` | **₹45.00**, so checkout fails with `P0001` |
| Demo User (Active Order) | `00000000-0000-4000-8000-000000000003` | has a **PREPARING** order, so checkout fails with `23505` |

**Expected counts:** users 5,000 · restaurants 200 · orders 100,300 (100,000 DELIVERED, 188 PREPARING, 112 DELIVERING) · wallet_audit_logs 129,966 (29,666 CREDIT / 100,300 DEBIT) · Menus 200 · Reviews 110,000 · DriverPings 510,000. **If your numbers differ, tell Aditya.** That's a DB-side bug.

---

## 6. API sketch (Backend owns; draft for frontend to mock against)

Tech is our choice (justify in README). Keep handlers thin: call the procedure, query, MV or pipeline.
**Paginate every list** (the spec says never load 50k+ rows into the browser).

| Method & path | Input | Output | Backed by |
|---|---|---|---|
| `GET /api/users?page&limit&q` | paging, name search | `{items:[{id,name,wallet_balance}], total}` | `users` |
| `GET /api/users/:id` | — | user + recent orders | `users`, `orders` |
| `GET /api/restaurants?page&limit&q` | paging, search | list | `restaurants` |
| `GET /api/restaurants/:id` | — | restaurant + menu | `restaurants` + `Menus` |
| `GET /api/orders?page&limit&status&user_id&restaurant_id` | filters | list | `orders` |
| `GET /api/orders/:id` | — | detail | `orders` |
| `POST /api/checkout` | `{user_id, restaurant_id, amount}` | `{order, balance_before, balance_after, audit_entry}` or `{error_code, message, sqlstate}` | `CALL sp_execute_checkout` (autocommit, **no BEGIN**) + `p_order_id` + newest DEBIT row |
| `POST /api/orders/:id/advance` | — | updated order | `UPDATE orders SET status …` |
| `GET /api/users/:id/audit?from&to&page&tz` | date range, browser time zone | rows incl. running balance, `timezone` used | `wallet_audit_logs` |
| `GET /api/analytics/moving-average?restaurant_id` | restaurant | daily series | `06_window_analytics.sql` |
| `GET /api/analytics/ranking` | — | DENSE_RANK table | `06_window_analytics.sql` |
| `GET /api/analytics/summary` | — | MV totals + `last_refreshed` (from `mv_refresh_log`) | `mv_restaurant_daily_revenue` |
| `POST /api/analytics/refresh` | — | `{last_refreshed}` | `fn_refresh_all_revenue_views()` (both views, logged) |
| `GET /api/drivers/nearby?lng&lat` | origin | drivers sorted by distance (5 km) | WF3 pipeline |
| `GET /api/restaurants/:id/reviews/analytics` | — | facet result | WF4 pipeline |
| `GET /api/restaurants/:id/menu` | — | menu document | `Menus` |

---

## 7. Screens (Frontend owns), as required by `Assignment1b.pdf`

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

## 8. DB verification status (Aditya): ✅ compliant with the A1 BiteStream spec

Full story, evidence and explanations: [`docs/database_guide.md`](docs/database_guide.md) §8–§9.
Handover summary: [`docs/handover_note.md`](docs/handover_note.md).

**Environment:** verified natively on PostgreSQL 18.6 + MongoDB 8.0.34, and on the team's Docker stack (postgres:18-alpine, mongo:7.0.40).

| A1 requirement | Inherited status | Now |
|---|---|---|
| Tables, columns, CHECKs, FKs | ✅ | ✅ unchanged |
| Collections `Menus` / `Reviews` / `DriverPings` | ⚠️ named `menus` / `reviews` / `driverPings` | ✅ renamed + `$jsonSchema` validators |
| Audit trigger + immutable log | ✅ (TRUNCATE gap noted) | ✅ unchanged |
| Partial unique index | ✅ | ✅ unchanged |
| MV joining restaurants + total completed count/revenue + CONCURRENT refresh fn | ❌ per-day, no join. Refresh failed on fresh install. | ✅ `mv_restaurant_revenue_summary`; both MVs `WITH DATA` |
| 2dsphere + TTL 7200 s | ✅ | ✅ |
| WF1: own REPEATABLE READ txn, CHECK, COMMIT, catch + ROLLBACK | ❌ none of these | ✅ rewritten, tested (success, P0001, 23505, 22023, 23503, 40001 race, 2D000) |
| WF2: 7-day moving average + DENSE_RANK | ✅ logic. ❌ data made it meaningless. Seq Scan with real data. | ✅ ~16,300/18,000 non-zero day-rows. Index Only Scan via new covering index. |
| WF3: closest active driver within 5 km of a restaurant | ❌ hardcoded point, returned pings | ✅ restaurant origin, distinct drivers |
| WF4: `$facet` | ✅ | ✅ sample id fixed |
| ≥100k ledger / ≥50k orders / ≥500k pings | ⚠️ 200k / 200k / **248k after TTL purge** | ✅ 129,966 / 100,300 / 510,000 |
| Seed data usable by the UI | ❌ 1 day of orders, 0 active, restaurants worldwide, no shared IDs | ✅ fixed (database_guide §6) |
| ERD, schema map, EXPLAIN evidence, README | ❌ missing | ✅ `docs/`, `performance/`, README |

Baseline measurements of the unmodified inherited code (kept for the handover story): all 200,000
orders within 85 s on one day. 0 of 100 restaurants near any driver. 251,609 of 500,000 pings
deleted by TTL within a minute. Seeder took 86 s. WF2 had 100 of 9,000 non-zero day-rows.

---

## 9. Change log of inherited files (append-only)

| Date | Who | File | Change | Why |
|---|---|---|---|---|
| 2026-10-13 | Aditya | `AI.md` | Created | Shared team/AI context |
| 2026-10-13 | Aditya | `AI.md` | Named roles (Vedant = backend, Anuj = frontend). Sounak not participating. | Team roles confirmed |
| 2026-10-14 | Aditya | `AI.md` | §8 filled with baseline run results (no code changed yet) | Step 1 verification |
| 2026-10-14 | Aditya | `data_generation/postgres_seeder.py` | Rewritten in the structure of the GigTask-P5 seeder (argparse, logging, .env, Faker `en_IN`, `--seed`, `--clear`, batched `execute_values`, MV refresh). Consistent wallet ledger, 120-day spread, Hyderabad restaurants, 300 live orders via `sp_execute_checkout`, demo fixtures. | Fix seed-data problems. Team asked to reuse the GigTask seeders. |
| 2026-10-14 | Aditya | `data_generation/mongo_seeder.py` | Seeds **only** DriverPings (510k, timestamps within last 10 min) | TTL purge fix. Mirrors the GigTask split. |
| 2026-10-14 | Aditya | `data_generation/reviews_seeder.py`, `menus_seeder.py` (new) | Reviews/menus split out, keyed by PG UUIDs, varied ratings/tags/items | Cross-DB keys, realistic data |
| 2026-10-14 | Aditya | `data_generation/requirements.txt`, `.env.example` (new) | Added Faker + python-dotenv; env template | Same as GigTask-P5 |
| 2026-10-14 | Aditya | `sql/04_stored_procedures.sql` | `sp_execute_checkout` owns its REPEATABLE READ txn, relies on CHECK, catches + ROLLBACK + re-raise, returns `p_order_id` | A1 spec wording for WF1 |
| 2026-10-14 | Aditya | `sql/05_materialized_views.sql` | Added `mv_restaurant_revenue_summary` + refresh fn. Both MVs `WITH DATA`. | A1 spec. Fresh-install refresh bug. |
| 2026-10-14 | Aditya | `sql/02_indexes.sql` | Added `idx_orders_delivered_created_at_covering` | WF2 Seq Scan → Index Only Scan |
| 2026-10-14 | Aditya | `mongo/01..03` | Spec collection names, validators, WF3 restaurant origin + per-driver grouping, WF4 sample id | A1 spec |
| 2026-10-14 | Aditya | `data_generation/postgres_seeder.py` | Live orders via autocommit CALL (procedure commits itself). Refresh both MVs. `VACUUM ANALYZE` at the end. | Follows the procedure change. Index Only Scans. |
| 2026-10-14 | Aditya | `docs/*`, `performance/*`, `README.md` | ERD, schema map, EXPLAIN evidence + script, handover note, database guide, README DB sections | Missing A1 / A1B deliverables |
| 2026-10-14 | Aditya | `AI.md` | Rewritten: contract FROZEN, no Docker, new procedure contract | Keep the team in sync |
| 2026-10-14 | Aditya | `api/main.py` | Checkout calls the procedure in autocommit (no `BEGIN`) and uses `p_order_id` | Every checkout failed with `2D000 invalid transaction termination` |
| 2026-10-14 | Aditya | `sql/05_materialized_views.sql` | `mv_refresh_log` (create / keep / replace after schema check), logged refresh functions, `fn_refresh_all_revenue_views()` | "Last refreshed" was lost on every API restart |
| 2026-10-14 | Aditya | `data_generation/live_pings.py`, `docker-compose.yaml` (`live-pings` service) | Live moving driver pings every 5 s | Map went empty 30 min after seeding; A1B wants new pings while polling |
| 2026-10-14 | Aditya | `api/main.py`, `api/errors.py`, `web/src` | Amount limit checks (browser + API + `22003` mapping), audit `?tz=` with IST fallback, Refresh updates both views, Analytics hint text | Huge amounts gave a 500; audit days were UTC; summary view never refreshed from UI |
| 2026-10-14 | Aditya | `api/tests/`, `web/tests/` | 11 API tests (checkout success/failures, limits, refresh log, tz, map) + 5 web tests | A1B asks for tests; `api/tests` was missing |
| 2026-10-14 | Aditya | `README.md`, `AI.md`, `docs/` | Docker setup, tests, new contract items | Docs said "no Docker" |

---

## 10. Submission checklist

- [ ] `README.md`: DB setup ✅ · API/web setup · tech choices + justification · screenshots · **contribution table** · **GitHub URL + final commit hash** · **demo video link (≤ 5 min)**
- [x] `docs/handover_note.md` (~1 page, honest and specific)
- [ ] `docs/api_endpoints.md`
- [ ] `docs/design/`: users, wireframes, style guide
- [ ] All 4 workflows + browse working through the UI, with meaningful failure messages
- [ ] A few thoughtful tests (at least: checkout success, insufficient balance, active-order conflict)
- [ ] README setup works on a fresh clone with `docker compose watch` + seeding (each of us tests it once)
- [x] API tests (`api/tests/`) and web tests (`web/tests/`) pass
- [ ] Before the demo: `docker compose ps` shows `live-pings` running (the map needs fresh pings)
- [ ] Moodle: **one** zip named exactly `9_a1b.zip`, < 20 MB, no `node_modules`/`.venv`/`__pycache__`/build/dumps
- [ ] Everyone has rehearsed the demo and can explain the inherited DB code (viva = 25 marks)
