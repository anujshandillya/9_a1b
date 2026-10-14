import { createDemoState, demoRequest } from './demo.js'
import { apiError, normalizeResponse } from './contracts.js'

const env = import.meta.env || {}
export const DEMO_MODE = env.VITE_DATA_MODE === 'demo'
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
export async function request(path, { method = 'GET', body, signal } = {}) {
  if (DEMO_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 180))
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    let result
    try { result = demoRequest(getDemo(), path, method, body) } catch (error) { throw apiError(error) }
    if (method !== 'GET') { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(demo)) } catch { /* Demo still works in memory when storage is unavailable. */ } }
    return normalizeResponse(path, structuredClone(result))
  }
  const base = (env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
  let response
  try { response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal }) }
  catch (error) { if (error.name === 'AbortError') throw error; throw new Error('Unable to reach the BiteStream API. Check the server connection and try again.', { cause: error }) }
  let data
  try { data = await response.json() } catch { throw new Error('The server returned an unreadable response. Please try again.') }
  if (!response.ok) throw apiError(data)
  return normalizeResponse(path, data)
}
export function resetDemo() { localStorage.removeItem(STORAGE_KEY); demo = createDemoState() }
export const itemsOf = (data) => Array.isArray(data) ? data : data?.items || []
