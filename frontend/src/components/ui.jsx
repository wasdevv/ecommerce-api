export function ErrorNote({ error, onRetry }) {
  if (!error) return null
  return (
    <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
      {error.status ? error.message : 'Could not reach the server. Check your connection.'}
      {onRetry && <button onClick={onRetry} className="ml-3 underline">Try again</button>}
    </div>
  )
}

export function Field({ label, error, id, ...props }) {
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input id={id} className="field" aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      {error && <p id={`${id}-error`} className="text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  )
}

export const Skeleton = ({ className = '' }) => <div className={`animate-pulse rounded-lg bg-zinc-200 motion-reduce:animate-none dark:bg-zinc-800 ${className}`} />

export function StatusBadge({ status }) {
  const tone = {
    pending: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
    paid: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
    cancelled: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  }[status]
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${tone}`}>{status}</span>
}
