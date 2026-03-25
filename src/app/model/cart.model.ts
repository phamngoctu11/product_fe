export interface CartItemRes {
 productId: number;
  productName: string;
  quantity: number;
  price: number;
  image_url?: string;
}
export interface CartRes {
  user_id: number;
  items: CartItemRes[];
  totalPrice: number;
}
