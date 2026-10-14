import { useState } from 'react'
import { request } from '../lib/api'
import { validAmount } from '../lib/contracts'
import { money } from '../lib/format'
import { Notice, Panel } from './ui'

export default function WalletTopUp({ actorId, update }) {
  const [amount, setAmount] = useState('500'), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [result, setResult] = useState(null)
  async function submit(event) {
    event.preventDefault()
    if (!validAmount(amount)) return
    setBusy(true); setError(''); setResult(null)
    try {
      const data = await request(`/users/${actorId}/topup`, { method: 'POST', body: { amount: Number(amount) } })
      setResult(data); update('Wallet topped up. A credit entry was recorded.')
    } catch (error) { setError(error.message) } finally { setBusy(false) }
  }
  return <Panel title="Top up this wallet" description="Add demo funds and record a wallet credit.">
    <form className="topup-form" onSubmit={submit}>
      <label className="form-field"><span>Top-up amount (INR)</span><input aria-label="Top-up amount" type="number" min="0.01" max="99999999.99" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)}/></label>
      <button className="button secondary" disabled={busy || !validAmount(amount)}>{busy ? 'Adding funds…' : 'Add funds'}</button>
      {error && <Notice type="error">{error}</Notice>}
      {result && <Notice type="success">Wallet balance: {money(result.user.wallet_balance)}. Credit recorded: {money(result.audit_entry.amount_changed)}.</Notice>}
    </form>
  </Panel>
}
