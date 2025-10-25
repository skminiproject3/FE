// src/pages/DashBoardPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/global.css";
import "../styles/DashBoardPage.css";
import Sidebar from "../components/Sidebar";
import { fetchUserContents } from "../api/contentApi";
import api from "../api/axios";

function DashBoardPage() {
  const [fileCount, setFileCount] = useState(0);      // 전체 업로드 파일 수
  const [progressList, setProgressList] = useState([]); // 콘텐츠별 최신 정답률
  const [quizCount, setQuizCount] = useState(0);      // 정답률>0 인 콘텐츠 수 (임시 지표)
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("로그인이 필요한 서비스입니다.");
      navigate("/login");
      return;
    }

    const loadDashboardData = async () => {
      try {
        // 1) 내 콘텐츠 목록
        const contents = await fetchUserContents(); // [{ id, title, ... }]
        setFileCount(Array.isArray(contents) ? contents.length : 0);

        // 2) 콘텐츠별 최신 배치의 최신 attempt 정답률 계산
        const token = localStorage.getItem("accessToken");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const toAccuracy = (attempt) => {
          if (!attempt) return 0;
          // score 우선: 0~1 → %, 0~100 → 그대로
          let acc = null;
          if (attempt.score != null) {
            const s = Number(attempt.score);
            if (Number.isFinite(s)) acc = s <= 1 ? s * 100 : s;
          }
          // 없으면 correct/total
          if (acc == null && Number(attempt.total_questions) > 0) {
            const c = Number(attempt.correct_answers || 0);
            const t = Number(attempt.total_questions || 0);
            if (t > 0) acc = (c / t) * 100;
          }
          return acc != null ? Number(acc.toFixed(1)) : 0;
        };

        // 전체 attempts 가져오기
        const fetchAllAttempts = async (contentId) => {
          const { data } = await api.get(`/contents/${contentId}/quiz/attempts`, { headers });
          return data;
        };

        // 최신 배치에서 최신 attempt 고르기
        const pickLatestAttempt = (attempts = []) => {
          if (!Array.isArray(attempts) || attempts.length === 0) return null;
          const maxBatch = attempts.reduce(
            (m, a) => Math.max(m, Number(a?.batch) || 0),
            0
          );
          const inLatest = attempts.filter(a => Number(a?.batch) === maxBatch);
          if (inLatest.length === 0) return null;
          inLatest.sort((a, b) =>
            (Date.parse(b?.created_at || 0) - Date.parse(a?.created_at || 0)) ||
            ((Number(b?.attempt_id) || 0) - (Number(a?.attempt_id) || 0))
          );
          return inLatest[0];
        };

        const results = await Promise.all(
          (contents || []).map(async (c) => {
            const cid = c.id ?? c.contentId ?? c.content_id;
            const title = c.title ?? c.name ?? `콘텐츠 #${cid}`;
            try {
              const data = await fetchAllAttempts(cid);
              const attempts = Array.isArray(data?.attempts) ? data.attempts : [];
              const latest = pickLatestAttempt(attempts);
              const accuracy = toAccuracy(latest);
              return { contentId: cid, title, accuracy_rate: accuracy };
            } catch (e) {
              console.warn("퀴즈 시도 로드 실패:", {
                contentId: cid,
                message: e?.message,
                status: e?.response?.status,
                data: e?.response?.data,
              });
              return { contentId: cid, title, accuracy_rate: 0 };
            }
          })
        );

        results.sort((a, b) => b.accuracy_rate - a.accuracy_rate);
        setProgressList(results);

        // 3) 퀴즈 수 집계(임시: 정답률>0 인 콘텐츠 개수)
        setQuizCount(results.filter(r => r.accuracy_rate > 0).length);
      } catch (error) {
        console.error("대시보드 데이터 로드 실패:", {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
          url: error?.config?.url,
          params: error?.config?.params,
        });
      }
    };

    loadDashboardData();
  }, [navigate]);

  // 슬라이드
  const ITEMS_PER_PAGE = 3;
  const maxIndex = Math.max(0, Math.ceil(progressList.length / ITEMS_PER_PAGE) - 1);

  const nextSlide = () => setIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
  const prevSlide = () => setIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));

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

          {/* 학습 현황 */}
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
                  className={`progress-card-item ${item.accuracy_rate === 100 ? "excellent" : ""}`}
                >
                  <h4>{item.title}</h4>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${item.accuracy_rate}%` }}
                    />
                  </div>
                  <p>정답률: {item.accuracy_rate}%</p>
                </div>
              ))}
              {visibleItems.length === 0 && (
                <div style={{ opacity: 0.7, padding: "8px 0" }}>
                  표시할 학습 현황이 없습니다.
                </div>
              )}
            </div>
          </section>

          {/* 업로드된 파일 (전체 기준) */}
          <div className="card">
            <span>
              업로드된 파일: <b>{fileCount}건</b>
            </span>
            <button onClick={() => navigate("/file")}>🔎 보기</button>
          </div>

          {/* 퀴즈 진행 현황 */}
          <div className="card">
            <span>
              완성된 퀴즈 수: <b>{quizCount}건</b>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashBoardPage;
