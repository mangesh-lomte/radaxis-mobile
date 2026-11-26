import { API_BASE_URL, APP_CONFIG } from '../constants/config';
import { isMutationAllowed, isAuthEndpoint, isAuthorizedWriteEndpoint, MUTATION_GUARD_MESSAGE } from '../constants/environment';
import { secureTokenStorage } from '../auth/secureTokenStorage';
import { ApiResponse } from '../types';

export class ApiError extends Error {
  public statusCode: number;
  public code?: string;
  public details?: unknown;
  public isNetworkError: boolean;
  public isTimeout: boolean;
  public isAuthError: boolean;

  constructor(
    message: string,
    statusCode: number,
    code?: string,
    details?: unknown,
    isNetworkError = false,
    isTimeout = false
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isNetworkError = isNetworkError;
    this.isTimeout = isTimeout;
    this.isAuthError = statusCode === 401;
  }
}

// Global 401 unauthorized listener
type UnauthorizedHandler = (message: string) => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  skipAuth?: boolean;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  if (!API_BASE_URL) {
    throw new ApiError(
      'RadAxis API Base URL is not configured. Please check environment configuration.',
      0,
      'CONFIG_ERROR'
    );
  }

  const {
    timeoutMs = APP_CONFIG.requestTimeoutMs,
    skipAuth = false,
    headers: customHeaders = {},
    ...restOptions
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (!skipAuth) {
    const token = await secureTokenStorage.getToken();
    if (token && !headers['Authorization'] && !headers['authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${API_BASE_URL}${normalizedEndpoint}`;

  // Fail-closed production mutation guard with authorized write endpoint exceptions
  const requestMethod = (restOptions.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(requestMethod)) {
    if (!isAuthorizedWriteEndpoint(normalizedEndpoint) && !isAuthEndpoint(normalizedEndpoint) && !isMutationAllowed(fullUrl, normalizedEndpoint)) {
      throw new ApiError(
        MUTATION_GUARD_MESSAGE,
        403,
        'MUTATION_GUARD_ACTIVE'
      );
    }
  }

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      ...restOptions,
      headers,
      signal: controller.signal,
    });
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error?.name === 'AbortError') {
      throw new ApiError(
        'Request timed out. The RIS server did not respond in time.',
        408,
        'TIMEOUT',
        undefined,
        false,
        true
      );
    }

    throw new ApiError(
      'Unable to connect to the RIS server. Please verify your internet connection.',
      0,
      'NETWORK_ERROR',
      undefined,
      true,
      false
    );
  } finally {
    clearTimeout(timeoutId);
  }

  let body: any = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  }

  // 401 Unauthorized Handling
  if (response.status === 401) {
    const code = body?.error?.code || 'UNAUTHORIZED';
    const message =
      code === 'TOKEN_EXPIRED'
        ? 'Your session has expired. Please sign in again.'
        : body?.message || 'Authentication required. Please sign in.';

    if (unauthorizedHandler) {
      unauthorizedHandler(message);
    }

    throw new ApiError(message, 401, code, body?.error?.details);
  }

  // 403 Forbidden Handling
  if (response.status === 403) {
    const code = body?.error?.code || 'FORBIDDEN_ROLE';
    const message = body?.message || 'Access denied. You do not have permission to perform this action.';
    throw new ApiError(message, 403, code, body?.error?.details);
  }

  // Generic Failure Check
  if (!response.ok || (body && body.success === false)) {
    const message = body?.message || `Request failed with status ${response.status}`;
    const code = body?.error?.code || 'API_ERROR';
    throw new ApiError(message, response.status, code, body?.error?.details);
  }

  return body as ApiResponse<T>;
}
