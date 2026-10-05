import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/catalog').then((m) => m.CatalogPage), title: 'Kestrel Supply' },
  { path: 'products/:slug', loadComponent: () => import('./pages/product').then((m) => m.ProductPage) },
  { path: 'login', loadComponent: () => import('./pages/auth').then((m) => m.AuthPage), data: { mode: 'login' }, title: 'Sign in' },
  { path: 'register', loadComponent: () => import('./pages/auth').then((m) => m.AuthPage), data: { mode: 'register' }, title: 'Create account' },
  { path: 'cart', canActivate: [authGuard], loadComponent: () => import('./pages/cart').then((m) => m.CartPage), title: 'Cart' },
  { path: 'checkout', canActivate: [authGuard], loadComponent: () => import('./pages/checkout').then((m) => m.CheckoutPage), title: 'Checkout' },
  { path: 'orders', canActivate: [authGuard], loadComponent: () => import('./pages/orders').then((m) => m.OrdersPage), title: 'Orders' },
  { path: 'orders/:id', canActivate: [authGuard], loadComponent: () => import('./pages/order').then((m) => m.OrderPage), title: 'Order' },
  { path: '**', loadComponent: () => import('./pages/not-found').then((m) => m.NotFoundPage), title: 'Not found' },
];
