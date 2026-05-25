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
