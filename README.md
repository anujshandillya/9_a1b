# 9_a1b: BiteStream (Team 9)

**Repository:** https://github.com/anujshandillya/9_a1b
**Final commit hash:** _TODO (fill in at submission)_
**Demo video:** _TODO_

CS6.302 Software System Development, Assignment 1B (Front End Design). We inherited another
team's Assignment 1 database for **Project 1: BiteStream** (food delivery + real-time driver
logistics, on PostgreSQL + MongoDB), verified and fixed it, and are building an API and web front
end on top.

| Doc | What's in it |
|---|---|
| [`docs/handover_note.md`](docs/handover_note.md) | One-page handover: what worked, what didn't, what we changed and why |
| [`docs/database_guide.md`](docs/database_guide.md) | Full database guide: design, every workflow explained, fixes, evidence, Q&A |
| [`docs/relational_erd.png`](docs/relational_erd.png) | PostgreSQL ERD |
| [`docs/mongo_schema_map.json`](docs/mongo_schema_map.json) | MongoDB document structures, validators, indexes |
| [`performance/`](performance/) | Raw `EXPLAIN (ANALYZE, BUFFERS)` and `explain("executionStats")` output + the script that regenerates it |
| `docs/api_endpoints.md` | API endpoint list (_TODO: Vedant_) |
| `docs/design/` | Users, wireframes, style guide (_TODO: Anuj_) |

## Repository structure

```
9_a1b/
├── sql/                 # PostgreSQL: schema, indexes, triggers, checkout procedure, MVs, WF2 query
├── mongo/               # MongoDB: collections + validators + indexes, WF3 $geoNear, WF4 $facet
├── data_generation/     # seeders (Postgres, DriverPings, Reviews, Menus) + requirements.txt
├── performance/         # EXPLAIN evidence + generate_reports.sh
├── docs/                # handover note, database guide, ERD, Mongo schema map, design, API
├── api/                 # server layer (Vedant)
└── web/                 # front end (Anuj)
```

## Setup: database (no Docker needed)

Docker is optional per the A1B spec. Everything runs natively.

**Prerequisites:** PostgreSQL 14+ with `psql` (tested on 18.6), MongoDB 7+ with `mongosh` (tested
on 8.0.34), Python 3.10+.

```bash
# 1. Configuration
cp .env.example .env            # edit PGUSER / PGPASSWORD to match your local Postgres

# 2. Python environment for the seeders
python3 -m venv data_generation/.venv
data_generation/.venv/bin/pip install -r data_generation/requirements.txt

# 3. Schemas
createdb bitestream
for f in sql/0[1-5]*.sql; do psql -v ON_ERROR_STOP=1 -d bitestream -f "$f"; done
mongosh mongo/01_collections_and_indexes.js      # drops + recreates the Mongo collections

# 4. Seed (about 15 s). Postgres FIRST: the Mongo seeders read Postgres ids.
cd data_generation
.venv/bin/python postgres_seeder.py --clear
.venv/bin/python mongo_seeder.py                # DriverPings expire after 2 h; re-run before demos
.venv/bin/python reviews_seeder.py
.venv/bin/python menus_seeder.py
cd ..

# 5. Run the workflows / evidence
psql -d bitestream -f sql/06_window_analytics.sql   # WF2
mongosh mongo/02_workflow3_geonear.js               # WF3
mongosh mongo/03_workflow4_facet.js                 # WF4
bash performance/generate_reports.sh                # EXPLAIN / executionStats files
```

**Expected data (default flags):** 5,000 users · 200 restaurants · 100,300 orders (100,000
DELIVERED + ~188 PREPARING + ~112 DELIVERING) · 129,966 wallet audit rows · 200 menus · 110,000
reviews · 510,000 driver pings.

**Demo fixtures (fixed IDs on every machine):**

| Fixture | ID | Use |
|---|---|---|
| Demo Restaurant (Charminar) | `00000000-0000-4000-8000-0000000000a1` | has a menu, reviews, and drivers within 5 km |
| Demo User (Rich Wallet) | `00000000-0000-4000-8000-000000000001` | checkout succeeds |
| Demo User (Low Balance) | `00000000-0000-4000-8000-000000000002` | ₹45, so checkout fails: insufficient balance |
| Demo User (Active Order) | `00000000-0000-4000-8000-000000000003` | has a PREPARING order, so checkout fails: active order |

**Workflow 1 (checkout)** must be called in **autocommit mode** (not inside `BEGIN … COMMIT`),
because the procedure manages its own REPEATABLE READ transaction:

```sql
CALL sp_execute_checkout('<user_uuid>', '<restaurant_uuid>', 250.00);   -- returns p_order_id
```

Errors: `P0001` insufficient balance · `23505` user already has an active order · `22023` amount ≤ 0 ·
`23503` unknown user/restaurant · `40001` concurrent checkout (retry).

