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

/** True if a non-expired token exists in localStorage (signature verified by API). */
export function isAuthenticated(): boolean {
  const token = getAuthToken();
  if (!token) return false;
  const exp = readTokenExpiry(token);
  if (exp !== null && exp < Date.now()) {
    clearAuthSession();
    return false;
  }
  return true;
}

function readTokenExpiry(token: string): number | null {
  try {
    const [data] = token.split(".");
    if (!data) return null;
    const payload = JSON.parse(atob(data.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

/** Clear session and send user to login (used on API 401). */
export function redirectToLogin() {
  clearAuthSession();
  const base = (import.meta.env.BASE_URL || "/certificates/").replace(/\/?$/, "/");
  const loginUrl = `${window.location.origin}${base}login`;
  if (!window.location.pathname.replace(/\/$/, "").endsWith("/login")) {
    window.location.assign(loginUrl);
  }
}
