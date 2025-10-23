// src/pages/QuizPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import pyApi from "../api/pyApi";
import Sidebar from "../components/Sidebar";
import "../styles/global.css";
import "../styles/QuizPage.css";

const QUIZ_API = "/quiz/generate";

// '하/중/상' → 'EASY/MEDIUM/HARD'
const mapDifficulty = (d) => {
  if (!d) return "MEDIUM";
  if (d === "하") return "EASY";
  if (d === "중") return "MEDIUM";
  if (d === "상") return "HARD";
  return String(d).toUpperCase();
};

export default function QuizPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  // SummaryPreviewPage에서 넘어온 값
  const titleFromState = state?.title ?? "퀴즈";
  const numQuestions = Number(state?.count ?? 5);
  const difficulty = mapDifficulty(state?.difficulty ?? "중");
  const pdfPathsFromState = Array.isArray(state?.pdfPaths) ? state.pdfPaths : [];

  // 화면 상태
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quiz, setQuiz] = useState(null); // { title, questions:[{id,text,type,options:[{id,text}], correct_answer, explanation}] }
  const [answers, setAnswers] = useState({}); // 단일: { [qid]: optId }, 복수: { [qid]: [optId, ...] }

  // -------- 데이터 로드 --------
  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const body = {
          pdf_paths:
            pdfPathsFromState.length > 0
              ? pdfPathsFromState
              : ["uploaded_pdfs/ch03_대칭키 암호(1).pdf"], // 임시 고정 경로
          num_questions: numQuestions,
          difficulty, // "EASY" | "MEDIUM" | "HARD"
        };

        const { data } = await pyApi.post(QUIZ_API, body);
        if (ignore) return;

        if (data?.status !== "success" || !Array.isArray(data?.questions)) {
          throw new Error("퀴즈 생성 실패 또는 응답 형식 오류");
        }

        // FastAPI 응답 → 예전 UI 구조로 매핑
        const mapped = {
          title: titleFromState,
          questions: data.questions.map((q, qi) => ({
            id: qi + 1,
            text: q.question,
            type: "single", // API가 단일정답 기준이라 single 고정
            options: (q.options || []).map((opt, oi) => ({
              id: `${qi + 1}_${oi + 1}`, // 보기 ID는 "문항_보기"
              text: opt,
            })),
            correct_answer: q.correct_answer, // 문자열(보기 텍스트)
            explanation: q.explanation || "",
          })),
        };

        setQuiz(mapped);
        setAnswers({});
      } catch (e) {
        const detail =
          e?.response?.data?.detail ||
          (typeof e?.response?.data === "string" ? e.response.data : null);
        setError(detail || e.message || "퀴즈 생성 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numQuestions, difficulty, JSON.stringify(pdfPathsFromState)]);

  // -------- 선택 핸들러 --------
  const handleSingle = (qid, optId) => {
    setAnswers((prev) => ({ ...prev, [qid]: optId }));
  };
  const handleMulti = (qid, optId, checked) => {
    setAnswers((prev) => {
      const cur = Array.isArray(prev[qid]) ? prev[qid] : [];
      const next = checked ? [...new Set([...cur, optId])] : cur.filter((x) => x !== optId);
      return { ...prev, [qid]: next };
    });
  };

  // -------- 검증 --------
  const allAnswered = useMemo(() => {
    if (!quiz) return false;
    return quiz.questions.every((q) =>
      q.type === "multi"
        ? Array.isArray(answers[q.id]) && answers[q.id].length > 0
        : !!answers[q.id]
    );
  }, [quiz, answers]);

  // -------- 제출 → 결과 페이지로 네비게이트 --------
  const handleSubmit = () => {
    if (!quiz) return;

    const detail = quiz.questions.map((q) => {
      // 정답(텍스트) → 정답 옵션 id 매핑
      const correctIds = (() => {
        // 단일 정답 문자열 기준
        const target = String(q.correct_answer ?? "").trim();
        const found = q.options.find((o) => String(o.text).trim() === target);
        return found ? [found.id] : []; // 못 찾으면 빈 배열
      })();

      // 사용자가 고른 옵션 id들
      const userIds =
        q.type === "multi"
          ? Array.isArray(answers[q.id]) ? answers[q.id] : []
          : answers[q.id]
          ? [answers[q.id]]
          : [];

      // 정오판정 (단일 기준: 첫 요소 비교, 멀티 대비: 집합 동일)
      const isCorrect =
        q.type === "multi"
          ? correctIds.length === userIds.length &&
            correctIds.every((id) => userIds.includes(id))
          : correctIds.length === 1 && userIds.length === 1 && correctIds[0] === userIds[0];

      return {
        questionId: q.id,
        question: q.text,
        options: q.options,                 // [{id, text}]
        correctOptionIds: correctIds,       // ["1_2"]
        userOptionIds: userIds,             // ["1_3"] or []
        isCorrect,
      };
    });

    const score = detail.filter((d) => d.isCorrect).length;
    const total = quiz.questions.length;

    navigate("/result", {
      state: {
        title: `${quiz.title} 결과`,
        score,
        total,
        detail,
      },
    });
  };

  // -------- 렌더링 --------
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
            <p style={{ color: "tomato" }}>⚠ {error}</p>
            <button className="qp-btn qp-btn-secondary" onClick={() => navigate(-1)}>
              ← 돌아가기
            </button>
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

          {!quiz ? (
            <p>퀴즈 불러오는 중...</p>
          ) : (
            <>
              <h2 className="qp-title">{quiz.title}</h2>

              <div className="qp-list">
                {quiz.questions.map((q, idx) => (
                  <div key={q.id} className="qp-card qp-item">
                    <div className="qp-item-head">
                      <span className="qp-index">Q{idx + 1}</span>
                      <span className="qp-question">{q.text}</span>
                      {q.type === "multi" && <span className="qp-hint">(복수 선택)</span>}
                    </div>

                    <div className="qp-options">
                      {q.options.map((opt) => (
                        <label key={opt.id} className="qp-option">
                          <input
                            type={q.type === "multi" ? "checkbox" : "radio"}
                            name={`q-${q.id}`}
                            checked={
                              q.type === "multi"
                                ? (answers[q.id] || []).includes(opt.id)
                                : answers[q.id] === opt.id
                            }
                            onChange={(e) =>
                              q.type === "multi"
                                ? handleMulti(q.id, opt.id, e.target.checked)
                                : handleSingle(q.id, opt.id)
                            }
                          />
                          <span className="qp-option-label">{opt.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 버튼 영역 */}
              <section className="qp-card qp-actions">
                <button className="qp-btn qp-btn-secondary" onClick={() => navigate(-1)}>
                  ← 돌아가기
                </button>
                <button
                  className="qp-btn qp-btn-primary"
                  disabled={!allAnswered}
                  onClick={handleSubmit}
                >
                  제출하기
                </button>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