## Setup: API and web

_TODO: Vedant (API) and Anuj (web): install / run steps, env vars, ports._

## Database: performance proof (EXPLAIN)

Full raw output: [`performance/postgres_explain_analyzes.txt`](performance/postgres_explain_analyzes.txt),
[`performance/mongo_execution_stats.json`](performance/mongo_execution_stats.json).

| Query | Plan | Time |
|---|---|---|
| WF2: 7-day moving average + DENSE_RANK (reads ~74k orders) | Index Only Scan on `idx_orders_delivered_created_at_covering`, **no Seq Scan** | ~75 ms |
| Audit trail for one user | Bitmap Index Scan on `idx_wallet_audit_user_timestamp` | 0.04 ms |
| Active-order lookup | Index Only Scan on `idx_active_user_order` | 0.04 ms |
| MV top 10 by revenue | Index Scan on `idx_mv_restaurant_revenue_summary_revenue` | 0.2 ms |
| WF3: `$geoNear` nearest active drivers within 5 km | `GEO_NEAR_2DSPHERE` on `idx_driverPings_location_2dsphere`, **no COLLSCAN** | ~92 ms |
| WF4: `$facet` review analytics | `IXSCAN` on `idx_reviews_restaurant` (573 examined / 573 returned), **no COLLSCAN** | ~1 ms |

Excerpt (WF2):

```
->  Index Only Scan using idx_orders_delivered_created_at_covering on orders o
      (cost=0.42..1786.36 rows=33331 width=26) (actual time=0.045..18.856 rows=74108.00 loops=1)
Execution Time: 75.035 ms
```

## Changes to the inherited database

Summary below; the reasons and evidence are in [`docs/handover_note.md`](docs/handover_note.md)
and [`docs/database_guide.md` §8](docs/database_guide.md#8-what-we-inherited-what-was-wrong-what-we-changed).

| File | Change |
|---|---|
| `data_generation/postgres_seeder.py` | Rewritten: consistent wallet ledger, 120-day order history, Hyderabad restaurants, 300 live orders via `sp_execute_checkout`, demo fixtures, `--seed` / `--clear` / `.env`, `VACUUM ANALYZE` at the end |
| `data_generation/mongo_seeder.py` | Seeds only `DriverPings` (510k, timestamps inside the 2 h TTL window) |
| `data_generation/reviews_seeder.py`, `menus_seeder.py` | New: keyed by Postgres UUIDs |
| `data_generation/requirements.txt`, `.env.example` | Added Faker, python-dotenv, env template |
| `sql/02_indexes.sql` | Added the covering partial index `idx_orders_delivered_created_at_covering` |
| `sql/04_stored_procedures.sql` | `sp_execute_checkout` now owns its REPEATABLE READ transaction, relies on the CHECK constraint, catches + rolls back + re-raises, returns `p_order_id` |
| `sql/05_materialized_views.sql` | Added `mv_restaurant_revenue_summary` + `fn_refresh_restaurant_revenue_summary()`. Both MVs created `WITH DATA`. |
| `mongo/01_collections_and_indexes.js` | Collections renamed `Menus` / `Reviews` / `DriverPings`. `$jsonSchema` validators. Unique menu index per restaurant. |
| `mongo/02_workflow3_geonear.js` | Origin = the restaurant's location. Results grouped per driver. |
| `mongo/03_workflow4_facet.js` | Collection name + a valid restaurant id |
| `docs/`, `performance/` | ERD, Mongo schema map, EXPLAIN files, handover note, database guide |

## Assumptions (database)

- One city (Hyderabad): all restaurants and driver pings lie inside a Hyderabad bounding box.
- Drivers exist only in MongoDB (`driver_id` 1..2000). There is no drivers table in Postgres (not in the spec).
- `amount_changed` in the audit log is always positive; `action_type` (DEBIT/CREDIT) gives the direction.
- A user's opening balance is recorded as a CREDIT audit row by the seeder (the spec's trigger only fires on UPDATE).
- Historical orders are bulk-loaded with backdated timestamps. Live orders go through the stored procedure.
- "Completed" order = status `DELIVERED`. "Active" = `PREPARING` or `DELIVERING`.
- Seeded driver pings are meant to be short-lived (2 h TTL), so re-seed them before a demo.

## Tech choices

_TODO: API / web framework choices and justification (Vedant, Anuj)._

## Team and contributions

| Member | Role | Contributions |
|---|---|---|
| Aditya Chintala | Database verification & fixes | Verified the inherited DB against the A1 spec; seeders; procedure / MV / index / Mongo fixes; ERD, schema map, performance evidence, handover note, database guide |
| Vedant Bhatt | Backend / API | _TODO_ |
| Anuj Sharma | Frontend | _TODO_ |
