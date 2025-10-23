import { NavLink, useNavigate } from "react-router-dom";
import "../styles/Sidebar.css";

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // ✅ JWT 토큰/만료 저장 값 삭제
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("accessTokenExpiresAt");

    sessionStorage.clear(); // (선택 사항)

    // 로그인 페이지로 이동
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sidebar">
      {/* === 상단 타이틀 === */}
      <div className="sidebar-header">
        <span className="logo" aria-hidden>📝</span>
        <div className="title-wrap">
          <div className="title">AI 학습 노트</div>
          <div className="subtitle">도우미</div>
        </div>
      </div>

      {/* === 메뉴 === */}
      <nav className="nav">
        <NavLink to="/board" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
          <span className="icon" aria-hidden>🏠</span> 대시보드
        </NavLink>

        <NavLink to="/main" className="nav-item">
          <span className="icon" aria-hidden>📁</span> 파일 업로드
        </NavLink>

        <NavLink to="/file" className="nav-item">
          <span className="icon" aria-hidden>📚</span> AI 분석 결과
        </NavLink>

        {/* <NavLink to="/result" className="nav-item">
          <span className="icon" aria-hidden>📈</span> 퀴즈 결과
        </NavLink> */}
      </nav>

      {/* === 하단 로그아웃 === */}
      <div className="logout" onClick={handleLogout}>
        로그아웃
      </div>
    </aside>
  );
}

export default Sidebar;