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
  user_id: number;
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
