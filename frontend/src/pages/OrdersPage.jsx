import { Link, useSearchParams } from 'react-router-dom'
import { money } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { ErrorNote, Skeleton, StatusBadge } from '../components/ui'

export default function OrdersPage() {
  const [params, setParams] = useSearchParams()
  const page = params.get('page') ?? '1'
  const { data, error, loading, reload } = useFetch('/orders', { page })

  if (loading && !data) return <div className="grid gap-3"><Skeleton className="h-8 w-40" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
  if (error) return <ErrorNote error={error} onRetry={reload} />
  if (data.data.length === 0) return <div className="py-20 text-center"><h1 className="text-2xl font-semibold">No orders yet</h1><Link to="/" className="btn-primary mt-6">Start shopping</Link></div>

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {data.data.map((o) => (
          <li key={o.id}>
            <Link to={`/orders/${o.id}`} className="grid grid-cols-[1fr_auto] items-center gap-2 py-4 hover:bg-zinc-100 sm:grid-cols-[1fr_auto_auto] sm:gap-6 dark:hover:bg-zinc-900">
              <div>
                <p className="font-medium">{o.number}</p>
                <p className="text-sm text-zinc-500">{new Date(o.created_at).toLocaleDateString()}</p>
              </div>
              <StatusBadge status={o.status} />
              <span className="col-span-2 text-sm font-medium sm:col-span-1">{money(o.total_cents, o.currency)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {data.meta.last_page > 1 && (
        <nav className="flex justify-center gap-3" aria-label="Pagination">
          <button className="btn-ghost" disabled={data.meta.current_page === 1} onClick={() => setParams({ page: data.meta.current_page - 1 })}>Previous</button>
          <button className="btn-ghost" disabled={data.meta.current_page === data.meta.last_page} onClick={() => setParams({ page: data.meta.current_page + 1 })}>Next</button>
        </nav>
      )}
    </div>
  )
}
