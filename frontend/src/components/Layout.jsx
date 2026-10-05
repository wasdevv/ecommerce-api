import { Link, NavLink, Outlet } from 'react-router-dom'
import { ShoppingBag, Package, SignOut } from '@phosphor-icons/react'
import { useAuth } from '../lib/auth'

const navClass = ({ isActive }) =>
  `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${isActive ? 'text-accent font-medium' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'}`

export default function Layout() {
  const { user, logout } = useAuth()
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
          <Link to="/" className="mr-auto text-base font-semibold tracking-tight">Kestrel Supply</Link>
          {user ? (
            <>
              <NavLink to="/orders" className={navClass}><Package size={18} /> <span className="hidden sm:inline">Orders</span></NavLink>
              <NavLink to="/cart" className={navClass}><ShoppingBag size={18} /> <span className="hidden sm:inline">Cart</span></NavLink>
              <button onClick={logout} className="btn-ghost px-3 py-2" aria-label="Sign out"><SignOut size={18} /></button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navClass}>Sign in</NavLink>
              <Link to="/register" className="btn-primary px-3 py-2">Create account</Link>
            </>
          )}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:py-12">
        <Outlet />
      </main>
      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
        Demo store. Laravel API + React. Payments run in Stripe test or local mode.
      </footer>
    </div>
  )
}
