import { useEffect, useRef } from 'react'
import { initials, money, number } from '../lib/format'

const paths = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  bag: 'M6 7h12l2 14H4L6 7z M9 8V6a3 3 0 0 1 6 0v2',
  wallet: 'M20 8V5H4a2 2 0 0 0 0 4h17v11H4a2 2 0 0 1-2-2V7 M21 12h-6v5h6 M17 14.5h.1',
  chart: 'M3 3v18h18 M7 15l4-5 4 3 5-7',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3z',
  search: 'M15.5 15.5 21 21 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  chevron: 'm9 5 7 7-7 7',
  down: 'm6 9 6 6 6-6',
  plus: 'M12 5v14 M5 12h14',
  refresh: 'M20 7v5h-5 M4 17v-5h5 M5 8a8 8 0 0 1 13-3l2 3 M19 16a8 8 0 0 1-13 3l-2-3',
  check: 'm5 12 4 4L19 6',
  clock: 'M12 7v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M17 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87',
  store: 'M3 9h18l-2-6H5L3 9z M4 9v12h16V9 M9 21v-8h6v8 M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0',
  filter: 'M4 7h16 M7 12h10 M10 17h4',
  info: 'M12 11v6 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  close: 'm6 6 12 12 M6 18 18 6',
  truck: 'M3 6h12v12H3z M15 10h4l3 4v4h-7 M8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  globe: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M2 12h20 M12 2c5 5 5 15 0 20-5-5-5-15 0-20',
  layers: 'm12 3 10 5-10 5L2 8l10-5z M2 12l10 5 10-5 M2 16l10 5 10-5',
  leaf: 'M20 3C7 2 2 10 7 17c7 7 15 2 13-14z M4 21 16 9',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  lock: 'M5 10h14v11H5z M8 10V6a4 4 0 1 1 8 0v4',
  target: 'M12 2v4 M12 18v4 M2 12h4 M18 12h4 M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
}
export function Icon({ name, size = 20, ...props }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.grid} /></svg> }
export function Brand({ small = false }) { return <div className={`brand ${small ? 'small' : ''}`}><span className="brand-mark"><svg viewBox="0 0 32 32" width="26" height="26" fill="none" aria-hidden="true"><path d="M10 4v7m4-7v7m-8-7v7c0 4 8 4 8 0M10 15v13M23 4c-5 4-5 11 0 12V4Zm0 12v12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg></span><span>Bite<span className="brand-light">Stream</span><small>FOOD & LOGISTICS</small></span></div> }
export function Badge({ status, children }) { return <span className={`badge ${String(status || '').toLowerCase()}`}><span className="badge-dot"/>{children || { PREPARING: 'Preparing', DELIVERING: 'Delivering', DELIVERED: 'Delivered', DEBIT: 'Debit', CREDIT: 'Credit' }[status] || status}</span> }
export function Avatar({ name, color = 0 }) { return <span className={`avatar avatar-${color % 5}`}>{initials(name)}</span> }
export function FoodThumb({ index = 0, large = false }) {
  const colors = ['#eeb374', '#e3ac77', '#aac997', '#edba8a', '#bf9272', '#dfc699', '#a4bfac', '#ddabba']
  return <div className={`food-thumb ${large ? 'large' : ''}`} style={{ background: colors[index % 8] }}><svg viewBox="0 0 80 80" aria-hidden="true"><ellipse cx="41" cy="58" rx="28" ry="10" fill="#000" opacity=".1"/><circle cx="40" cy="38" r="29" fill="#faf5e9"/><circle cx="40" cy="38" r="24" fill={index % 4 === 2 ? '#b8cb81' : '#ddb267'}/>{index % 4 === 3 ? <><circle cx="40" cy="38" r="22" fill="#d07c40"/><circle cx="40" cy="38" r="19" fill="#efc77c"/><path d="m40 38 1-19m-1 19 17 11m-17-11-18 12" stroke="#d59152" strokeWidth="2"/>{[[33,27],[50,32],[38,50],[26,42],[52,47]].map(([x,y])=><circle key={x} cx={x} cy={y} r="4" fill="#c25135"/>)}</> : <>{Array.from({length:16},(_,i)=><rect key={i} x={23 + (i * 13 % 33)} y={23 + (i * 7 % 29)} width="8" height="3" rx="1.5" fill={i % 3 ? '#f3d695' : '#f8efc7'} transform={`rotate(${i * 37} ${25 + (i * 13 % 33)} ${25 + (i * 7 % 29)})`}/>)}<path d="M28 38c0-13 16-18 20-8s9 7 7 14-17 11-21 4-6-5-6-10" fill={index % 4 === 2 ? '#588750' : '#b76c39'}/></>}<path d="m31 31 5-6 3 7-8-1m13 13 6-5 2 6-8-1m-8 11 5-5 1 6-6-1" fill="#4d8050"/><path d="M65 13 61 42" stroke="#f6f1e8" strokeWidth="3" strokeLinecap="round"/></svg></div>
}
export function PageHeader({ eyebrow, title, description, actions }) { return <header className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div><div className="page-actions">{actions}</div></header> }
export function Stat({ label, value, icon, note, accent }) { return <div className={`stat-card ${accent ? 'accent' : ''}`}><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon name={icon}/></span></div><strong>{value}</strong><div className="stat-note">{note}</div></div> }
export function Panel({ title, description, action, children, className = '' }) { return <section className={`panel ${className}`}><div className="panel-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>{children}</section> }
export function ResourceState({ resource, empty, emptyTitle = 'Nothing here yet', emptyText = 'Try changing your search or filters.' }) {
  if (resource.loading) return <div className="resource-state" role="status"><span className="spinner"/><h3>Getting things ready…</h3><p>Loading your BiteStream data.</p></div>
  if (resource.error) return <div className="resource-state error" role="alert"><Icon name="info" size={28}/><h3>We couldn’t load this</h3><p>{resource.error.message}</p><button className="button secondary" onClick={resource.reload}><Icon name="refresh" size={16}/>Try again</button></div>
  if (empty) return <div className="resource-state"><span className="empty-icon"><Icon name="search" size={26}/></span><h3>{emptyTitle}</h3><p>{emptyText}</p></div>
  return null
}
export function Pagination({ page, total, limit = 8, onChange }) {
  const pages = Math.max(1, Math.ceil(total / limit))
  return <div className="pagination"><span>Showing <b>{total ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)}</b> of <b>{number(total)}</b> results</span><div><button aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}><Icon name="chevron" className="rotate" size={15}/></button>{Array.from(new Set([1, page - 1, page, page + 1, pages].filter((p) => p > 0 && p <= pages))).map((p, i, a) => <span key={p}>{i > 0 && p - a[i - 1] > 1 && <span className="pagination-gap">…</span>}<button className={page === p ? 'current' : ''} aria-label={`Page ${p}`} aria-current={page === p ? 'page' : undefined} onClick={() => onChange(p)}>{p}</button></span>)}<button aria-label="Next page" disabled={page >= pages} onClick={() => onChange(page + 1)}><Icon name="chevron" size={15}/></button></div></div>
}
export function Modal({ title, onClose, children }) {
  const dialog = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.focus()
    const keydown = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab') {
        const elements = dialog.current?.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')
        if (!elements?.length) return
        if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements[elements.length - 1].focus() }
        else if (!event.shiftKey && document.activeElement === elements[elements.length - 1]) { event.preventDefault(); elements[0].focus() }
      }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener('keydown', keydown); previous?.focus() }
  }, [onClose])
  return <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}><div className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={dialog}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" aria-label="Close details" onClick={onClose}><Icon name="close"/></button></div>{children}</div></div>
}
export function Notice({ children, type = 'info' }) { return <div className={`notice ${type}`} role={type === 'error' ? 'alert' : 'status'}><Icon name={type === 'success' ? 'check' : 'info'} size={18}/><div>{children}</div></div> }
export function RestaurantSelect({ restaurants, value, onChange, id = 'restaurant-select' }) { return <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={!restaurants.length}>{restaurants.length ? restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>) : <option>Restaurants unavailable</option>}</select> }
export function BalanceCard({ user }) { return <div className="balance-card"><div><Icon name="wallet"/><span>Available wallet balance</span></div><strong>{money(user?.wallet_balance)}</strong><span>{user?.name || 'Select a customer'}</span><div className="balance-decoration"><span/><span/><span/></div></div> }
