export interface ApiFieldError {
  field: string;
  code: string;
  message: string;
}

export interface ApiErrorDetails {
  currentVersion?: number;
  fields?: string[];
  status?: string;
  errors?: ApiFieldError[];
  [key: string]: unknown;
}

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: ApiErrorDetails;
  public readonly fieldErrors: Record<string, string>;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    details?: ApiErrorDetails,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.fieldErrors = {};

    if (details?.errors && Array.isArray(details.errors)) {
      for (const err of details.errors) {
        if (err.field) {
          this.fieldErrors[err.field] = err.message;
        }
      }
    }
  }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined')
    return null;
  return (
    localStorage.getItem('token')
    || localStorage.getItem('admin_token')
    || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') : null)
    || null
  );
}

export function setAuthToken(token: string | null) {
  if (typeof window === 'undefined')
    return;
  if (token) {
    localStorage.setItem('token', token);
  }
  else {
    localStorage.removeItem('token');
    localStorage.removeItem('admin_token');
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('token');
    }
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined')
    return null;
  return (
    localStorage.getItem('refresh_token')
    || localStorage.getItem('admin_refresh_token')
    || null
  );
}

export function setRefreshToken(token: string | null) {
  if (typeof window === 'undefined')
    return;
  if (token) {
    localStorage.setItem('refresh_token', token);
  }
  else {
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('admin_refresh_token');
  }
}

type AuthExpiredCallback = () => void;
const authExpiredListeners = new Set<AuthExpiredCallback>();

export function onAuthExpired(callback: AuthExpiredCallback): () => void {
  authExpiredListeners.add(callback);
  return () => {
    authExpiredListeners.delete(callback);
  };
}

function notifyAuthExpired(): void {
  for (const listener of authExpiredListeners) {
    try {
      listener();
    }
    catch (e) {
      console.error('Error in auth expired listener:', e);
    }
  }
}

let activeRefreshPromise: Promise<string | null> | null = null;

async function requestTokenRefresh(): Promise<string | null> {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    return null;
  }

  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });

      if (!response.ok) {
        setAuthToken(null);
        setRefreshToken(null);
        notifyAuthExpired();
        return null;
      }

      const payload = await response.json();
      const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;

      if (data?.access_token) {
        setAuthToken(data.access_token);
        if (data.refresh_token) {
          setRefreshToken(data.refresh_token);
        }
        return data.access_token as string;
      }

      setAuthToken(null);
      setRefreshToken(null);
      notifyAuthExpired();
      return null;
    }
    catch {
      setAuthToken(null);
      setRefreshToken(null);
      notifyAuthExpired();
      return null;
    }
    finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  _retry?: boolean;
}

/**
 * Core HTTP client for Admin Web.
 * Handles JWT authorization, baseURL, FormatRestResponse unwrapping, auto-refresh on 401, and error mapping.
 */
export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, body, headers = {}, _retry = false, ...rest } = options;

  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const reqHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string>),
  };

  const token = getAuthToken();
  if (token) {
    reqHeaders.Authorization = `Bearer ${token}`;
  }

  let reqBody: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (body instanceof FormData || body instanceof Blob) {
      reqBody = body;
    }
    else {
      reqHeaders['Content-Type'] = 'application/json';
      reqBody = JSON.stringify(body);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: reqHeaders,
      body: reqBody,
    });
  }
  catch (netErr) {
    throw new ApiClientError(
      (netErr as Error)?.message || 'Không thể kết nối đến máy chủ.',
      'NETWORK_ERROR',
      0,
    );
  }

  // Handle 401 Unauthorized with token refresh if not already retried
  if (response.status === 401 && !_retry && !endpoint.startsWith('/api/auth/')) {
    const newToken = await requestTokenRefresh();
    if (newToken) {
      return apiClient<T>(endpoint, {
        ...options,
        _retry: true,
      });
    }
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  // Read response body as JSON or text
  const contentType = response.headers.get('content-type') || '';
  let payload: any = null;
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    }
    catch {
      payload = null;
    }
  }
  else {
    payload = await response.text();
  }

  if (!response.ok) {
    const statusCode = response.status;
    const errorCode = payload?.error || (statusCode === 401 ? 'UNAUTHORIZED' : statusCode === 403 ? 'FORBIDDEN' : 'UNKNOWN_ERROR');
    const message = payload?.message || getFriendlyErrorMessage(errorCode, payload?.data);
    const details = payload?.data || undefined;

    throw new ApiClientError(message, errorCode, statusCode, details);
  }

  // FormatRestResponse wrapper: { statusCode: 200, data: T, message: null }
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T;
  }

  return payload as T;
}

/**
 * Uploads binary file directly to a presigned S3/MinIO URL.
 */
export async function uploadBinaryToPresignedUrl(
  uploadUrl: string,
  file: File | Blob,
  contentType: string,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: file,
  });

  if (!response.ok) {
    throw new ApiClientError(
      `Tải tệp lên máy chủ lưu trữ thất bại (HTTP ${response.status})`,
      'ASSET_UPLOAD_FAILED',
      response.status,
    );
  }
}

/**
 * Provides Vietnamese user-facing messages for known backend Shop error codes.
 */
function getFriendlyErrorMessage(code: string, details?: any): string {
  switch (code) {
    case 'SHOP_ITEM_CODE_EXISTS':
      return 'Mã định danh (code) này đã tồn tại trong hệ thống.';
    case 'INVALID_THEME_KEY':
      return 'Chủ đề này không nằm trong danh mục cho phép hoặc đã được gán.';
    case 'INVALID_PRICE':
      return 'Giá niêm yết không hợp lệ (1..100,000 Coin).';
    case 'INVALID_AVAILABILITY_WINDOW':
      return 'Thời gian kết thúc bán phải sau thời gian bắt đầu bán.';
    case 'INVALID_SHOP_ITEM_CONFIG':
      return 'Cấu hình chi tiết vật phẩm không đúng định dạng.';
    case 'FIELD_LOCKED': {
      const lockedFields = details?.fields ? details.fields.join(', ') : '';
      return `Một số trường không thể thay đổi ở trạng thái hiện tại (${lockedFields}).`;
    }
    case 'VERSION_CONFLICT':
      return 'Vật phẩm này đã được chỉnh sửa ở phiên khác. Vui lòng tải phiên bản mới.';
    case 'ITEM_CANNOT_BE_DELETED':
      return 'Chỉ có thể xóa vật phẩm ở trạng thái DRAFT (Bản nháp).';
    case 'VALIDATION_ERROR':
      return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường được đánh dấu.';
    case 'UNAUTHORIZED':
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    case 'FORBIDDEN':
      return 'Bạn không có quyền thực hiện thao tác này (yêu cầu ROLE_ADMIN).';
    default:
      return 'Thao tác không thành công, vui lòng thử lại sau.';
  }
}
