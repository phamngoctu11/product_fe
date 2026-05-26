export interface ApiResponse<T> {
  success: boolean;
  status: number;
  message: string;
  data: T;
}

export function unwrapApiResponse<T>(response: ApiResponse<T> | T): T {
  if (
    response &&
    typeof response === 'object' &&
    'success' in response &&
    'status' in response &&
    'message' in response &&
    'data' in response
  ) {
    return (response as ApiResponse<T>).data;
  }

  return response as T;
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

  return rawError?.message || error?.message || fallback;
}
