import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash } from '@phosphor-icons/react'
import { api, money } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { ErrorNote, Skeleton } from '../components/ui'

export function Totals({ cart }) {
  const row = (label, cents, strong) => (
    <div className={`flex justify-between ${strong ? 'border-t border-zinc-200 pt-3 text-base font-semibold dark:border-zinc-800' : 'text-sm text-zinc-600 dark:text-zinc-400'}`}>
      <span>{label}</span><span>{cents === 0 && !strong ? 'Free' : money(cents, cart.currency)}</span>
    </div>
  )
  return <div className="grid gap-2">{row('Subtotal', cart.subtotal_cents)}{row('Shipping', cart.shipping_cents)}{row('Total', cart.total_cents, true)}</div>
}

export default function CartPage() {
  const { data, error, loading, reload, setData } = useFetch('/cart')
  const [actionError, setActionError] = useState(null)

  const mutate = (promise) => promise.then(setData).then(() => setActionError(null)).catch(setActionError)
  const setQty = (id, quantity) => mutate(api(`/cart/items/${id}`, { method: 'PUT', body: { quantity } }))
  const remove = (id) => mutate(api(`/cart/items/${id}`, { method: 'DELETE' }))

  if (loading && !data) return <div className="grid gap-4"><Skeleton className="h-8 w-40" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
  if (error) return <ErrorNote error={error} onRetry={reload} />

  const cart = data.data
  if (cart.items.length === 0) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <Link to="/" className="btn-primary mt-6">Browse the catalog</Link>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
      <section>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Cart</h1>
        <ErrorNote error={actionError} />
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {cart.items.map(({ product: p, quantity, line_total_cents }) => (
            <li key={p.id} className="grid grid-cols-[80px_1fr_auto] items-center gap-4 py-4">
              <img src={p.image_url} alt="" width="80" height="60" className="aspect-[4/3] rounded-lg object-cover" />
              <div className="min-w-0">
                <Link to={`/products/${p.slug}`} className="font-medium hover:underline">{p.name}</Link>
                <div className="mt-2 flex items-center gap-2">
                  <label className="sr-only" htmlFor={`qty-${p.id}`}>Quantity for {p.name}</label>
                  <select id={`qty-${p.id}`} value={quantity} onChange={(e) => setQty(p.id, Number(e.target.value))} className="field w-20 py-1.5">
                    {Array.from({ length: Math.max(quantity, Math.min(p.stock, 10)) }, (_, i) => <option key={i + 1}>{i + 1}</option>)}
                  </select>
                  <button onClick={() => remove(p.id)} className="btn-ghost px-2.5 py-1.5" aria-label={`Remove ${p.name}`}><Trash size={16} /></button>
                </div>
              </div>
              <span className="text-sm font-medium">{money(line_total_cents, cart.currency)}</span>
            </li>
          ))}
        </ul>
      </section>
      <aside className="grid h-fit gap-5 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <Totals cart={cart} />
        <Link to="/checkout" className="btn-primary">Checkout</Link>
      </aside>
    </div>
  )
}
