import { AuthState, GoogleTokenResponse } from '../types/auth';

const STORAGE_KEYS = {
  CLIENT_ID: 'gtasks_client_id',
  ACCESS_TOKEN: 'gtasks_access_token',
  EXPIRES_AT: 'gtasks_token_expires_at',
  IS_DEMO: 'gtasks_is_demo_mode',
};

const TASKS_SCOPE = 'https://www.googleapis.com/auth/tasks';

type AuthListener = (state: AuthState) => void;
const listeners = new Set<AuthListener>();

function notifyListeners(state: AuthState) {
  listeners.forEach((listener) => listener(state));
}

export function subscribeAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getStoredClientId(): string {
  return (
    localStorage.getItem(STORAGE_KEYS.CLIENT_ID) ||
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    ''
  );
}

export function setStoredClientId(clientId: string): void {
  if (clientId.trim()) {
    localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId.trim());
  } else {
    localStorage.removeItem(STORAGE_KEYS.CLIENT_ID);
  }
}

export function isDemoMode(): boolean {
  const val = localStorage.getItem(STORAGE_KEYS.IS_DEMO);
  // Default to demo mode if no client ID is saved yet
  if (val === null) {
    return !getStoredClientId();
  }
  return val === 'true';
}

export function setDemoMode(isDemo: boolean): void {
  localStorage.setItem(STORAGE_KEYS.IS_DEMO, isDemo ? 'true' : 'false');
  notifyListeners(getAuthState());
}

export function getAuthState(): AuthState {
  const clientId = getStoredClientId();
  const isDemo = isDemoMode();
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const expiresAtStr = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
  const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : null;

  const isExpired = expiresAt ? Date.now() >= expiresAt : true;
  const isAuthenticated = !isDemo && !!accessToken && !isExpired;

  return {
    isAuthenticated,
    accessToken: isAuthenticated ? accessToken : null,
    expiresAt,
    clientId,
    isDemoMode: isDemo,
  };
}

let tokenClientInstance: any = null;

/**
 * Request OAuth 2.0 Access Token via Google Identity Services popup
 */
export async function loginWithGoogle(): Promise<AuthState> {
  const clientId = getStoredClientId();
  if (!clientId) {
    throw new Error('未配置 Google Client ID，请先在设置中填写。');
  }

  // Ensure window.google.accounts.oauth2 is loaded
  if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
    throw new Error(
      'Google 登录 SDK 尚未加载完成，请检查网络连接或稍后重试。'
    );
  }

  return new Promise((resolve, reject) => {
    try {
      tokenClientInstance = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: TASKS_SCOPE,
        callback: (response: GoogleTokenResponse) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }

          const now = Date.now();
          // expires_in is in seconds, buffer by 60 seconds
          const expiresAt = now + (response.expires_in - 60) * 1000;

          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.access_token);
          localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
          localStorage.setItem(STORAGE_KEYS.IS_DEMO, 'false');

          const newState: AuthState = {
            isAuthenticated: true,
            accessToken: response.access_token,
            expiresAt,
            clientId,
            isDemoMode: false,
          };

          notifyListeners(newState);
          resolve(newState);
        },
        error_callback: (err: unknown) => {
          reject(err);
        },
      });

      tokenClientInstance.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Sign out and clear stored OAuth tokens
 */
export function logoutGoogle(): void {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (token && window.google?.accounts?.oauth2?.revoke) {
    try {
      window.google.accounts.oauth2.revoke(token, () => {});
    } catch (e) {
      console.warn('Revoke token failed:', e);
    }
  }

  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);

  notifyListeners(getAuthState());
}
