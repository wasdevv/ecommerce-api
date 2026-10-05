import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { money } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { ErrorNote, Skeleton } from '../components/ui'

export default function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const category = params.get('category') ?? ''
  const sort = params.get('sort') ?? 'newest'
  const page = params.get('page') ?? '1'
  const [term, setTerm] = useState(q)

  const set = (patch) => setParams((p) => {
    Object.entries({ page: '', ...patch }).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)))
    return p
  })

  // Debounced search, kept in the URL so results are shareable and survive refresh.
  useEffect(() => {
    if (term === q) return
    const t = setTimeout(() => set({ q: term }), 300)
    return () => clearTimeout(t)
  }, [term]) // eslint-disable-line react-hooks/exhaustive-deps

  const categories = useFetch('/categories')
  const products = useFetch('/products', { q, category, sort, page, per_page: 12 })
  const meta = products.data?.meta

  return (
    <div className="grid gap-8">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Everyday gear, in stock</h1>
          <p className="mt-2 max-w-[65ch] text-zinc-600 dark:text-zinc-400">Prices and stock come live from the API. Free shipping from $100.</p>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="relative">
            <span className="sr-only">Search products</span>
            <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search" className="field pl-9 md:w-64" />
          </label>
          <label>
            <span className="sr-only">Sort</span>
            <select value={sort} onChange={(e) => set({ sort: e.target.value === 'newest' ? '' : e.target.value })} className="field">
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Categories">
        {[{ slug: '', name: 'All' }, ...(categories.data?.data ?? [])].map((c) => (
          <button key={c.slug} onClick={() => set({ category: c.slug })} aria-pressed={category === c.slug}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition ${category === c.slug ? 'border-accent bg-accent text-white' : 'border-zinc-300 hover:border-zinc-500 dark:border-zinc-700'}`}>
            {c.name}
          </button>
        ))}
      </div>

      <ErrorNote error={products.error} onRetry={products.reload} />

      {products.loading && !products.data ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => <div key={i} className="grid gap-3"><Skeleton className="aspect-[4/3]" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/3" /></div>)}
        </div>
      ) : products.data?.data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="font-medium">Nothing matches that search.</p>
          <button onClick={() => { setTerm(''); setParams({}) }} className="mt-3 text-sm text-accent underline">Clear filters</button>
        </div>
      ) : (
        <ul className={`grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 ${products.loading ? 'opacity-60' : ''}`}>
          {products.data?.data.map((p) => (
            <li key={p.id}>
              <Link to={`/products/${p.slug}`} className="group grid gap-3">
                <img src={p.image_url} alt="" loading="lazy" width="600" height="450"
                  className="aspect-[4/3] w-full rounded-xl bg-zinc-200 object-cover transition group-hover:opacity-90 dark:bg-zinc-800" />
                <div>
                  <p className="font-medium leading-snug group-hover:underline">{p.name}</p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {money(p.price_cents)}{p.stock === 0 && <span className="ml-2 text-red-700 dark:text-red-400">Sold out</span>}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {meta && meta.last_page > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Pagination">
          <button className="btn-ghost" disabled={meta.current_page === 1} onClick={() => set({ page: String(meta.current_page - 1) })}>Previous</button>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Page {meta.current_page} of {meta.last_page}</span>
          <button className="btn-ghost" disabled={meta.current_page === meta.last_page} onClick={() => set({ page: String(meta.current_page + 1) })}>Next</button>
        </nav>
      )}
    </div>
  )
}
