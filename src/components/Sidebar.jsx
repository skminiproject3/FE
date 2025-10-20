import { NavLink, useNavigate } from 'react-router-dom';
import '../styles/Sidebar.css';

function Sidebar() {
  const navigate = useNavigate(); // ✅ 올바른 위치

  const handleLogout = () => {
    // ✅ 필요 시 인증 토큰이나 사용자 정보 제거
    localStorage.removeItem('token');
    sessionStorage.clear();

    // ✅ 로그인 페이지로 이동
    navigate('/login');
  };

  // ✅ return은 여기! (컴포넌트 반환 부분)
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
        <NavLink
          to="/board"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="icon" aria-hidden>🏠</span> 대시보드
        </NavLink>

        <NavLink to="/main" className="nav-item">
          <span className="icon" aria-hidden>📁</span> 파일 업로드
        </NavLink>

        <NavLink to="/quiz" className="nav-item">
          <span className="icon" aria-hidden>📚</span> 퀴즈
        </NavLink>

        <NavLink to="/result" className="nav-item">
          <span className="icon" aria-hidden>📈</span> 퀴즈 결과
        </NavLink>
      </nav>

      {/* === 하단 로그아웃 === */}
      <div className="logout" onClick={handleLogout}>
        로그아웃
      </div>
    </aside>
  );
}

export default Sidebar;
