// 📁 src/pages/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios"; // ✅ 공통 axios 인스턴스 사용
import "../styles/LoginPage.css";

/** JWT의 exp(만료시각, seconds) → ms 타임스탬프로 변환 */
function getExpMsFromJwt(token) {
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (payload?.exp) return payload.exp * 1000; // seconds → ms
  } catch (e) {
    alert("JWT 만료문제", e);
  }
  return null;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setErrorMsg("");
    setSubmitting(true);

    try {
      console.log("[LOGIN] try login →", { email });

      // ✅ 환경변수 기반 axios 인스턴스 사용 (/api 자동 prefix)
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      const data = res?.data || {};
      let accessToken =
        data.accessToken ||
        data.token ||
        res.headers?.authorization?.replace(/^Bearer\s+/i, "");
      const refreshToken = data.refreshToken || null;

      if (!accessToken) {
        throw new Error("서버 응답에 accessToken이 없습니다.");
      }

      // 만료시각 계산
      let expiresAtMs = null;
      if (typeof data.expiresIn === "number") {
        const now = Date.now();
        expiresAtMs =
          now + (data.expiresIn > 1e12 ? data.expiresIn : data.expiresIn * 1000);
      } else {
        expiresAtMs = getExpMsFromJwt(accessToken);
      }

      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      if (expiresAtMs) localStorage.setItem("accessTokenExpiresAt", String(expiresAtMs));

      console.log("[LOGIN] success. token(short) =", accessToken.slice(0, 16) + "...");
      alert("로그인 성공!");
      navigate("/main", { replace: true });
    } catch (err) {
      console.error("[LOGIN] failed:", err);

      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "로그인에 실패했습니다. 이메일 또는 비밀번호를 확인하세요.";
      setErrorMsg(apiMsg);

      if (err?.response) {
        console.log("[LOGIN][debug] status:", err.response.status);
        console.log("[LOGIN][debug] headers:", err.response.headers);
        console.log("[LOGIN][debug] body:", err.response.data);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        {/* 상단 로고/타이틀 */}
        <div className="logo-section">
          <span className="logo-icon" role="img" aria-label="notebook">
            📒
          </span>
          <div className="logo-text">
            <div>AI 학습 노트</div>
            <div>도우미</div>
          </div>
        </div>

        <h2 className="login-title">로그인</h2>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-row">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="input-row">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {errorMsg && <div className="login-error">{errorMsg}</div>}

          <button type="submit" className="login-btn" disabled={submitting}>
            {submitting ? "로그인 중..." : "로그인"}
          </button>

          <button
            type="button"
            className="signup-btn"
            onClick={() => navigate("/register")}
            disabled={submitting}
          >
            회원가입
          </button>
        </form>
      </div>
    </div>
  );
}
