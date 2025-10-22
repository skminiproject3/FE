import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/global.css";
import "../styles/DashBoardPage.css";
import Sidebar from "../components/Sidebar";

function DashBoardPage() {
  const [todayCount, setTodayCount] = useState(0);
  const [progressList, setProgressList] = useState([]);
  const [quizCount, setQuizCount] = useState(0);
  const [index, setIndex] = useState(0); // 현재 페이지 인덱스
  const navigate = useNavigate();

  useEffect(() => {
    const demoContents = [
      { id: 1, title: "AI 개론", createdAt: "2025-10-21T09:00:00Z" },
      { id: 2, title: "자료구조 10장", createdAt: "2025-10-21T12:30:00Z" },
      { id: 3, title: "운영체제 5장", createdAt: "2025-10-19T14:00:00Z" },
    ];

    const today = new Date().toISOString().slice(0, 10);
    const todayFiles = demoContents.filter(
      (item) => item.createdAt && item.createdAt.startsWith(today)
    );
    setTodayCount(todayFiles.length);

    // ✅ 정답률 기준 데이터
    const demoProgress = [
      { contentId: 1, title: "자료구조 10장", accuracy_rate: 87.5 },
      { contentId: 2, title: "운영체제 5장", accuracy_rate: 72.3 },
      { contentId: 3, title: "컴퓨터 네트워크", accuracy_rate: 100.0 },
      { contentId: 4, title: "데이터베이스", accuracy_rate: 82.0 },
      { contentId: 5, title: "인공지능", accuracy_rate: 78.0 },
      { contentId: 6, title: "머신러닝", accuracy_rate: 91.0 },
    ];
    setProgressList(demoProgress);

    const demoQuiz = [
      { id: 1, title: "AI 기초 퀴즈", score: 90 },
      { id: 2, title: "운영체제 퀴즈", score: 80 },
      { id: 3, title: "자료구조 퀴즈", score: 100 },
    ];
    setQuizCount(demoQuiz.length);
  }, []);

  const ITEMS_PER_PAGE = 3;
  const maxIndex = Math.ceil(progressList.length / ITEMS_PER_PAGE) - 1;

  const nextSlide = () => {
    setIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
  };

  const prevSlide = () => {
    setIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
  };

  const visibleItems = progressList.slice(
    index * ITEMS_PER_PAGE,
    index * ITEMS_PER_PAGE + ITEMS_PER_PAGE
  );

  return (
    <div className="board-layout">
      <Sidebar />
      <div className="content">
        <div className="dashboard">
          <h1>학습 대시보드</h1>

          {/* 정답률 현황 */}
          <section className="progress-section">
            <div className="progress-header">
              <h2>학습 현황</h2>
              <div className="nav-buttons">
                <button onClick={prevSlide}>◀</button>
                <button onClick={nextSlide}>▶</button>
              </div>
            </div>

            <div className="progress-row">
              {visibleItems.map((item) => (
                <div
                  key={item.contentId}
                  className={`progress-card-item ${
                    item.accuracy_rate == 100 ? "excellent" : ""
                  }`}
                >
                  <h4>{item.title}</h4>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${item.accuracy_rate}%` }}
                    ></div>
                  </div>
                  <p>정답률: {item.accuracy_rate}%</p>
                </div>
              ))}
            </div>
          </section>

          {/* 오늘 업로드된 파일 */}
          <div className="card">
            <span>
              업로드된 파일: <b>{todayCount}건</b>
            </span>
            <button onClick={() => navigate("/file")}>🔎 보기</button>
          </div>

          {/* 퀴즈 진행 현황 */}
          <div className="card">
            <span>
              완성된 퀴즈 수: <b>{quizCount}건</b>
            </span>
            {/* <button onClick={() => navigate("/file")}>📂 열기</button> */}
          </div>

          {/* 퀴즈 결과 */}
          {/* <div className="card">
            <span>퀴즈 결과 리포트</span>
            <button onClick={() => navigate("/file")}>📂 열기</button>
          </div> */}
        </div>
      </div>
    </div>
  );
}

export default DashBoardPage;
