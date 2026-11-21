import { ENV } from '../config/env';
import { ApiError } from '../types/api';
import type { User } from '../types/models';

export const ACTIVE_USER_STORAGE_KEY = 'musicshare_v1_active_user';
export const ACTIVE_TOKEN_STORAGE_KEY = 'musicshare_v1_auth_token';

let inMemoryActiveUser: User | null = null;
let inMemoryAuthToken: string | null = null;

export function setActiveUserSession(user: User | null, token?: string | null): void {
  inMemoryActiveUser = user;
  if (!user) {
    inMemoryAuthToken = null;
  } else if (token !== undefined) {
    inMemoryAuthToken = token;
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (user) {
        window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(user));
        if (token !== undefined) {
          if (token) {
            window.localStorage.setItem(ACTIVE_TOKEN_STORAGE_KEY, token);
          } else {
            window.localStorage.removeItem(ACTIVE_TOKEN_STORAGE_KEY);
          }
        }
      } else {
        window.localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
        window.localStorage.removeItem(ACTIVE_TOKEN_STORAGE_KEY);
      }
    }
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function getActiveUserSession(): User | null {
  if (inMemoryActiveUser) {
    return inMemoryActiveUser;
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as User;
        inMemoryActiveUser = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore corrupted storage
  }
  return null;
}

export function getActiveAuthToken(): string | null {
  if (inMemoryAuthToken) {
    return inMemoryAuthToken;
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = window.localStorage.getItem(ACTIVE_TOKEN_STORAGE_KEY);
      if (token) {
        inMemoryAuthToken = token;
        return token;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

export function buildMockAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const user = getActiveUserSession();
  const token = getActiveAuthToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (user) {
    headers['X-User-Id'] = user.id;
    const backendRole =
      user.role === 'owner' ? 'propietario' : user.role === 'admin' ? 'administrador' : 'musico';
    headers['X-User-Role'] = backendRole;
    headers['X-User-Name'] = encodeURIComponent(user.name);
    headers['X-User-Email'] = user.email;
  }

  return headers;
}

export interface BackendEnvelope<T> {
  message?: string;
  data: T;
  success?: boolean;
}

export interface HttpRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | boolean | undefined | null>;
}

function buildUrl(path: string, query?: HttpRequestOptions['query']): string {
  const cleanBase = ENV.apiBaseUrl.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${cleanBase}${cleanPath}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '' && value !== 'all') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export async function httpRequest<T>(
  path: string,
  options: HttpRequestOptions = {},
): Promise<T> {
  const { body, query, headers: customHeaders, ...rest } = options;

  const headers = new Headers(customHeaders);
  headers.set('Accept', 'application/json');

  const authHeaders = buildMockAuthHeaders();
  for (const [key, value] of Object.entries(authHeaders)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }

  let preparedBody: BodyInit | undefined;
  if (body !== undefined) {
    if (body instanceof FormData || body instanceof Blob || typeof body === 'string') {
      preparedBody = body;
    } else {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      preparedBody = JSON.stringify(body);
    }
  }

  let response: Response;
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 4000);

  try {
    response = await fetch(buildUrl(path, query), {
      ...rest,
      signal: rest.signal || timeoutController.signal,
      headers,
      body: preparedBody,
    });
  } catch (networkError) {
    throw new ApiError({
      message: `No se pudo conectar con el servidor backend (${ENV.apiBaseUrl}). Asegúrate de que Floci esté corriendo con '.\\musicshare.ps1 start'.`,
      status: 0,
      details: networkError,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    let detail = `Error HTTP ${response.status}`;
    if (typeof parsed === 'object' && parsed !== null) {
      const p = parsed as Record<string, unknown>;
      const errorObj = p.error as Record<string, unknown> | undefined;
      if (errorObj && typeof errorObj === 'object' && errorObj.message) {
        detail = String(errorObj.message);
      } else if (p.message) {
        detail = String(p.message);
      } else if (p.detail) {
        detail = String(p.detail);
      }
    }

    throw new ApiError({
      message: detail,
      status: response.status,
      details: parsed,
    });
  }

  return parsed as T;
}

export async function httpDataRequest<T>(
  path: string,
  options: HttpRequestOptions = {},
): Promise<T> {
  const res = await httpRequest<BackendEnvelope<T> | T>(path, options);
  if (res && typeof res === 'object' && 'data' in res) {
    return (res as BackendEnvelope<T>).data;
  }
  return res as T;
}
