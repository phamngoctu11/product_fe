export interface ChatUser {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  avatarUrl: string | null;
  isActive?: boolean;
}

export interface ChatMessage {
  id?: number;
  userId: number;
  content: string;
  adminSender: boolean;
  messageType?: string;      // 🚨 'TEXT' hoặc 'PRODUCT'
  productId?: number | null; // 🚨 ID Sản phẩm
  productData?: any;         // 🚨 Dùng để chứa Object sản phẩm sau khi giải mã
  timestamp?: string;
}
