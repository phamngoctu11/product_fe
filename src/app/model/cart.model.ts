export interface CartItemRes {
  productId?: number;
  productName?: string;
  variantId?: number;
  variantName?: string;
  quantity: number;
  price: number;
  image_url?: string;
}
export interface CartRes {
  user_id?: string | null;
  items: CartItemRes[];
  totalPrice: number;
}

export interface CartPaymentData {
  status?: string;
  message?: string;
  provider?: string;
  url?: string;
  payUrl?: string;
  deeplink?: string;
  qrCodeUrl?: string;
}

export interface CheckoutResponse extends CartPaymentData {
  orderId?: number;
  totalPrice?: number;
  finalPrice?: number;
  paymentMethod?: string;
}

export interface GuestCheckoutRequest {
  customerName: string;
  phone: string;
  email: string;
  shippingAddress: string;
  note?: string;
  variantIds: number[];
}
