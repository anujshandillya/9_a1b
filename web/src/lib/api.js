import { createDemoState, demoRequest } from './demo'

export const DEMO_MODE = import.meta.env.VITE_DATA_MODE !== 'api'
const STORAGE_KEY = 'bitestream-demo-v1'
let demo
function getDemo() {
  if (!demo) {
    try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (saved?.version === 1 && Array.isArray(saved.users) && Array.isArray(saved.orders) && Array.isArray(saved.audit) && saved.snapshot && Array.isArray(saved.restaurants)) demo = saved } catch { /* Private mode or invalid saved state: use fresh fixtures. */ }
    demo ||= createDemoState()
  }
  return demo
}
export const query = (values = {}) => new URLSearchParams(Object.entries(values).filter(([, value]) => value !== '' && value != null)).toString()
const friendlyErrors = {
  '23505': 'You already have an active order. Complete it in Browse → Orders before placing another.',
  P0001: 'Your wallet has insufficient balance. Choose a smaller amount or switch users.',
  '23503': 'The selected customer or restaurant no longer exists. Refresh and choose again.',
  '22023': 'Enter a valid positive order amount.',
  '23514': 'The order cannot be placed with the current wallet balance.',
  '40001': 'Another request changed this wallet. Refresh the balance and try again.',
}
export async function request(path, { method = 'GET', body, signal } = {}) {
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 180))
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const result = demoRequest(getDemo(), path, method, body)
    if (method !== 'GET') { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(demo)) } catch { /* Demo still works in memory when storage is unavailable. */ } }
    return structuredClone(result)
  }
  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
  let response
  try { response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal }) }
  catch (error) { if (error.name === 'AbortError') throw error; throw new Error('Unable to reach the BiteStream API. Check the server connection and try again.', { cause: error }) }
  let data
  try { data = await response.json() } catch { throw new Error('The server returned an unreadable response. Please try again.') }
  if (!response.ok) throw Object.assign(new Error(friendlyErrors[data.error_code] || data.message || 'Something went wrong. Please try again.'), { error_code: data.error_code })
  return data
}
export function resetDemo() { localStorage.removeItem(STORAGE_KEY); demo = createDemoState() }
export const itemsOf = (data) => Array.isArray(data) ? data : data?.items || []
