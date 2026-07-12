const TOKEN_KEY = "iqmath_cert_auth_token";
const EMAIL_KEY = "iqmath_cert_auth_email";

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAuthEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}

export function setAuthSession(token: string, email: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EMAIL_KEY, email);
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getAuthToken());
}
