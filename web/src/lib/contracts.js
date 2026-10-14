// Adapt the API's response shapes at the boundary so screens use one contract.
export function normalizeResponse(path, data) {
  const route = path.split('?')[0]
  if (route === '/analytics/summary') return {
    ...data,
    order_count: data.total_orders ?? data.order_count ?? 0,
    restaurant_count: data.restaurants ?? data.restaurant_count ?? 0,
  }
  if (route === '/analytics/moving-average') return {
    ...data,
    items: (data.series ?? data.items ?? []).map((row) => ({ ...row, revenue_date: row.date ?? row.revenue_date })),
  }
  if (/^\/restaurants\/[^/]+\/reviews\/analytics$/.test(route)) {
    const facet = Array.isArray(data) ? data[0] || {} : data
    return {
      ...facet,
      most_frequent_tags: facet.top_tags ?? facet.most_frequent_tags ?? [],
      overall_average_rating: facet.total_reviews != null
        ? [{ average_rating: facet.average_rating, total_reviews: facet.total_reviews }]
        : facet.overall_average_rating ?? [],
    }
  }
  if (route === '/drivers/nearby') return {
    ...data,
    items: (data.items ?? []).map((driver) => ({
      ...driver,
      location: driver.location ?? { type: 'Point', coordinates: [Number(driver.lng), Number(driver.lat)] },
      distance_meters: Number(driver.distance_m ?? driver.distance_meters ?? driver.dist?.calculated ?? 0),
    })),
  }
  return data
}

const friendlyErrors = {
  ACTIVE_ORDER_EXISTS: 'You already have an active order. Complete it in Browse → Orders before placing another.',
  INSUFFICIENT_BALANCE: 'Your wallet has insufficient balance. Choose a smaller amount, top up, or switch users.',
  NOT_FOUND: 'The selected customer or restaurant no longer exists. Refresh and choose again.',
  INVALID_AMOUNT: 'Enter a positive amount with up to two decimal places.',
  CONCURRENT_UPDATE: 'Another request changed this wallet. Refresh the balance and try again.',
  MV_NOT_POPULATED: 'The revenue snapshot has not been populated. Press Refresh snapshot first.',
}
const sqlstateErrors = { '23505': 'ACTIVE_ORDER_EXISTS', P0001: 'INSUFFICIENT_BALANCE', '23503': 'NOT_FOUND', '22023': 'INVALID_AMOUNT', '23514': 'INSUFFICIENT_BALANCE', '40001': 'CONCURRENT_UPDATE', '40P01': 'CONCURRENT_UPDATE' }
export function apiError(data) {
  // Named API codes take priority: P0001 can also describe other database rules.
  const code = data.error_code || sqlstateErrors[data.sqlstate]
  return Object.assign(new Error(friendlyErrors[code] || friendlyErrors[sqlstateErrors[code]] || data.message || 'Something went wrong. Please try again.'), { error_code: data.error_code, sqlstate: data.sqlstate })
}

export function validAmount(value) {
  return /^\d+(\.\d{1,2})?$/.test(String(value)) && Number(value) > 0 && Number(value) <= 99999999.99
}
