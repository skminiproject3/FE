import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import '../styles/global.css';
import '../styles/DashBoardPage.css';
import Sidebar from '../components/Sidebar';


function MainPage() {
  const [todayCount, setTodayCount] = useState(0);
  const navigate = useNavigate(); 

  useEffect(() => {
    async function fetchContents() {
      try {
        const res = await fetch("http://localhost:3000/contents"); // API 주소 맞게 수정
        const data = await res.json();

        // 오늘 날짜 (YYYY-MM-DD)
        const today = new Date().toISOString().slice(0, 10);

        // 오늘 업로드된 콘텐츠만 필터링
        const todayFiles = data.filter(item =>
          item.createdAt && item.createdAt.startsWith(today)
        );

        setTodayCount(todayFiles.length);
      } catch (err) {
        console.error("콘텐츠 조회 실패:", err);
      }
    }

    fetchContents();
  }, []);

  return (
    <div className="board-layout">
      <Sidebar />
      <div className="content">
        <div className="dashboard">
          <h1>대시보드</h1>

          <div className="card">
            <span>오늘 업로드된 파일: <b>{todayCount}건</b></span>
            <button>🔎 보기</button>
          </div>

          <div className="card">
            <span>완성된 퀴즈 수: <b>0건</b></span>
            <button>📂 열기</button>
          </div>

          <div className="card">
            <span>퀴즈 결과 리포트</span>
            <button onClick={() => navigate('/result')}>📂 열기</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainPage;
