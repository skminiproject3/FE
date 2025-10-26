// src/pages/DashBoardPage.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/global.css";
import "../styles/DashBoardPage.css";
import Sidebar from "../components/Sidebar";
import { fetchUserContents } from "../api/contentApi";
import api from "../api/axios";

/** JWT payload 꺼내기 (외부 라이브러리 없이) */
function parseJwtPayload(token) {
  try {
    if (!token) return null;
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

/** 숫자(0~1 or 0~100)를 % 스케일로 표준화 */
function normalizePercent(n) {
  if (n == null || Number.isNaN(Number(n))) return 0;
  const v = Number(n);
  const pct = v <= 1 ? v * 100 : v;
  return Math.max(0, Math.min(100, Number(pct.toFixed(1))));
}

export default function DashBoardPage() {
  const [fileCount, setFileCount] = useState(0);        // 전체 업로드 파일 수
  const [progressList, setProgressList] = useState([]); // 콘텐츠별 최신 정답률(or 진행률)
  const [, setQuizCount] = useState(0);                 // 정답률 > 0 콘텐츠 수
  const [index, setIndex] = useState(0);

  const navigate = useNavigate();
  const { state } = useLocation() || {};
  // ✅ ResultPage에서 넘어온 "고정할 시도"
  const pinnedAttemptId = state?.attemptId ?? null;
  const pinnedContentId = state?.contentId ?? null;

  /** 특정 attempt 요약을 서버에서 받아오기 */
  const fetchAttemptSummary = useCallback(async (contentId, attemptId, token) => {
    if (!contentId || !attemptId) return null;
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      // 컨트롤러에 추가한 단건 요약 API
      const { data } = await api.get(`/contents/${contentId}/quiz/attempts/${attemptId}`, { headers });
      // data: { attempt_id, score, correct_answers, total_questions, quiz_batch, created_at }
      const scorePct = normalizePercent(data?.score);
      return {
        contentId,
        title: `콘텐츠 #${contentId}`,
        accuracy_rate: scorePct,
        pinned: true,
        batch: data?.quiz_batch,
        created_at: data?.created_at,
      };
    } catch (e) {
      console.warn("pinned attempt summary fetch failed:", e?.response?.status, e?.response?.data);
      return null;
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("로그인이 필요한 서비스입니다.");
      navigate("/login");
      return;
    }

    try {
      // 1) 내 콘텐츠 목록
      const contents = await fetchUserContents(); // [{ id|contentId, title, ... }]
      const list = Array.isArray(contents) ? contents : [];
      setFileCount(list.length);

      // 2) 우선 최신 Progress API로 시도
      let progressData = null;

      // (1) /progress/me
      try {
        const { data } = await api.get("/progress/me");
        if (Array.isArray(data)) progressData = data;
      } catch (e) {
        console.warn("progress/me 실패:", e?.response?.status, e?.response?.data);
      }

      // (2) /progress/{userId}
      if (!progressData) {
        const payload = parseJwtPayload(token);
        const claimUserId = payload?.userId ?? payload?.uid ?? payload?.id ?? payload?.sub ?? null;
        if (claimUserId != null) {
          try {
            const { data } = await api.get(`/progress/${claimUserId}`);
            if (Array.isArray(data)) progressData = data;
          } catch (e) {
            console.warn(`progress/${claimUserId} 실패:`, e?.response?.status, e?.response?.data);
          }
        }
      }

      /** Progress 응답을 표준화 */
      const mapProgressToList = (pArr) => {
        return (pArr || []).map((p) => {
          const cid = p.contentId ?? p.id ?? p.content_id;
          const title = p.title ?? p.name ?? `콘텐츠 #${cid}`;
          const scoreCandidate =
            p.recentScore ?? p.accuracy ?? p.progress?.accuracy ?? p.progress?.recentScore ?? 0;
          const accuracy_rate = normalizePercent(scoreCandidate);
          return { contentId: cid, title, accuracy_rate };
        });
      };

      /** 구버전 폴백: attempts 기반 */
      const fallbackFromAttempts = async () => {
        const headers = { Authorization: `Bearer ${token}` };

        const toAccuracyFromAttempt = (attempt) => {
          if (!attempt) return 0;
          // 1) score 우선
          if (attempt.score != null) {
            const s = Number(attempt.score);
            if (Number.isFinite(s)) return normalizePercent(s);
          }
          // 2) correct/total
          const total = Number(attempt.total_questions ?? attempt.total ?? 0);
          const correct = Number(attempt.correct_answers ?? attempt.correct ?? 0);
          if (total > 0) return normalizePercent((correct / total) * 100);
          return 0;
        };

        const fetchAllAttempts = async (contentId) => {
          const { data } = await api.get(`/contents/${contentId}/quiz/attempts`, { headers });
          return data;
        };

        const pickLatestAttempt = (attempts = []) => {
          if (!Array.isArray(attempts) || attempts.length === 0) return null;
          const maxBatch = attempts.reduce((m, a) => Math.max(m, Number(a?.batch) || 0), 0);
          const inLatest = attempts.filter((a) => Number(a?.batch) === maxBatch);
          if (inLatest.length === 0) return null;
          inLatest.sort(
            (a, b) =>
              (Date.parse(b?.created_at || 0) - Date.parse(a?.created_at || 0)) ||
              ((Number(b?.attempt_id) || 0) - (Number(a?.attempt_id) || 0))
          );
          return inLatest[0];
        };

        const results = await Promise.all(
          (list || []).map(async (c) => {
            const cid = c.id ?? c.contentId ?? c.content_id;
            const title = c.title ?? c.name ?? `콘텐츠 #${cid}`;
            try {
              const data = await fetchAllAttempts(cid);
              const attempts = Array.isArray(data?.attempts) ? data.attempts : [];
              const latest = pickLatestAttempt(attempts);
              const accuracy = toAccuracyFromAttempt(latest);
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

        return results;
      };

      // 3) Progress 기준 목록 생성 or 폴백 생성
      let mapped = progressData && progressData.length > 0
        ? mapProgressToList(progressData)
        : await fallbackFromAttempts();

      // 4) ✅ ResultPage에서 넘어온 “고정 시도”가 있으면 해당 콘텐츠의 정답률을 덮어쓰기
      if (pinnedAttemptId && pinnedContentId) {
        const pinned = await fetchAttemptSummary(pinnedContentId, pinnedAttemptId, token);
        if (pinned) {
          // 리스트에서 해당 콘텐츠 항목 찾기
          const idx = mapped.findIndex(
            (x) => Number(x.contentId) === Number(pinnedContentId)
          );
          const title =
            idx >= 0 ? mapped[idx].title : (list.find((c) => (c.id ?? c.contentId ?? c.content_id) === pinnedContentId)?.title ?? `콘텐츠 #${pinnedContentId}`);

          const pinnedRow = {
            contentId: pinnedContentId,
            title,
            accuracy_rate: pinned.accuracy_rate,
            // pinned 표시를 원하면 UI에 활용 가능
          };

          if (idx >= 0) {
            mapped[idx] = pinnedRow; // 덮어쓰기
          } else {
            mapped.push(pinnedRow); // 없으면 추가
          }
        }
      }

      // 5) 정렬 및 상태 반영
      mapped.sort((a, b) => b.accuracy_rate - a.accuracy_rate);
      setProgressList(mapped);
      setQuizCount(mapped.filter((r) => r.accuracy_rate > 0).length);
    } catch (error) {
      console.error("대시보드 데이터 로드 실패:", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        url: error?.config?.url,
        params: error?.config?.params,
      });
    }
  }, [navigate, pinnedAttemptId, pinnedContentId, fetchAttemptSummary]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // 슬라이드
  const ITEMS_PER_PAGE = 3;
  const maxIndex = Math.max(0, Math.ceil(progressList.length / ITEMS_PER_PAGE) - 1);

  const nextSlide = () => setIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
  const prevSlide = () => setIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));

  const visibleItems = useMemo(
    () => progressList.slice(index * ITEMS_PER_PAGE, index * ITEMS_PER_PAGE + ITEMS_PER_PAGE),
    [progressList, index]
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

          {/* (선택) 완성된 퀴즈 수 보여주고 싶으면 아래 블록을 다시 노출 */}
          {/* <div className="card">
            <span>
              완성된 퀴즈 수: <b>{quizCount}건</b>
            </span>
          </div> */}
        </div>
      </div>
    </div>
  );
}
