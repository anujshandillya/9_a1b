import { test } from 'node:test'
import assert from 'node:assert/strict'
import { advance, checkout, createDemoState, demoRequest, FIXTURES } from '../src/lib/demo.js'

const payload = (user_id = FIXTURES.rich, amount = 420) => ({ user_id, restaurant_id: FIXTURES.restaurant, amount })
test('successful checkout creates a single matching debit and preparing order', () => {
  const state = createDemoState(), before = state.orders.length, auditBefore = state.audit.length
  const result = checkout(state, payload())
  assert.equal(result.balance_before, 44600)
  assert.equal(result.balance_after, 44180)
  assert.equal(result.order.status, 'PREPARING')
  assert.equal(result.audit_entry.amount_changed, 420)
  assert.equal(result.audit_entry.action_type, 'DEBIT')
  assert.equal(result.audit_entry.order_id, result.order.id)
  assert.equal(state.users[0].wallet_balance, result.audit_entry.balance_after)
  assert.equal(state.orders.length, before + 1)
  assert.equal(state.audit.length, auditBefore + 1)
})
test('insufficient funds changes neither wallet, orders nor audit', () => {
  const state = createDemoState(), before = JSON.stringify(state)
  assert.throws(() => checkout(state, payload(FIXTURES.low)), { error_code: 'P0001' })
  assert.equal(JSON.stringify(state), before)
})
test('an existing active order rejects checkout without a second debit', () => {
  const state = createDemoState(), before = JSON.stringify(state)
  assert.throws(() => checkout(state, payload(FIXTURES.active)), { error_code: '23505' })
  assert.equal(JSON.stringify(state), before)
})
test('completing an order allows checkout again; delivering still blocks it', () => {
  const state = createDemoState(), first = checkout(state, payload())
  assert.throws(() => checkout(state, payload()), { error_code: '23505' })
  assert.equal(advance(state, first.order.id).status, 'DELIVERING')
  assert.throws(() => checkout(state, payload()), { error_code: '23505' })
  assert.equal(advance(state, first.order.id).status, 'DELIVERED')
  assert.equal(checkout(state, payload()).balance_after, 43760)
})
test('invalid amounts and missing entities do not mutate state', () => {
  for (const amount of [0, -1, NaN, Infinity, 1.001, 100000000]) {
    const state = createDemoState(), before = JSON.stringify(state)
    assert.throws(() => checkout(state, payload(FIXTURES.rich, amount)), { error_code: '22023' })
    assert.equal(JSON.stringify(state), before)
  }
  const state = createDemoState()
  assert.throws(() => checkout(state, { ...payload(), restaurant_id: 'missing' }), { error_code: '23503' })
})
test('audit date filters retain the canonical balance and paginate', () => {
  const state = createDemoState()
  const all = demoRequest(state, `/users/${FIXTURES.rich}/audit?limit=50`)
  const day = all.items[5].timestamp.slice(0, 10)
  const filtered = demoRequest(state, `/users/${FIXTURES.rich}/audit?from=${day}&to=${day}&limit=50`)
  assert.ok(filtered.items.length > 0)
  for (const row of filtered.items) {
    assert.equal(row.timestamp.slice(0, 10), day)
    assert.equal(row.running_balance, state.audit.find((a) => a.id === row.id).balance_after)
  }
  assert.equal(all.items[0].balance_after, state.users[0].wallet_balance)
  const paginated = demoRequest(state, '/orders?page=2&limit=8')
  assert.equal(paginated.items.length, 8)
  assert.equal(paginated.total, state.orders.length)
})
test('revenue snapshot stays unchanged until refresh after a delivery', () => {
  const state = createDemoState(), initial = demoRequest(state, '/analytics/summary')
  const { order } = checkout(state, payload())
  advance(state, order.id); advance(state, order.id)
  assert.equal(demoRequest(state, '/analytics/summary').total_revenue, initial.total_revenue)
  demoRequest(state, '/analytics/refresh', 'POST')
  assert.equal(demoRequest(state, '/analytics/summary').total_revenue, initial.total_revenue + 420)
  assert.equal(demoRequest(state, '/analytics/summary').order_count, initial.order_count + 1)
})
test('moving average uses seven calendar days, including zero revenue', () => {
  const state = createDemoState(), series = demoRequest(state, `/analytics/moving-average?restaurant_id=${FIXTURES.restaurant}`).items
  assert.equal(series.length, 90)
  const i = 40
  const expected = Math.round(series.slice(i - 6, i + 1).reduce((sum, row) => sum + row.daily_revenue, 0) / 7 * 100) / 100
  assert.equal(series[i].moving_avg_7_day, expected)
  assert.ok(series.some((r) => r.daily_revenue === 0))
})
test('nearby driver results are ordered, active and within 5 km', () => {
  const state = createDemoState(), results = demoRequest(state, '/drivers/nearby?lat=17.3616&lng=78.4747&radius=5000').items
  assert.ok(results.length > 0)
  results.forEach((row, i) => { assert.ok(row.active); assert.ok(row.distance_meters <= 5000); if (i) assert.ok(row.distance_meters >= results[i - 1].distance_meters) })
  assert.equal(demoRequest(state, '/drivers/nearby?lat=0&lng=0&radius=5000').items.length, 0)
})
test('review facets agree with total and weighted average', () => {
  const state = createDemoState(), facet = demoRequest(state, `/restaurants/${FIXTURES.restaurant}/reviews/analytics`)
  const buckets = facet.rating_distribution, overall = facet.overall_average_rating[0]
  assert.equal(buckets.reduce((s,r) => s + r.count, 0), overall.total_reviews)
  assert.equal(Math.round(buckets.reduce((s,r) => s + r.rating * r.count, 0) / overall.total_reviews * 100) / 100, overall.average_rating)
})
