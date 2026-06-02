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
  isShopSender: boolean;
  shopSender?: boolean;
  adminSender?: boolean;
  messageType?: string;
  productId?: number | null;
  productData?: any;
  timestamp?: string;
}
