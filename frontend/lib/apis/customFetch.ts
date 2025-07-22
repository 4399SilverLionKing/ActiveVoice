// ============= 类型定义 =============

export interface RequestInterceptor {
  (config: RequestInit): RequestInit | Promise<RequestInit>;
}

export interface ResponseInterceptor {
  onFulfilled?: (response: Response) => Response | Promise<Response>;
  onRejected?: (error: any) => any;
}

export interface BackendResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
}

export interface BlobResponse {
  blob: Blob;
  headers: Headers;
  status: number;
  statusText: string;
}

export enum ResponseCode {
  SUCCESS = 10000,
  FAIL = 9999,
  SERVER_BUSY = 9998,
  API_UN_IMPL = 9997,
  CONTENT_TYPE_ERR = 9996,
  PARAMS_INVALID = 9995,
  SERVER_ERROR = 9994,
  FORBIDDEN = 403,
  UNAUTHORIZED = 401,
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

export type TokenProvider = () => string | null | Promise<string | null>;

// ============= 常量定义 =============

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
} as const;

const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: 'Bad Request - 请求参数错误',
  401: 'Unauthorized - 未授权访问',
  403: 'Forbidden - 禁止访问',
  404: 'Not Found - 资源不存在',
  422: 'Unprocessable Entity - 请求参数验证失败',
  429: 'Too Many Requests - 请求过于频繁',
  500: 'Internal Server Error - 服务器内部错误',
  502: 'Bad Gateway - 网关错误',
  503: 'Service Unavailable - 服务不可用',
} as const;

// ============= 主要类定义 =============

class CustomFetch {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private tokenProvider: TokenProvider | null = null;

  // ============= 公共配置方法 =============

  setTokenProvider(provider: TokenProvider): void {
    this.tokenProvider = provider;
  }

  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  // ============= 私有工具方法 =============

  private async applyRequestInterceptors(
    config: RequestInit
  ): Promise<RequestInit> {
    return this.requestInterceptors.reduce(
      async (configPromise, interceptor) => interceptor(await configPromise),
      Promise.resolve({ ...config })
    );
  }

  private async applyResponseInterceptors(
    response: Response
  ): Promise<Response> {
    let finalResponse = response;

    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onFulfilled) {
        try {
          finalResponse = await interceptor.onFulfilled(finalResponse);
        } catch (error) {
          if (interceptor.onRejected) {
            throw await interceptor.onRejected(error);
          }
          throw error;
        }
      }
    }

    return finalResponse;
  }

  private async handleResponseError(error: any): Promise<never> {
    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onRejected) {
        throw await interceptor.onRejected(error);
      }
    }
    throw error;
  }

  private async prepareHeaders(headers: HeadersInit = {}): Promise<Headers> {
    const finalHeaders = new Headers({
      ...DEFAULT_HEADERS,
      ...headers,
    });

    // 添加认证头
    if (this.tokenProvider) {
      const token = await this.tokenProvider();
      if (token) {
        finalHeaders.set('Authorization', `Bearer ${token}`);
      }
    }

    return finalHeaders;
  }

  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    let rawData: any;

    try {
      rawData = contentType?.includes('application/json')
        ? await response.json()
        : await response.text();
    } catch (error) {
      throw new ApiError(response.status, 'Failed to parse response', error);
    }

    // 检查是否是后端标准格式
    if (this.isBackendResponse(rawData)) {
      const backendResponse = rawData as BackendResponse<T>;

      if (backendResponse.code !== ResponseCode.SUCCESS) {
        throw new ApiError(
          response.status,
          backendResponse.message,
          backendResponse
        );
      }

      return this.createApiResponse(backendResponse.data, response);
    }

    // 非标准格式，直接返回原始数据
    return this.createApiResponse(rawData as T, response);
  }

  private isBackendResponse(data: any): boolean {
    return (
      data && typeof data === 'object' && 'code' in data && 'message' in data
    );
  }

  private createApiResponse<T>(data: T, response: Response): ApiResponse<T> {
    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    };
  }

  private async parseErrorData(response: Response): Promise<any> {
    try {
      const contentType = response.headers.get('content-type');
      return contentType?.includes('application/json')
        ? await response.json()
        : await response.text();
    } catch {
      return null;
    }
  }

  private createErrorMessage(status: number, data: any): string {
    // 优先使用响应数据中的错误信息
    if (data && typeof data === 'object' && data.message) {
      return data.message;
    }

    // 使用预定义的状态码消息
    return (
      HTTP_STATUS_MESSAGES[status] || `Request failed with status ${status}`
    );
  }

  private handleError(response: Response, data: any): never {
    const message = this.createErrorMessage(response.status, data);
    throw new ApiError(response.status, message, data);
  }

  // ============= 核心请求方法 =============

  private async executeRequest(
    url: string,
    config: RequestInit
  ): Promise<Response> {
    // 应用请求拦截器
    const finalConfig = await this.applyRequestInterceptors(config);

    // 准备headers
    const headers = await this.prepareHeaders(finalConfig.headers);

    // 发送请求
    const response = await fetch(url, {
      ...finalConfig,
      headers,
    });

    // 应用响应拦截器
    return this.applyResponseInterceptors(response);
  }

  async request<T = any>(
    url: string,
    config: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.executeRequest(url, config);
      const parsedResponse = await this.parseResponse<T>(response);

      if (!response.ok) {
        this.handleError(response, parsedResponse.data);
      }

      return parsedResponse;
    } catch (error) {
      return await this.handleResponseError(error);
    }
  }

  async requestBlob(
    url: string,
    config: RequestInit = {}
  ): Promise<BlobResponse> {
    try {
      const response = await this.executeRequest(url, config);

      if (!response.ok) {
        const errorData = await this.parseErrorData(response);
        this.handleError(response, errorData);
      }

      const blob = await response.blob();
      return {
        blob,
        headers: response.headers,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      return await this.handleResponseError(error);
    }
  }

  // ============= 便捷方法 =============

  async get<T = any>(
    url: string,
    config?: RequestInit
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: RequestInit
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: RequestInit
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(
    url: string,
    config?: RequestInit
  ): Promise<ApiResponse<T>> {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }
}

// ============= 工厂函数和默认实例 =============

function createTokenProvider(): TokenProvider {
  return () => {
    if (typeof window === 'undefined') return null;

    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (!authStorage) return null;

      const parsed = JSON.parse(authStorage);
      return parsed.state?.token || null;
    } catch {
      return null;
    }
  };
}

function createDefaultInstance(): CustomFetch {
  const instance = new CustomFetch();

  // 设置token提供者
  instance.setTokenProvider(createTokenProvider());

  // 设置默认响应拦截器
  instance.addResponseInterceptor({
    onFulfilled: response => response,
    onRejected: error => {
      console.error('API Error:', error);

      // 可以在这里添加全局错误处理逻辑
      // 例如：401错误自动登出
      // if (error instanceof ApiError && error.status === 401) {
      //   // 处理未授权错误
      // }

      return Promise.reject(error);
    },
  });

  return instance;
}

// 创建默认实例
const customFetch = createDefaultInstance();

export { CustomFetch, customFetch };
export default customFetch;
