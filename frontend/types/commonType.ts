// 后端统一响应格式
export interface BackendResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}
