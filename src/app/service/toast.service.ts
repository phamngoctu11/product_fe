import { Injectable, signal } from '@angular/core';
import { ApiResponse, getApiErrorMessage, getApiResponseMessage } from '../model/api-response.model';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly messages = signal<ToastMessage[]>([]);
  private nextId = 0;

  show(message: unknown, type: ToastType = 'info', duration = 4500): number {
    const id = ++this.nextId;
    this.messages.update((messages) => [
      ...messages,
      { id, type, message: this.toText(message), duration },
    ]);

    if (duration > 0) window.setTimeout(() => this.dismiss(id), duration);
    return id;
  }

  notify(message: unknown): number {
    const text = this.toText(message);
    const normalized = text.toLocaleLowerCase('vi');

    if (normalized.includes('thành công') || normalized.startsWith('đã gửi')) {
      return this.success(text);
    }

    if (normalized.includes('lỗi') || normalized.includes('thất bại') || normalized.includes('không thể')) {
      return this.error(text);
    }

    if (
      normalized.includes('vui lòng') ||
      normalized.includes('không tìm thấy') ||
      normalized.includes('không có quyền') ||
      normalized.includes('chưa có') ||
      normalized.includes('chỉ có thể') ||
      normalized.includes('không được') ||
      normalized.includes('rất tiếc')
    ) {
      return this.warning(text);
    }

    return this.info(text);
  }

  success(message: unknown, duration?: number): number {
    return this.show(message, 'success', duration);
  }

  error(message: unknown, duration = 6500): number {
    return this.show(message, 'error', duration);
  }

  warning(message: unknown, duration = 5500): number {
    return this.show(message, 'warning', duration);
  }

  info(message: unknown, duration?: number): number {
    return this.show(message, 'info', duration);
  }

  fromResponse<T>(response: ApiResponse<T> | T, fallback = 'Thao tác thành công.'): number {
    return this.success(getApiResponseMessage(response, fallback));
  }

  fromError(error: unknown, fallback = 'Đã xảy ra lỗi.', prefix = ''): number {
    return this.error(`${prefix}${getApiErrorMessage(error, fallback)}`);
  }

  dismiss(id: number): void {
    this.messages.update((messages) => messages.filter((message) => message.id !== id));
  }

  private toText(message: unknown): string {
    if (typeof message === 'string') return message;
    if (message === null || message === undefined) return 'Đã xảy ra lỗi.';
    return String(message);
  }
}
