// Single client for the Laravel API. Errors come back as ApiError with the server's code/details.
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message ?? `Request failed (${status})`)
    this.status = status
    this.code = body?.code
    this.details = body?.details
    this.errors = body?.errors ?? {}
  }
}

let token = localStorage.getItem('token')
let onUnauthorized = () => {}

export const setToken = (t) => {
  token = t
  t ? localStorage.setItem('token', t) : localStorage.removeItem('token')
}
export const handleUnauthorized = (fn) => { onUnauthorized = fn }

export async function api(path, { method = 'GET', body, query } = {}) {
  const qs = query ? '?' + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '' && v != null)) : ''
  const res = await fetch(`/api/v1${path}${qs}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (res.status === 401 && token) onUnauthorized() // expired or revoked token
  if (!res.ok) throw new ApiError(res.status, data)
  return data
}

export const money = (cents, currency = 'usd') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
