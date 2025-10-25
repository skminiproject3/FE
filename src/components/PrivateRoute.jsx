// src/components/PrivateRoute.jsx
import { Navigate } from "react-router-dom";

export default function PrivateRoute({ element }) {
  const rawToken = localStorage.getItem("accessToken");
  const token =
    rawToken && rawToken !== "null" && rawToken !== "undefined" && rawToken !== ""
      ? rawToken
      : null;

  const expireRaw = localStorage.getItem("accessTokenExpiresAt");

  // expiresAt 파싱 (ms/seconds/ISO 모두 대응)
  const parseExpire = (v) => {
    if (!v) return null;
    const n = Number(v);
    if (!Number.isNaN(n)) {
      // seconds로 저장했으면 ms로 변환 필요
      return n < 1e12 ? n * 1000 : n; // 1e12보다 작으면 seconds로 판단
    }
    const t = Date.parse(v); // ISO 문자열인 경우
    return Number.isNaN(t) ? null : t;
  };

  const expire = parseExpire(expireRaw);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (expire && Date.now() > expire) {
    // 필요한 키만 지우는 게 안전
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("accessTokenExpiresAt");
    alert("로그인 시간이 만료되었습니다.");
    return <Navigate to="/login" replace />;
  }

  return element;
}
