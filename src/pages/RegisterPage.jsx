// src/pages/RegisterPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/RegisterPage.css";

export default function RegisterPage() {
  // 백엔드 명세: username, email, password
  const [username, setUsername] = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const disabled = !username.trim() || !email.trim() || !password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setError("");
    setSubmitting(true);

    try {
      const { data } = await axios.post(
        "http://localhost:8080/api/auth/signup", // ✅ 경로 확인!
        { email, password, username },
        { headers: { "Content-Type": "application/json" } }
      );

      // 성공 예시 응답: { userId, email, username }
      console.log("가입 성공:", data);
      alert("✅ 회원가입 성공! 로그인 페이지로 이동합니다.");
      navigate("/login", { replace: true });
    } catch (err) {
      console.error(err);

      // 서버에서 표준 오류 응답을 내려주는 경우 처리 (예: {errorCode, message, field})
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "회원가입에 실패했습니다. 입력값을 확인해주세요.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <div className="logo-section">
          <span className="logo-icon" role="img" aria-label="notebook">📒</span>
          <div className="logo-text">
            <div>AI 학습 노트</div>
            <div>도우미</div>
          </div>
        </div>

        <h2 className="register-title">회원가입</h2>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="register-row">
            <label htmlFor="username">Name</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="register-row">
            <label htmlFor="email">Email (ID)</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="register-row">
            <label htmlFor="pw">Password</label>
            <input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          {error && <div className="register-error">{error}</div>}

          <button
            type="submit"
            className="register-btn"
            disabled={submitting || disabled}
            aria-disabled={submitting || disabled}
          >
            {submitting ? "가입 중..." : "가입하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
