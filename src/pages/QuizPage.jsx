// src/pages/QuizPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import "../styles/global.css";
import "../styles/QuizPage.css";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

// ✅ "하/중/상" 또는 영문이 들어와도 서버 enum(EASY/MEDIUM/HARD)로 정규화
function normalizeDifficulty(d) {
  const s = String(d || "").trim().toUpperCase();
  if (["하", "LOW", "EASY"].includes(s)) return "EASY";
  if (["상", "HIGH", "HARD"].includes(s)) return "HARD";
  return "MEDIUM"; // 기본
}

export default function QuizPage() {
  const location = useLocation();
  const { state } = location || {};
  const navigate = useNavigate();

  // 복구 우선순위: location.state → URL ?n= → sessionStorage → 기본값
  const search = new URLSearchParams(location.search);
  const nFromQuery = Number(search.get("n"));
  const stored = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("lastQuizConfig") || "{}");
    } catch {
      return {};
    }
  })();

  const contentId = state?.contentId ?? stored.contentId;
  const titleFromState = state?.title ?? stored.title ?? "퀴즈";
  const difficultyRaw = state?.difficulty ?? stored.difficulty ?? "MEDIUM";
  const difficulty = normalizeDifficulty(difficultyRaw);

  const numQuestions = (() => {
    const raw = state?.count ?? (Number.isFinite(nFromQuery) ? nFromQuery : stored.count);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 5;
  })();

  // 상태
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quiz, setQuiz] = useState(null);           // {title, questions:[{id,text,options:[{id,text,letter}], explanation}]}
  const [answers, setAnswers] = useState({});       // { [quiz_id]: optionId }
  const [submitting, setSubmitting] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(null);

  useEffect(() => {
    if (!contentId) {
      setError("콘텐츠 ID가 없어 퀴즈를 생성할 수 없습니다.");
      setLoading(false);
      return;
    }

    // 복구용 저장
    try {
      sessionStorage.setItem(
        "lastQuizConfig",
        JSON.stringify({ contentId, title: titleFromState, difficulty, count: numQuestions })
      );
    } catch {
      // ignore
    }

    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setError("");

        // ✅ 생성 요청 (백엔드 스펙: { numQuestions, difficulty })
        const body = { numQuestions, difficulty };
        const { data } = await api.post(`/contents/${contentId}/quiz/generate`, body);

        // ✅ 응답 파싱 (quizzes 배열 필수)
        const rawList = Array.isArray(data?.quizzes) ? data.quizzes : [];
        const list = rawList.slice(0, Math.max(1, Math.min(numQuestions, rawList.length)));
        if (list.length === 0) throw new Error(data?.message || "퀴즈 생성 결과가 비어 있습니다.");

        // ✅ 배치 번호 보관
        const batchFromResp = data?.batch ?? list[0]?.quiz_batch ?? null;
        setCurrentBatch(batchFromResp);

        // ✅ 화면용 구조로 매핑 (보기는 배열로 강제)
        const mapped = {
          title: titleFromState,
          questions: list.map((q) => {
            const opts = Array.isArray(q.options)
              ? q.options
              : typeof q.options === "string"
              ? q.options.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
              : [];

            return {
              id: q.quiz_id,
              text: q.question,
              type: "single",
              options: opts.map((opt, i) => ({
                id: `${q.quiz_id}_${i + 1}`,
                text: String(opt),
                letter: LETTERS[i] || "",
              })),
              explanation: q.explanation || "",
            };
          }),
        };

        if (!ignore) {
          setQuiz(mapped);
          setAnswers({});
        }
      } catch (e) {
        if (!ignore) {
          const detail =
            e?.response?.data?.message ||
            e?.response?.data?.error ||
            e?.message ||
            "퀴즈 생성 중 오류가 발생했습니다.";
          setError(detail);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, difficulty, numQuestions]);

  // 선택 핸들러
  const handleSingle = (qid, optId) => setAnswers((p) => ({ ...p, [qid]: optId }));

  // 제출 가능 여부
  const allAnswered = useMemo(() => {
    if (!quiz) return false;
    return quiz.questions.every((q) => !!answers[q.id]);
  }, [quiz, answers]);

  // 제출 → /grade 저장
  const handleSubmit = async () => {
    if (!quiz || !contentId) return;
    setSubmitting(true);
    try {
      // ✅ 서버 correct_answer가 "보기 텍스트"로 저장되어 있으므로, 텍스트를 기본으로 보냄
      const payloadAnswers = quiz.questions.map((q) => {
        const chosenId = answers[q.id];
        const idx = q.options.findIndex((o) => o.id === chosenId);

        const letter = idx >= 0 ? (q.options[idx].letter || LETTERS[idx] || "") : "";
        const text   = idx >= 0 ? String(q.options[idx].text) : "";

        return {
          quiz_id: q.id,
          user_answer: text,             // ✅ 핵심: 텍스트 기준 채점
          user_answer_letter: letter,    // (옵션) 서버에서 활용 가능
          user_answer_index: idx,        // (옵션)
        };
      });

      const endpoint =
        currentBatch != null
          ? `/contents/${contentId}/quiz/grade?batch=${currentBatch}`
          : `/contents/${contentId}/quiz/grade`;

      const { data } = await api.post(endpoint, { answers: payloadAnswers });

      // ✅ 백엔드 응답이 { data: {...} } 형태일 수도 있어 안전 파싱
      const server = data?.data ? data.data : data;

      // ✅ results 목록이 어디에 있든 안전하게 꺼내기
      const serverResults =
        Array.isArray(server?.results) ? server.results :
        Array.isArray(data?.results) ? data.results :
        [];

      // ✅ 결과를 화면에서 항상 렌더링 가능하도록 보강(enrich)
      const enrichResults = serverResults.map((r) => {
        const q = quiz.questions.find((x) => x.id === (r.quiz_id ?? r.id));
        const options = q ? q.options.map((o) => o.text) : (r.options ?? r.choices);
        return {
          ...r,
          question: r.question ?? q?.text ?? r.question,
          options,
        };
      });

      const enrichedServerResult = {
        status: data?.status ?? "success",
        message: data?.message ?? server?.message ?? null,
        batch: data?.batch ?? server?.batch ?? currentBatch ?? null,
        attempt_id: server?.attempt_id ?? data?.attempt_id ?? null,
        content_id: server?.content_id ?? data?.content_id ?? contentId,
        final_total_score:
          server?.final_total_score ??
          server?.score ??
          server?.accuracy ??
          null,
        correct_count:
          server?.correct_count ??
          server?.correct ??
          null,
        total_questions:
          server?.total_questions ??
          server?.total ??
          quiz?.questions?.length ?? null,
        results: enrichResults,
      };

      navigate("/result", {
        state: {
          contentId,
          attemptId: enrichedServerResult.attempt_id ?? null,
          title: `${quiz.title} 결과`,
          serverResult: enrichedServerResult,
          batch: enrichedServerResult.batch ?? null,
        },
      });
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "채점/저장 중 오류가 발생했습니다.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ===== 렌더링 =====
  if (loading) {
    return (
      <div className="qp-layout">
        <Sidebar />
        <main className="qp-content">
          <div className="qp-container">
            <p>퀴즈 불러오는 중...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="qp-layout">
        <Sidebar />
        <main className="qp-content">
          <div className="qp-container">
            <div className="qp-card" style={{ borderColor: "tomato" }}>
              <p style={{ color: "tomato", margin: 0 }}>⚠ {error}</p>
            </div>
            <div className="qp-card qp-actions">
              <button className="qp-btn qp-btn-secondary" onClick={() => navigate(-1)}>
                ← 돌아가기
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="qp-layout">
      <Sidebar />
      <main className="qp-content">
        <div className="qp-container">
          {/* 상단 요약 바 */}
          <div className="qp-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2 className="qp-title" style={{ margin: 0 }}>{quiz?.title}</h2>
            <div style={{ flex: 1 }} />
            <div className="qp-pill">문항: <b>{numQuestions}</b></div>
            <div className="qp-pill">난이도: <b>{difficulty}</b></div>
          </div>

          {/* 문항 리스트 (카드형) */}
          <div className="qp-list">
            {quiz?.questions.map((q, idx) => (
              <article key={q.id} className="qp-card qp-item">
                <header className="qp-item-head">
                  <span className="qp-index">Q{idx + 1}</span>
                  <span className="qp-question">{q.text}</span>
                </header>

                <div className="qp-options">
                  {q.options.map((opt) => (
                    <label
                      key={opt.id}
                      className={`qp-option ${answers[q.id] === opt.id ? "is-selected" : ""}`}
                    >
                      {/* 시멘틱 라디오 + 라벨 클릭 UX */}
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={answers[q.id] === opt.id}
                        onChange={() => handleSingle(q.id, opt.id)}
                      />
                      <span className="qp-option-badge">{opt.letter}</span>
                      <span className="qp-option-label">{opt.text}</span>
                    </label>
                  ))}
                </div>
              </article>
            ))}
          </div>

          {/* 하단 액션 */}
          <section className="qp-card qp-actions">
            <button className="qp-btn qp-btn-secondary" onClick={() => navigate(-1)}>
              ← 돌아가기
            </button>
            <button
              className="qp-btn qp-btn-primary"
              disabled={!allAnswered || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "저장 중..." : "제출하기"}
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
