// A bounded, illustrative dataset using the contract in AI.md. Never a DB fallback.
export const FIXTURES = {
  rich: '00000000-0000-4000-8000-000000000001',
  low: '00000000-0000-4000-8000-000000000002',
  active: '00000000-0000-4000-8000-000000000003',
  restaurant: '00000000-0000-4000-8000-0000000000a1',
}
const uuid = (n, prefix = '10000000') => `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`
const restaurantNames = ['Demo Restaurant (Charminar)', 'Paradise Kitchen', 'The Green Bowl', 'Oven & Crust', 'Deccan Spice Co.', 'Chutney Stories', 'Wok Republic', 'Sweet Theory', 'The Breakfast Club', 'Nizam’s Table', 'Little Italy Kitchen', 'Dosa District', 'Biryani House', 'Tandoor & Co.', 'Garden Kitchen', 'Slice Society', 'Spice Route', 'Café Tamarind', 'Dragon Bowl', 'Sugar Studio', 'Morning Ritual', 'The Curry Room', 'Pasta Project', 'Idli & More']
const people = ['Aarav Sharma', 'Diya Patel', 'Arjun Reddy', 'Ananya Rao', 'Vihaan Mehta', 'Ishaan Kapoor', 'Sana Khan', 'Aditya Nair', 'Meera Iyer', 'Rohan Gupta', 'Kavya Menon']
const areas = ['Charminar', 'Secunderabad', 'Banjara Hills', 'Jubilee Hills', 'Gachibowli', 'Madhapur']
const cuisines = ['Hyderabadi', 'Biryani', 'Healthy', 'Italian', 'North Indian', 'South Indian', 'Chinese', 'Desserts']
const dateAgo = (days, hour = 12) => { const date = new Date(); date.setDate(date.getDate() - days); date.setHours(hour, 20, 0, 0); return date.toISOString() }
const round = (n) => Math.round(n * 100) / 100
export function createDemoState() {
  const restaurants = restaurantNames.map((name, i) => ({ id: i === 0 ? FIXTURES.restaurant : uuid(i + 1, '20000000'), name, latitude: 17.3616 + (i % 6) * .004, longitude: 78.4747 + Math.floor(i / 6) * .006, area: areas[i % areas.length], cuisine: cuisines[i % cuisines.length] }))
  const users = Array.from({ length: 36 }, (_, i) => ({ id: i < 3 ? Object.values(FIXTURES)[i] : uuid(i + 1), name: i < 3 ? ['Demo User (Rich Wallet)', 'Demo User (Low Balance)', 'Demo User (Active Order)'][i] : `${people[(i - 3) % people.length]}${i > 13 ? ` ${Math.floor(i / 11)}` : ''}`, wallet_balance: i === 0 ? 44600 : i === 1 ? 45 : 2400 + i * 170 }))
  const orders = [], audit = []
  users.forEach((user, u) => {
    const events = []
    for (let j = 0; j < 24; j++) {
      const restaurant = restaurants[(u * 7 + j) % restaurants.length]
      const order = { id: uuid(u * 24 + j + 1, '30000000'), user_id: user.id, restaurant_id: restaurant.id, total_amount: 180 + (u * 37 + j * 53) % 680, status: 'DELIVERED', created_at: dateAgo(88 - j * 3 - (u % 3), 10 + j % 10) }
      orders.push(order)
      events.push({ id: uuid(u * 30 + j + 1, '40000000'), user_id: user.id, amount_changed: order.total_amount, action_type: 'DEBIT', timestamp: order.created_at, order_id: order.id })
    }
    for (let j = 0; j < 2; j++) events.push({ id: uuid(u * 30 + 25 + j, '40000000'), user_id: user.id, amount_changed: 3000, action_type: 'CREDIT', timestamp: dateAgo(66 - j * 33) })
    if (u === 2) {
      const order = { id: uuid(9999, '30000000'), user_id: user.id, restaurant_id: restaurants[0].id, total_amount: 420, status: 'PREPARING', created_at: new Date().toISOString() }
      orders.push(order)
      events.push({ id: uuid(9999, '40000000'), user_id: user.id, amount_changed: 420, action_type: 'DEBIT', timestamp: order.created_at, order_id: order.id })
    }
    events.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    let balance = user.wallet_balance
    for (let j = events.length - 1; j >= 0; j--) { events[j].balance_after = round(balance); events[j].running_balance = round(balance); balance += events[j].action_type === 'DEBIT' ? events[j].amount_changed : -events[j].amount_changed }
    audit.push(...events)
  })
  const state = { version: 1, users, restaurants, orders, audit, last_refreshed: new Date().toISOString() }
  state.snapshot = summarize(state)
  return state
}
function summarize(state) {
  const completed = state.orders.filter((o) => o.status === 'DELIVERED')
  return { total_revenue: round(completed.reduce((sum, o) => sum + o.total_amount, 0)), order_count: completed.length, restaurant_count: state.restaurants.length, active_orders: state.orders.length - completed.length }
}
const fail = (error_code, message) => { throw Object.assign(new Error(message), { error_code }) }
export function checkout(state, { user_id, restaurant_id, amount }) {
  const value = Number(amount), user = state.users.find((u) => u.id === user_id)
  if (!Number.isFinite(value) || value <= 0 || value > 99999999.99 || round(value) !== value) fail('22023', 'Enter a positive amount with up to two decimal places.')
  if (!user || !state.restaurants.some((r) => r.id === restaurant_id)) fail('23503', 'Choose a valid customer and restaurant.')
  if (state.orders.some((o) => o.user_id === user_id && o.status !== 'DELIVERED')) fail('23505', 'You already have an active order. Complete it in Browse → Orders before placing another.')
  if (user.wallet_balance < value) fail('P0001', 'Your wallet balance is too low for this order. Choose a smaller amount or switch to the Rich Wallet demo user.')
  const balance_before = user.wallet_balance, timestamp = new Date().toISOString()
  const order = { id: globalThis.crypto.randomUUID(), user_id, restaurant_id, total_amount: value, status: 'PREPARING', created_at: timestamp }
  const balance_after = round(balance_before - value)
  const audit_entry = { id: globalThis.crypto.randomUUID(), user_id, amount_changed: value, action_type: 'DEBIT', balance_after, running_balance: balance_after, timestamp, order_id: order.id }
  user.wallet_balance = balance_after
  state.orders.push(order); state.audit.push(audit_entry)
  return { order, balance_before, balance_after, audit_entry }
}
export function advance(state, id) {
  const order = state.orders.find((o) => o.id === id)
  if (!order) fail('23503', 'This order could not be found.')
  if (order.status === 'DELIVERED') fail('22023', 'This order is already delivered.')
  order.status = order.status === 'PREPARING' ? 'DELIVERING' : 'DELIVERED'
  return { ...order }
}
const pageOf = (items, p) => ({ items: items.slice(((Number(p.page) || 1) - 1) * (Number(p.limit) || 8), (Number(p.page) || 1) * (Number(p.limit) || 8)), total: items.length })
function menuFor(restaurant) {
  const names = restaurant.cuisine === 'Italian' ? ['Margherita Pizza', 'Roasted vegetable pasta', 'Garlic bread'] : ['Chicken Biryani', 'Paneer Tikka', 'Veg Biryani']
  return { _id: `menu-${restaurant.id}`, restaurant_id: restaurant.id, restaurant_name: restaurant.name, updated_at: dateAgo(1), categories: [{ name: 'House favourites', items: names.map((name, i) => ({ item_id: `${restaurant.id}-${i}`, name, description: ['Slow cooked, aromatic and made fresh to order.', 'A house favourite with fresh herbs and spices.', 'Seasonal vegetables with our signature seasoning.'][i], price: [320, 240, 260][i], available: true, dietary_tags: i ? ['vegetarian'] : [], customization_addons: [{ name: 'Extra portion', price: 80 }, { name: 'Raita', price: 40 }] })) }, { name: 'Something sweet', items: [{ item_id: `${restaurant.id}-dessert`, name: 'Gulab Jamun', description: 'Two warm dumplings in cardamom syrup.', price: 90, available: true, dietary_tags: ['vegetarian'], customization_addons: [] }, { item_id: `${restaurant.id}-drink`, name: 'Fresh Lime Soda', description: 'Fresh lime, soda and a little fizz.', price: 70, available: false, customization_addons: [] }] }] }
}
function series(state, id) {
  return Array.from({ length: 90 }, (_, i) => {
    const date = dateAgo(89 - i).slice(0, 10)
    const daily_revenue = state.orders.filter((o) => o.restaurant_id === id && o.status === 'DELIVERED' && o.created_at.slice(0, 10) === date).reduce((s, o) => s + o.total_amount, 0)
    return { restaurant_id: id, revenue_date: date, daily_revenue }
  }).map((row, i, rows) => ({ ...row, moving_avg_7_day: round(rows.slice(Math.max(0, i - 6), i + 1).reduce((s, r) => s + r.daily_revenue, 0) / Math.min(7, i + 1)) }))
}
export function demoRequest(state, path, method = 'GET', body) {
  const url = new URL(path, 'http://demo.local'), p = Object.fromEntries(url.searchParams), route = url.pathname.replace(/^\/api/, '')
  const decorated = (order) => ({ ...order, user_name: state.users.find((u) => u.id === order.user_id)?.name, restaurant_name: state.restaurants.find((r) => r.id === order.restaurant_id)?.name })
  if (route === '/checkout' && method === 'POST') return checkout(state, body)
  if (/^\/orders\/[^/]+\/advance$/.test(route) && method === 'POST') return advance(state, route.split('/')[2])
  if (route === '/analytics/summary') return { ...state.snapshot, last_refreshed: state.last_refreshed }
  if (route === '/analytics/refresh' && method === 'POST') { state.snapshot = summarize(state); state.last_refreshed = new Date().toISOString(); return { last_refreshed: state.last_refreshed } }
  if (route === '/analytics/moving-average') return { items: series(state, p.restaurant_id || state.restaurants[0].id) }
  if (route === '/analytics/ranking') {
    let rank = 0, previous
    const items = state.restaurants.map((r) => ({ restaurant_id: r.id, restaurant_name: r.name, period_revenue: series(state, r.id).reduce((s, row) => s + row.daily_revenue, 0) })).sort((a, b) => b.period_revenue - a.period_revenue).map((r) => { if (r.period_revenue !== previous) rank++; previous = r.period_revenue; return { ...r, revenue_rank: rank } })
    return pageOf(items, p)
  }
  if (route === '/drivers/nearby') {
    const lat = Number(p.lat), lng = Number(p.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) fail('22023', 'Enter valid latitude and longitude coordinates.')
    const base = state.restaurants[0]
    const epoch = Math.floor(Date.now() / 10000)
    const candidates = Array.from({ length: 12 }, (_, i) => {
      const latitude = base.latitude + Math.sin(i * 2.4 + epoch * .02) * .006 * (i + 1), longitude = base.longitude + Math.cos(i * 2.4 + epoch * .02) * .005 * (i + 1)
      const distance_meters = Math.hypot((lat - latitude) * 111320, (lng - longitude) * 111320 * Math.cos(lat * Math.PI / 180))
      return { _id: `ping-${i}-${epoch}`, driver_id: 101 + i * 79, active: true, location: { type: 'Point', coordinates: [longitude, latitude] }, distance_meters: Math.round(distance_meters), created_at: new Date(Date.now() - (i * 4 + 2) * 1000).toISOString() }
    }).filter((d) => d.distance_meters <= 5000).sort((a, b) => a.distance_meters - b.distance_meters).slice(0, 10)
    return { items: candidates }
  }
  const userAudit = route.match(/^\/users\/([^/]+)\/audit$/)
  if (userAudit) return pageOf(state.audit.filter((a) => a.user_id === userAudit[1] && (!p.from || a.timestamp.slice(0, 10) >= p.from) && (!p.to || a.timestamp.slice(0, 10) <= p.to)).sort((a, b) => b.timestamp.localeCompare(a.timestamp)), p)
  const reviewRoute = route.match(/^\/restaurants\/([^/]+)\/reviews\/analytics$/)
  if (reviewRoute) {
    const index = state.restaurants.findIndex((r) => r.id === reviewRoute[1]); if (index < 0) fail('23503', 'Restaurant not found.')
    const rating_distribution = [25, 32, 67, 174, 252].map((count, i) => ({ rating: i + 1, count: count + index * 3 }))
    const total_reviews = rating_distribution.reduce((s, r) => s + r.count, 0)
    return { rating_distribution, most_frequent_tags: ['tasty', 'fast delivery', 'good packaging', 'fresh', 'value for money', 'spicy'].map((tag, i) => ({ tag, count: 240 - i * 29 + index })), overall_average_rating: [{ average_rating: round(rating_distribution.reduce((s, r) => s + r.rating * r.count, 0) / total_reviews), total_reviews }] }
  }
  const menuRoute = route.match(/^\/restaurants\/([^/]+)\/menu$/)
  if (menuRoute) { const restaurant = state.restaurants.find((r) => r.id === menuRoute[1]); if (!restaurant) fail('23503', 'Restaurant not found.'); return menuFor(restaurant) }
  if (['/users', '/restaurants', '/orders'].includes(route)) {
    let items = route === '/users' ? state.users : route === '/restaurants' ? state.restaurants : state.orders.map(decorated).sort((a, b) => b.created_at.localeCompare(a.created_at))
    if (p.q) items = items.filter((row) => [row.name, row.user_name, row.restaurant_name, row.id, row.area, row.cuisine].some((value) => String(value || '').toLowerCase().includes(p.q.toLowerCase())))
    if (p.status) items = items.filter((o) => o.status === p.status)
    if (p.user_id) items = items.filter((o) => o.user_id === p.user_id)
    if (p.restaurant_id) items = items.filter((o) => o.restaurant_id === p.restaurant_id)
    return pageOf(items, p)
  }
  const detail = route.match(/^\/(users|restaurants|orders)\/([^/]+)$/)
  if (detail) {
    const record = state[detail[1]].find((r) => r.id === detail[2]); if (!record) fail('23503', 'Record not found.')
    if (detail[1] === 'users') return { ...record, recent_orders: state.orders.filter((o) => o.user_id === record.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5).map(decorated) }
    if (detail[1] === 'restaurants') return { ...record, menu: menuFor(record) }
    return decorated(record)
  }
  fail('404', 'This endpoint is not available.')
}
