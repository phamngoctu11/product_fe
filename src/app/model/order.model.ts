export interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;          // Bước 1: Số lượng khách đặt ban đầu
  price: number;
  image_url?: string;

  // 🚨 THÊM MỚI: Phục vụ UI hiển thị Đối soát 3 bước
  exportedQuantity?: number | null; // Bước 2: Số lượng thực xuất (Staff nhập)
  receivedQuantity?: number | null; // Bước 3: Số lượng thực nhận (Khách nhập)
}

export interface Order {
  id: number;
  userId?: number;
  user_id?: number;
  customerName?: string;
  lastname?: string;
  items?: OrderItem[];
  orderItems?: OrderItem[];
  details?: OrderItem[];
  totalPrice: number;
  finalPrice?: number;
  discountAmount?: number;
  voucherName?: string;
  startOrderTime: string;
  endOrderTime: string | null;
  status: string;
  cancelReason: string | null;
  note: string | null;
  paymentMethod?: string; // Bổ sung thêm cho đầy đủ theo DTO
  approvedById?: number | null;
  approvedByFullName?: string | null;
}

export interface OrderStatusHistory {
  id: number;
  oldstatus: string;
  newstatus: string;
  updatetime: string;
  changerId?: number; // 🚨 ĐÃ ĐỔI: Khớp với Backend (Lưu ID thay vì Tên String)
}

// 🚨 THÊM MỚI: Dùng làm Request Body gửi lên API Xuất kho / Nhận hàng
export interface ItemCheckRequest {
  variantId: number;
  quantity: number;
}

