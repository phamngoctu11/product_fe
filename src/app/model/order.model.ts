export interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  user_id: number;
  items: OrderItem[];
  totalPrice: number;
  startOrderTime: string;
  endOrderTime: string | null;
  status: string;
  cancelReason: string | null;
}
