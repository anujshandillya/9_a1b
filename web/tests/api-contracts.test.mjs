import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apiError, normalizeResponse, validAmount } from '../src/lib/contracts.js'
import { DEMO_MODE, request } from '../src/lib/api.js'
import { createDemoState, demoRequest, FIXTURES } from '../src/lib/demo.js'

test('live API is the default; moving average consumes series and date from api/main.py', () => {
  assert.equal(DEMO_MODE, false)
  const result = normalizeResponse('/analytics/moving-average?restaurant_id=r', {
    restaurant_id: 'r', series: [{ date: '2026-10-14', daily_revenue: '123.40', moving_avg_7_day: '17.63' }],
  })
  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].revenue_date, '2026-10-14')
  assert.equal(Number(result.items[0].moving_avg_7_day), 17.63)
})

test('summary uses actual materialized-view counts, including an unpopulated snapshot', () => {
  const result = normalizeResponse('/analytics/summary', { restaurants: 12, total_orders: 521, total_revenue: '108200.50', populated: true })
  assert.equal(result.restaurant_count, 12)
  assert.equal(result.order_count, 521)
  assert.equal(result.active_orders, undefined)
  const empty = normalizeResponse('/analytics/summary', { restaurants: 0, total_orders: 0, total_revenue: 0, populated: false })
  assert.equal(empty.populated, false)
  assert.equal(empty.order_count, 0)
})

test('flat review response supplies overall rating, distribution and top tags', () => {
  const result = normalizeResponse('/restaurants/r/reviews/analytics', {
    total_reviews: 3, average_rating: 4, rating_distribution: [{ rating: 4, count: 3 }], top_tags: [{ tag: 'tasty', count: 2 }],
  })
  assert.deepEqual(result.overall_average_rating, [{ average_rating: 4, total_reviews: 3 }])
  assert.equal(result.most_frequent_tags[0].tag, 'tasty')
  assert.equal(result.rating_distribution[0].count, 3)
  const empty = normalizeResponse('/restaurants/r/reviews/analytics', { total_reviews: 0, average_rating: null, rating_distribution: [], top_tags: [] })
  assert.equal(empty.overall_average_rating[0].total_reviews, 0)
})

test('flat driver coordinates and distance_m become map coordinates and metres', () => {
  const result = normalizeResponse('/drivers/nearby?lat=17&lng=78', {
    items: [{ driver_id: 'd', lng: 78.4747, lat: 17.3616, distance_m: 314, active: true }],
  })
  assert.deepEqual(result.items[0].location.coordinates, [78.4747, 17.3616])
  assert.equal(result.items[0].distance_meters, 314)
})

test('demo contracts remain compatible with the normalized UI', () => {
  const state = createDemoState()
  for (const path of ['/analytics/moving-average', '/drivers/nearby?lat=17.3616&lng=78.4747', `/restaurants/${FIXTURES.restaurant}/reviews/analytics`]) {
    const raw = demoRequest(state, path)
    const result = normalizeResponse(path, raw)
    if (path.includes('reviews')) assert.equal(result.overall_average_rating[0].total_reviews, 550)
    else assert.ok(result.items.length > 0)
  }
})

test('named API errors stay actionable without confusing other P0001 rules with insufficient funds', () => {
  assert.match(apiError({ error_code: 'ACTIVE_ORDER_EXISTS', sqlstate: '23505' }).message, /Browse/)
  assert.match(apiError({ error_code: 'INSUFFICIENT_BALANCE' }).message, /top up/)
  assert.match(apiError({ error_code: 'MV_NOT_POPULATED' }).message, /Refresh snapshot/)
  assert.equal(apiError({ error_code: 'DB_RULE_VIOLATION', sqlstate: 'P0001', message: 'A different rule failed.' }).message, 'A different rule failed.')
})

test('checkout accepts valid cents without floating point multiplication errors', () => {
  for (const amount of ['0.01', '0.29', '19.99', '420.00', '99999999.99']) assert.equal(validAmount(amount), true, amount)
  for (const amount of ['', '0', '-1', '1.001', 'NaN', 'Infinity', '100000000', '1e3']) assert.equal(validAmount(amount), false, amount)
})

test('top-up creates one credit and funds the chosen wallet; invalid requests change nothing', () => {
  const state = createDemoState(), count = state.audit.length
  const result = demoRequest(state, `/users/${FIXTURES.low}/topup`, 'POST', { amount: 500 })
  assert.equal(result.user.wallet_balance, 545)
  assert.equal(result.audit_entry.action_type, 'CREDIT')
  assert.equal(result.audit_entry.balance_after, 545)
  assert.equal(state.audit.length, count + 1)
  const before = JSON.stringify(state)
  assert.throws(() => demoRequest(state, `/users/${FIXTURES.low}/topup`, 'POST', { amount: -1 }))
  assert.equal(JSON.stringify(state), before)
})

test('request sends the expected method/body, adapts actual API data and propagates errors', async (t) => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options })
    if (url.endsWith('/checkout')) return new Response(JSON.stringify({ error_code: 'ACTIVE_ORDER_EXISTS', sqlstate: '23505' }), { status: 409 })
    return new Response(JSON.stringify({ total_orders: 42, restaurants: 7, total_revenue: 900 }))
  })
  assert.equal((await request('/analytics/summary')).order_count, 42)
  await assert.rejects(request('/checkout', { method: 'POST', body: { amount: 19.99 } }), { error_code: 'ACTIVE_ORDER_EXISTS', sqlstate: '23505' })
  assert.equal(calls[1].url, '/api/checkout')
  assert.equal(calls[1].options.method, 'POST')
  assert.equal(JSON.parse(calls[1].options.body).amount, 19.99)
})
