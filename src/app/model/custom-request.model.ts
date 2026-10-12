/** Trạng thái của bản yêu cầu custom (khác trạng thái Order). */
export type CustomRequestStatus = 'DRAFT' | 'SUBMITTED';

export const CUSTOM_DESCRIPTION_MAX_WORDS = 4000;

export interface CustomRequestDTO {
  id: number;
  version: number;
  status: CustomRequestStatus;
  description: string;
  imageUrls: string[];
  quantity: number;
  /** Order CUSTOM được tạo khi submit thành công */
  linkedOrderId?: number | null;
  sourceOrderId?: number | null;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string | null;
  /** Backend quyết định draft còn được sửa/xóa/submit hay không */
  editable: boolean;
}

export interface CreateCustomRequest {
  description: string;
  imageUrls: string[];
  quantity: number;
}

export interface UpdateCustomRequest extends CreateCustomRequest {
  expectedVersion: number;
}

/**
 * Thông tin liên hệ khi submit. Trường bỏ trống sẽ được backend fallback từ profile user;
 * sau fallback bắt buộc có họ tên, email, số điện thoại và địa chỉ.
 */
export interface SubmitCustomRequest {
  expectedVersion: number;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  note?: string | null;
}

export interface CustomRequestSubmissionDTO {
  draftId: number;
  orderId: number;
  version: number;
  orderType: string;
  status: string;
  message: string;
}

/** Đếm từ theo khoảng trắng Unicode – thống nhất với rule backend. */
export function countWords(text: string | null | undefined): number {
  const trimmed = (text ?? '').trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
}

export function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
