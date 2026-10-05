import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Layout from './components/Layout'
import CatalogPage from './pages/CatalogPage'
import ProductPage from './pages/ProductPage'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrdersPage from './pages/OrdersPage'
import OrderPage from './pages/OrderPage'

function Protected({ children }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return null
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CatalogPage />} />
        <Route path="products/:slug" element={<ProductPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="cart" element={<Protected><CartPage /></Protected>} />
        <Route path="checkout" element={<Protected><CheckoutPage /></Protected>} />
        <Route path="orders" element={<Protected><OrdersPage /></Protected>} />
        <Route path="orders/:id" element={<Protected><OrderPage /></Protected>} />
        <Route path="*" element={<p className="py-24 text-center text-zinc-500">Page not found.</p>} />
      </Route>
    </Routes>
  )
}
