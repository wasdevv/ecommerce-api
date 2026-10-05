import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { ErrorNote, Field } from '../components/ui'

function AuthForm({ title, fields, submit, footer }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const from = useLocation().state?.from ?? '/'
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={from} replace />

  const onSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await submit(Object.fromEntries(new FormData(e.currentTarget)))
      navigate(from, { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto grid w-full max-w-sm gap-5" noValidate>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {error && !Object.keys(error.errors ?? {}).length && <ErrorNote error={error} />}
      {fields.map((f) => <Field key={f.name} id={f.name} error={error?.errors?.[f.name]?.[0]} required {...f} />)}
      <button className="btn-primary" disabled={busy}>{busy ? 'Please wait' : title}</button>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{footer}</p>
    </form>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  return (
    <AuthForm title="Sign in" submit={({ email, password }) => login(email, password)}
      fields={[{ name: 'email', label: 'Email', type: 'email', autoComplete: 'email' }, { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password' }]}
      footer={<>New here? <Link to="/register" className="text-accent underline">Create an account</Link></>} />
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  return (
    <AuthForm title="Create account" submit={register}
      fields={[
        { name: 'name', label: 'Name', autoComplete: 'name' },
        { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
        { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', minLength: 8 },
        { name: 'password_confirmation', label: 'Confirm password', type: 'password', autoComplete: 'new-password' },
      ]}
      footer={<>Already have an account? <Link to="/login" className="text-accent underline">Sign in</Link></>} />
  )
}
