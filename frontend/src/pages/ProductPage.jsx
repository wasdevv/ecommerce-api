import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { api, money } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useFetch } from '../lib/useFetch'
import { ErrorNote, Skeleton } from '../components/ui'

export default function ProductPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data, error, loading } = useFetch(`/products/${slug}`)
  const [quantity, setQuantity] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  if (loading) return <div className="grid gap-8 md:grid-cols-2"><Skeleton className="aspect-[4/3]" /><div className="grid content-start gap-4"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-24" /></div></div>
  if (error) return error.status === 404 ? <p className="py-24 text-center text-zinc-500">This product is no longer available. <Link to="/" className="text-accent underline">Back to the catalog</Link></p> : <ErrorNote error={error} />

  const p = data.data
  const add = async () => {
    if (!user) return navigate('/login', { state: { from: `/products/${slug}` } })
    setSaving(true)
    setSaveError(null)
    try {
      await api(`/cart/items/${p.id}`, { method: 'PUT', body: { quantity } })
      navigate('/cart')
    } catch (e) {
      setSaveError(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"><ArrowLeft size={16} /> Catalog</Link>
      <div className="grid gap-8 md:grid-cols-[3fr_2fr] md:gap-12">
        <img src={p.image_url} alt={p.name} width="600" height="450" className="aspect-[4/3] w-full rounded-xl bg-zinc-200 object-cover dark:bg-zinc-800" />
        <div className="grid content-start gap-5">
          <div>
            <p className="text-sm text-zinc-500">{p.category?.name}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{p.name}</h1>
            <p className="mt-3 text-2xl">{money(p.price_cents)}</p>
          </div>
          <p className="max-w-[65ch] leading-relaxed text-zinc-600 dark:text-zinc-400">{p.description}</p>
          {p.stock > 0 ? (
            <div className="grid gap-3">
              <div className="flex items-end gap-3">
                <div className="grid gap-2">
                  <label htmlFor="qty" className="text-sm font-medium">Quantity</label>
                  <select id="qty" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="field w-24">
                    {Array.from({ length: Math.min(p.stock, 10) }, (_, i) => <option key={i + 1}>{i + 1}</option>)}
                  </select>
                </div>
                <button onClick={add} disabled={saving} className="btn-primary">{saving ? 'Adding' : 'Add to cart'}</button>
              </div>
              <p className="text-sm text-zinc-500">{p.stock} in stock</p>
              <ErrorNote error={saveError} />
            </div>
          ) : (
            <p className="font-medium text-red-700 dark:text-red-400">Sold out</p>
          )}
        </div>
      </div>
    </div>
  )
}
