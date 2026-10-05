import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { api, money } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { ErrorNote, Skeleton, StatusBadge } from '../components/ui'

export default function OrderPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const returnedFromStripe = params.get('checkout') === 'success'
  const { data, error, loading, reload, setData } = useFetch(`/orders/${id}`)
  const [busy, setBusy] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [localMode, setLocalMode] = useState(false)
  const order = data?.data

  // Stripe confirms through a webhook, a few seconds after the redirect back: poll until it lands.
  // ponytail: polling every 3s for at most a minute; push (SSE/WebSocket) when status changes need to be instant
  useEffect(() => {
    if (!returnedFromStripe || order?.status !== 'pending') return
    let tries = 0
    const t = setInterval(() => (++tries > 20 ? clearInterval(t) : reload()), 3000)
    return () => clearInterval(t)
  }, [returnedFromStripe, order?.status, reload])

  if (loading && !data) return <Skeleton className="h-64" />
  if (error) return <ErrorNote error={error} onRetry={reload} />

  const act = (name, fn) => async () => {
    setBusy(name)
    setActionError(null)
    try { await fn() } catch (e) { setActionError(e) } finally { setBusy(null) }
  }
  const pay = act('pay', async () => {
    const { data: payment } = await api(`/orders/${id}/payments`, { method: 'POST' })
    if (payment.checkout_url) window.location.assign(payment.checkout_url)
    else setLocalMode(true)
  })
  const simulate = act('simulate', async () => setData(await api(`/orders/${id}/payments/simulate`, { method: 'POST' })))
  const cancel = act('cancel', async () => setData(await api(`/orders/${id}/cancel`, { method: 'POST' })))

  return (
    <div className="grid gap-6">
      <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"><ArrowLeft size={16} /> Orders</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{order.number}</h1>
        <StatusBadge status={order.status} />
      </div>
      {returnedFromStripe && order.status === 'pending' && <p className="text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">Waiting for the payment confirmation from Stripe.</p>}
      <ErrorNote error={actionError} />

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {order.items.map((item) => (
            <li key={item.product_id} className="flex justify-between gap-4 py-3 text-sm">
              <span>{item.product_name} <span className="text-zinc-500">x {item.quantity}</span></span>
              <span>{money(item.line_total_cents, order.currency)}</span>
            </li>
          ))}
        </ul>
        <aside className="grid h-fit gap-5 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400"><span>Subtotal</span><span>{money(order.subtotal_cents, order.currency)}</span></div>
            <div className="flex justify-between text-zinc-600 dark:text-zinc-400"><span>Shipping</span><span>{order.shipping_cents ? money(order.shipping_cents, order.currency) : 'Free'}</span></div>
            <div className="flex justify-between border-t border-zinc-200 pt-3 text-base font-semibold dark:border-zinc-800"><span>Total</span><span>{money(order.total_cents, order.currency)}</span></div>
          </div>
          <address className="text-sm not-italic text-zinc-600 dark:text-zinc-400">
            {order.shipping_address.name}<br />{order.shipping_address.street}<br />{order.shipping_address.city} {order.shipping_address.zip}, {order.shipping_address.country}
          </address>
          {order.status === 'pending' && (
            <div className="grid gap-2">
              {localMode ? (
                <>
                  <p className="text-xs text-zinc-500">Local payment mode: no Stripe key is configured on the API.</p>
                  <button onClick={simulate} disabled={!!busy} className="btn-primary">{busy === 'simulate' ? 'Confirming' : 'Simulate payment'}</button>
                </>
              ) : (
                <button onClick={pay} disabled={!!busy} className="btn-primary">{busy === 'pay' ? 'Opening checkout' : 'Pay now'}</button>
              )}
              <button onClick={cancel} disabled={!!busy} className="btn-ghost">Cancel order</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
