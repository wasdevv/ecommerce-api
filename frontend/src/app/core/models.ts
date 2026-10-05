export interface User { id: number; name: string; email: string; role: 'admin' | 'customer' }
export interface Category { id: number; name: string; slug: string }
export interface Product {
  id: number; name: string; slug: string; description: string; price_cents: number;
  stock: number; image_url: string | null; is_active: boolean; category?: Category;
}
export interface PageMeta { current_page: number; last_page: number; per_page: number; total: number }
export interface Page<T> { data: T[]; meta: PageMeta }
export interface Cart {
  items: { product: Product; quantity: number; line_total_cents: number }[];
  subtotal_cents: number; shipping_cents: number; total_cents: number; currency: string;
}
export interface Address { name: string; street: string; city: string; zip: string; country: string }
export type OrderStatus = 'pending' | 'paid' | 'cancelled';
export interface Order {
  id: number; number: string; status: OrderStatus; subtotal_cents: number; shipping_cents: number;
  total_cents: number; currency: string; shipping_address: Address; created_at: string;
  items?: { product_id: number; product_name: string; unit_price_cents: number; quantity: number; line_total_cents: number }[];
}
export interface PaymentStart { provider: 'stripe' | 'fake'; reference: string; checkout_url: string | null }
