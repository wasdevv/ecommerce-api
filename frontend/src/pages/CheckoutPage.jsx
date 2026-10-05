import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useFetch } from '../lib/useFetch'
import { ErrorNote, Field, Skeleton } from '../components/ui'
import { Totals } from './CartPage'

const FIELDS = [
  { name: 'name', label: 'Full name', autoComplete: 'name' },
  { name: 'street', label: 'Street address', autoComplete: 'street-address' },
  { name: 'city', label: 'City', autoComplete: 'address-level2' },
  { name: 'zip', label: 'Postal code', autoComplete: 'postal-code' },
  { name: 'country', label: 'Country code', autoComplete: 'country', maxLength: 2, placeholder: 'BR' },
]

export default function CheckoutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const cart = useFetch('/cart')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (cart.loading && !cart.data) return <Skeleton className="h-64" />
  if (cart.error) return <ErrorNote error={cart.error} onRetry={cart.reload} />
  if (cart.data.data.items.length === 0) return <Navigate to="/cart" replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const address = Object.fromEntries(new FormData(e.currentTarget))
    address.country = address.country.toUpperCase()
    try {
      const { data } = await api('/orders', { method: 'POST', body: { shipping_address: address } })
      navigate(`/orders/${data.id}`, { replace: true })
    } catch (err) {
      setError(err)
      if (err.code === 'insufficient_stock') cart.reload() // show what is actually left
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[2fr_1fr]" noValidate>
      <section className="grid content-start gap-5">
        <h1 className="text-2xl font-semibold tracking-tight">Shipping</h1>
        {error && !Object.keys(error.errors).length && <ErrorNote error={error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.name} className={f.name === 'street' || f.name === 'name' ? 'sm:col-span-2' : ''}>
              <Field id={f.name} required defaultValue={f.name === 'name' ? user.name : undefined}
                error={error?.errors?.[`shipping_address.${f.name}`]?.[0]} {...f} />
            </div>
          ))}
        </div>
      </section>
      <aside className="grid h-fit gap-5 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="font-semibold">{cart.data.data.items.length} item(s)</h2>
        <Totals cart={cart.data.data} />
        <button className="btn-primary" disabled={busy}>{busy ? 'Placing order' : 'Place order'}</button>
        <p className="text-xs text-zinc-500">Stock is reserved when the order is placed. You pay on the next step.</p>
      </aside>
    </form>
  )
}
