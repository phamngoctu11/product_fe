export interface ChatUser {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  avatarUrl: string | null;
}

export interface ChatMessage {
  id?: number;
  userId: number;
  content: string;
  isAdminSender: boolean;
  timestamp?: string;
}
