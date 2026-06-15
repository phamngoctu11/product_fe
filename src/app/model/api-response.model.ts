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
      return parsed?.message || fallback;
    } catch {
      return rawError || fallback;
    }
  }

  const validationMessage = rawError?.errors && typeof rawError.errors === 'object'
    ? Object.values(rawError.errors).flat().join('\n')
    : '';

  return rawError?.message || validationMessage || error?.message || fallback;
}
