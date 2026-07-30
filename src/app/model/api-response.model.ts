export interface ApiResponse<T> {
  success: boolean;
  status: number;
  message: string;
  data: T;
}

export function isApiResponse<T>(response: unknown): response is ApiResponse<T> {
  return !!response && typeof response === 'object' &&
    'success' in response && 'status' in response && 'message' in response && 'data' in response;
}

export function unwrapApiResponse<T>(response: ApiResponse<T> | T): T {
  if (isApiResponse<T>(response)) return response.data;

  return response as T;
}

export function getApiResponseMessage<T>(response: ApiResponse<T> | T, fallback: string): string {
  return isApiResponse<T>(response) && response.message ? response.message : fallback;
}

export function getApiErrorMessage(error: any, fallback: string = 'Đã xảy ra lỗi.'): string {
  const rawError = error?.error ?? error;

  if (typeof rawError === 'string') {
    try {
      const parsed = JSON.parse(rawError);
      return localizeApiMessage(parsed?.message || fallback);
    } catch {
      return localizeApiMessage(rawError || fallback);
    }
  }

  const validationMessage = rawError?.errors && typeof rawError.errors === 'object'
    ? Object.values(rawError.errors).flat().join('\n')
    : '';

  return localizeApiMessage(rawError?.message || validationMessage || error?.message || fallback);
}

export function getRetryAfterSeconds(error: any): number | null {
  const retryAfterHeader = readHeader(error, 'Retry-After') ?? readHeader(error, 'X-RateLimit-Reset');
  if (!retryAfterHeader) return null;

  const retryAfterSeconds = Number.parseInt(retryAfterHeader, 10);
  if (!Number.isFinite(retryAfterSeconds) || retryAfterSeconds <= 0) return null;

  return retryAfterSeconds;
}

export function formatRateLimitDelay(seconds: number): string {
  const safeSeconds = Math.max(1, Math.ceil(seconds));
  if (safeSeconds >= 60) {
    return `${Math.max(1, Math.ceil(safeSeconds / 60))} phút`;
  }
  return `${safeSeconds} giây`;
}

function readHeader(error: any, headerName: string): string | null {
  const headers = error?.headers;
  if (!headers) return null;

  if (typeof headers.get === 'function') {
    return headers.get(headerName);
  }

  return headers[headerName] ?? headers[headerName.toLowerCase()] ?? null;
}

function localizeApiMessage(message: string): string {
  const normalized = (message || '').trim();
  if (!normalized) return normalized;

  if (normalized.startsWith('Checkout lock service is unavailable')) {
    return 'Hệ thống đang bận xử lý thanh toán.';
  }

  if (normalized.startsWith('Checkout idempotency service is unavailable')) {
    return 'Hệ thống đang bận xử lý thanh toán.';
  }

  const messages: Record<string, string> = {
    'Too many login attempts. Please retry later.':
      'Bạn đã thử đăng nhập quá nhiều lần.',
    'Too many requests. Please retry later.':
      'Bạn thao tác quá nhanh.',
    'Too many write requests. Please retry later.':
      'Bạn thao tác quá nhanh.',
    'Rate limiter is temporarily unavailable. Please retry shortly.':
      'Tạm thời chưa thể kiểm tra giới hạn thao tác. Vui lòng thử lại sau.',
    'Checkout request is already being processed. Please wait.':
      'Yêu cầu thanh toán đang được xử lý. Vui lòng chờ trong giây lát.',
  };

  return messages[normalized] || normalized;
}
