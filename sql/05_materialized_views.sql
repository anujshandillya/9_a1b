-- BiteStream | Materialized views
-- Run after 01_schema_ddl.sql.
--
-- mv_restaurant_revenue_summary (spec): restaurants joined with their total
--   completed (DELIVERED) order count and revenue. One row per restaurant.
-- mv_restaurant_daily_revenue (kept from the original submission): the same
--   DELIVERED orders per restaurant per day.
--
-- REFRESH ... CONCURRENTLY needs a UNIQUE index on the view and a view that has
-- been populated once, so both views are created WITH DATA (populated at create time).

BEGIN;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_restaurant_revenue_summary AS
SELECT
    r.id AS restaurant_id,
    r.name AS restaurant_name,
    COUNT(o.id) AS completed_order_count,
    COALESCE(SUM(o.total_amount), 0.00)::DECIMAL(14,2) AS total_revenue,
    MAX(o.created_at) AS last_completed_order_at
FROM restaurants AS r
LEFT JOIN orders AS o
  ON o.restaurant_id = r.id
 AND o.status = 'DELIVERED'
GROUP BY r.id, r.name
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_restaurant_revenue_summary
    ON mv_restaurant_revenue_summary (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_mv_restaurant_revenue_summary_revenue
    ON mv_restaurant_revenue_summary (total_revenue DESC);

CREATE OR REPLACE FUNCTION fn_refresh_restaurant_revenue_summary()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_restaurant_revenue_summary;
END;
$$;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_restaurant_daily_revenue AS
SELECT
    o.restaurant_id,
    DATE_TRUNC('day', o.created_at)::DATE AS revenue_date,
    COUNT(*) AS order_count,
    SUM(o.total_amount)::DECIMAL(14,2) AS daily_revenue
FROM orders AS o
WHERE o.status = 'DELIVERED'
GROUP BY o.restaurant_id, DATE_TRUNC('day', o.created_at)::DATE
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_restaurant_daily_revenue
    ON mv_restaurant_daily_revenue (restaurant_id, revenue_date);

CREATE INDEX IF NOT EXISTS idx_mv_restaurant_daily_revenue_date
    ON mv_restaurant_daily_revenue (revenue_date DESC);

CREATE OR REPLACE FUNCTION fn_refresh_restaurant_daily_revenue()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_restaurant_daily_revenue;
END;
$$;

COMMIT;

-- Refresh after data changes (no read lock on the views while refreshing):
-- SELECT fn_refresh_restaurant_revenue_summary();
-- SELECT fn_refresh_restaurant_daily_revenue();
