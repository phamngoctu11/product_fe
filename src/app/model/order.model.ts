import { VoucherTemplate } from "./voucher.model";
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
  finalPrice:number;
  discountAmount:number;
  voucherName?:string;
  startOrderTime: string;
  endOrderTime: string | null;
  status: string;
  cancelReason: string | null;
}
export interface OrderStatusHistory {
  id: number;
  oldstatus: string;
  newstatus: string;
  updatetime: string;
  changer: string;
}
