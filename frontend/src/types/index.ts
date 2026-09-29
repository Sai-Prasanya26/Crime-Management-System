export interface HealthResponse {
  status: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
