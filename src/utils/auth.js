// 📁 src/utils/auth.js
// JJWT로 만든 토큰 포맷에 맞춰 관리: accessToken, refreshToken, expiresIn(=만료 시각 ms)

const ACCESS = "accessToken";
const REFRESH = "refreshToken";
const EXPIRES_AT = "accessTokenExpiresAt";

export function saveTokens({ accessToken, refreshToken, expiresIn }) {
  if (accessToken) localStorage.setItem(ACCESS, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH, refreshToken);
  if (expiresIn) localStorage.setItem(EXPIRES_AT, String(expiresIn)); // epoch ms
}

export function clearTokens() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  localStorage.removeItem(EXPIRES_AT);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS);
}
export function getRefreshToken() {
  return localStorage.getItem(REFRESH);
}
export function getAccessTokenExpiresAt() {
  const v = localStorage.getItem(EXPIRES_AT);
  return v ? Number(v) : 0;
}

export function isAccessTokenExpired() {
  const expMs = getAccessTokenExpiresAt();
  if (!expMs) return true;
  return Date.now() >= expMs;
}

// ── (옵션) JWT payload 디코딩 (검증 아님! UI용 표시)
// sub: email, auth: "ROLE_USER,ROLE_ADMIN" 같은 문자열
export function decodeJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getUserFromToken() {
  const t = getAccessToken();
  if (!t) return null;
  const payload = decodeJwt(t);
  if (!payload) return null;
  return {
    email: payload.sub || "",
    roles: (payload.auth || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean),
  };
}