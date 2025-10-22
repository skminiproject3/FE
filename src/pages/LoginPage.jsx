// src/pages/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/LoginPage.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);

      const { data } = await axios.post(
        "http://localhost:8080/api/auth/login",
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      // ✅ 백엔드(JwtTokenProvider) 응답에 맞춰 저장
      //    { accessToken, refreshToken, expiresIn }
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      localStorage.setItem("accessTokenExpiresAt", String(data.expiresIn));

      alert("로그인 성공!");
      navigate("/main", { replace: true });
    } catch (err) {
      console.error("로그인 실패:", err);
      alert("로그인에 실패했습니다. 이메일 또는 비밀번호를 확인하세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        {/* 상단 로고/타이틀 */}
        <div className="logo-section">
          <span className="logo-icon" role="img" aria-label="notebook">📒</span>
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
              type="text"
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