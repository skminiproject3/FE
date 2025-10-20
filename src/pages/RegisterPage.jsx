import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // 가입 후 이동이 필요하면 사용
import "../styles/RegisterPage.css";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    // TODO: 회원가입 API 연동
    // 예: await api.register({ name, id, pw });

    // 임시 동작: 가입 성공 가정 후 로그인 페이지로 이동
    navigate("/");
  };

  const disabled = !name.trim() || !id.trim() || !pw;

  return (
    <div className="register-container">
      <div className="register-box">
        {/* 상단 로고/브랜드 */}
        <div className="logo-section">
          <span className="logo-icon" role="img" aria-label="notebook">
            📒
          </span>
          <div className="logo-text">
            <div>AI 학습 노트</div>
            <div>도우미</div>
          </div>
        </div>

        <h2 className="register-title">회원가입</h2>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="register-row">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="register-row">
            <label htmlFor="rid">ID</label>
            <input
              id="rid"
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
            />
          </div>

          <div className="register-row">
            <label htmlFor="pw">PW</label>
            <input
              id="pw"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="register-btn"
            disabled={disabled}
            aria-disabled={disabled}
          >
            가입하기
          </button>
        </form>
      </div>
    </div>
  );
}
