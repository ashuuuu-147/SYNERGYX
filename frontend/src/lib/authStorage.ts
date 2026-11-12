/**
 * Session storage helper for JWT authentication tokens.
 * In accordance with SYNERGYX security specification, tokens are stored
 * in sessionStorage exclusively and never localStorage.
 */

const TOKEN_KEY = 'synergyx_access_token';

export const authStorage = {
  getToken: (): string | null => {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setToken: (token: string): void => {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.error('Failed to write token to sessionStorage', e);
    }
  },

  clearToken: (): void => {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error('Failed to clear token from sessionStorage', e);
    }
  },

  isAuthenticated: (): boolean => {
    return !!authStorage.getToken();
  },
};
