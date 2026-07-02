export interface ChatUser {
  id: string;
  chatThreadId?: number | null;
  firstname: string;
  lastname: string;
  email: string;
  avatarUrl: string | null;
  isActive?: boolean;
  consultationRequestId?: number | null;
  productId?: number | null;
  productName?: string | null;
  productImageUrl?: string | null;
  assignedStaffId?: number | null;
  assignedStaffName?: string | null;
  assignedByManagerId?: number | null;
  assignedByManagerName?: string | null;
  chatTitle?: string | null;
}

export interface ChatMessage {
  id?: string;
  userId: string;
  content: string;
  isShopSender: boolean;
  shopSender?: boolean;
  adminSender?: boolean;
  senderId?: number | null;
  senderRole?: string | null;
  senderName?: string | null;
  assignedStaffId?: number | null;
  assignedStaffName?: string | null;
  messageType?: string;
  productId?: number | null;
  consultationRequestId?: number | null;
  productData?: any;
  timestamp?: string;
}
