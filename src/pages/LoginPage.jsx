import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ 추가
import "../styles/LoginPage.css";

export default function LoginPage() {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const navigate = useNavigate(); // ✅ 페이지 이동 훅

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("로그인 시도:", id, pw);
    // 로그인 로직 작성 가능
  };

  return (
    <div className="login-container">
      <div className="login-box">
        {/* 상단 로고 */}
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
            <label htmlFor="id">ID</label>
            <input
              type="text"
              id="id"
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
            />
          </div>

          <div className="input-row">
            <label htmlFor="pw">PW</label>
            <input
              type="password"
              id="pw"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-btn">
            로그인
          </button>

          {/* ✅ 회원가입 버튼 클릭 시 /register로 이동 */}
          <button
            type="button"
            className="signup-btn"
            onClick={() => navigate("/register")}
          >
            회원가입
          </button>
        </form>
      </div>
    </div>
  );
}
