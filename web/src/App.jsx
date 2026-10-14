import { useCallback, useEffect, useState } from 'react'
import { Brand, Icon, Avatar, Notice } from './components/ui'
import { DEMO_MODE, itemsOf, resetDemo } from './lib/api'
import { FIXTURES } from './lib/demo'
import { useResource } from './lib/hooks'
import { money } from './lib/format'
import Browse from './pages/Browse'
import Checkout from './pages/Checkout'
import Audit from './pages/Audit'
import Analytics from './pages/Analytics'
import Drivers from './pages/Drivers'
import Reviews from './pages/Reviews'
import './App.css'

const navigation = [
  { id: 'browse', name: 'Browse', icon: 'grid', group: 'WORKSPACE' },
  { id: 'checkout', name: 'Place an order', icon: 'bag' },
  { id: 'audit', name: 'Wallet audit', icon: 'wallet' },
  { id: 'analytics', name: 'Revenue analytics', icon: 'chart', group: 'INSIGHTS & OPERATIONS' },
  { id: 'drivers', name: 'Live drivers', icon: 'pin', live: true },
  { id: 'reviews', name: 'Reviews & menus', icon: 'star' },
]
const currentPage = () => navigation.some((n) => n.id === window.location.hash.slice(1)) ? window.location.hash.slice(1) : 'browse'
export default function App() {
  const [page, setPage] = useState(currentPage)
  const [revision, setRevision] = useState(0)
  const [actorId, setActorId] = useState(FIXTURES.rich)
  const [restaurantId, setRestaurantId] = useState(FIXTURES.restaurant)
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState('')
  const usersResource = useResource('/users?page=1&limit=50', revision)
  const restaurantsResource = useResource('/restaurants?page=1&limit=50', revision)
  const userResource = useResource(`/users/${actorId}`, revision)
  const users = itemsOf(usersResource.data), restaurants = itemsOf(restaurantsResource.data)
  const update = useCallback((message) => { setRevision((r) => r + 1); if (message) setToast(message) }, [])
  useEffect(() => { const changed = () => { setPage(currentPage()); setMenuOpen(false) }; window.addEventListener('hashchange', changed); return () => window.removeEventListener('hashchange', changed) }, [])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 5000); return () => clearTimeout(timer) }, [toast])
  const go = (id, restaurant) => { if (restaurant) setRestaurantId(restaurant); window.location.hash = id; setPage(id); setMenuOpen(false) }
  const shared = { revision, update, actorId, user: userResource.data, userResource, restaurantId, setRestaurantId, restaurants, restaurantsResource, go }
  const Component = { browse: Browse, checkout: Checkout, audit: Audit, analytics: Analytics, drivers: Drivers, reviews: Reviews }[page]
  return <div className="app-shell">
    {menuOpen && <button className="sidebar-overlay" aria-label="Close navigation" onClick={() => setMenuOpen(false)}/>}
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}><Brand/><div className="workspace-tag"><span className="workspace-dot"/> Hyderabad workspace <Icon name="down" size={13}/></div><nav aria-label="Main navigation">{navigation.map((item) => <div key={item.id}>{item.group && <div className="nav-group">{item.group}</div>}<a href={`#${item.id}`} className={`nav-link ${page === item.id ? 'active' : ''}`} aria-current={page === item.id ? 'page' : undefined}><Icon name={item.icon}/><span>{item.name}</span>{item.live && <span className="live-dot"/>}</a></div>)}</nav><div className="sidebar-bottom"><div className="sidebar-note"><span className="sidebar-note-icon"><Icon name="layers" size={21}/></span><h3>A little data. A lot of possibility.</h3><p>One workspace for orders, insights and everything in between.</p><div className="sidebar-note-line"/></div><div className="connection"><span className={`live-dot ${DEMO_MODE ? 'orange' : ''}`}/><div><b>{DEMO_MODE ? 'Demo workspace' : 'API workspace'}</b><small>{DEMO_MODE ? 'Local sample · saved on this device' : 'Connected to your backend'}</small></div></div><span className="sidebar-footer">BiteStream <span>TEAM 09</span></span></div></aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Icon name="menu"/></button><span>Workspace</span><Icon name="chevron" size={14}/><b>{navigation.find((n) => n.id === page)?.name}</b></div><div className="topbar-right"><span className="location"><Icon name="pin" size={15}/> Hyderabad, IN</span><span className="topbar-divider"/><div className="actor-control"><Avatar name={userResource.data?.name || 'Demo User'} color={1}/><div><label htmlFor="actor">ACTING AS</label><select id="actor" value={actorId} aria-label="Switch demo user" onChange={(e) => setActorId(e.target.value)} disabled={usersResource.loading || !!usersResource.error}>{!users.some((u) => u.id === actorId) && <option value={actorId}>Select a user</option>}{users.map((u) => <option value={u.id} key={u.id}>{u.name}</option>)}</select></div><Icon name="down" size={14}/></div></div></header>
    <main id="main-content"><div className="mode-strip"><span><span className={`live-dot ${DEMO_MODE ? 'orange' : ''}`}/>{DEMO_MODE ? 'DEMO DATA' : 'API DATA'}<span className="mode-strip-description">{DEMO_MODE ? 'Explore the workflows with an illustrative sample of the documented seed data.' : 'All workflows use the configured BiteStream API.'}</span></span>{DEMO_MODE && <button onClick={() => { resetDemo(); update('Demo data reset. You’re ready for a fresh run.') }}>Reset demo <Icon name="refresh" size={13}/></button>}</div>{usersResource.error && <Notice type="error">The user switcher is unavailable. {usersResource.error.message} <button className="text-button" onClick={usersResource.reload}>Retry</button></Notice>}<Component key={`${page}:${actorId}`} {...shared}/><footer className="content-footer"><span>Made for good food. Built for smooth operations.</span><span><span className="footer-dot"/>BiteStream · {new Date().getFullYear()}</span></footer></main></div>
    {toast && <div className="toast" role="status"><span><Icon name="check" size={17}/></span>{toast}<button aria-label="Dismiss notification" onClick={() => setToast('')}><Icon name="close" size={16}/></button></div>}
    <div className="sr-only" aria-live="polite">{userResource.data ? `Current wallet balance ${money(userResource.data.wallet_balance)}` : ''}</div>
  </div>
}
