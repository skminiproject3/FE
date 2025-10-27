// src/pages/QuizPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import "../styles/global.css";
import "../styles/QuizPage.css";

const DEBUG = true;
const log   = (...a) => DEBUG && console.log("[QUIZ]", ...a);
const error = (...a) => DEBUG && console.error("[QUIZ]", ...a);

const LETTERS = ["A", "B", "C", "D", "E", "F"];

// 표시용: "A. " 같은 접두 제거
const stripLetterPrefix = (s) => String(s ?? "").replace(/^[A-F]\.\s*/i, "").trim();

function normalizeDifficulty(d) {
  const s = String(d || "").trim().toUpperCase();
  if (["하", "LOW", "EASY"].includes(s)) return "EASY";
  if (["상", "HIGH", "HARD"].includes(s)) return "HARD";
  return "MEDIUM";
}

// 숫자 안전 변환(서버 응답이 string이어도 받기)
function toNum(v, fallback = null) {
  if (v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function QuizPage() {
  const { state } = useLocation() || {};
  const navigate = useNavigate();

  const search = new URLSearchParams(location.search);
  const nFromQuery = Number(search.get("n"));
  const stored = (() => {
    try { return JSON.parse(sessionStorage.getItem("lastQuizConfig") || "{}"); }
    catch { return {}; }
  })();

  const contentId      = state?.contentId ?? stored.contentId ?? null;
  const titleFromState = state?.title ?? stored.title ?? "퀴즈";
  const difficulty     = normalizeDifficulty(state?.difficulty ?? stored.difficulty ?? "MEDIUM");

  const numQuestions = (() => {
    const raw = state?.count ?? (Number.isFinite(nFromQuery) ? nFromQuery : stored.count);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 4;
  })();

  const [loading, setLoading] = useState(true);
  const [errMsg,  setErrMsg]  = useState("");
  const [quiz,    setQuiz]    = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("lastQuizBatch") || "null"); }
    catch { return null; }
  });

  // StrictMode 중복 호출 방지
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    log("mount: location.state =", state);
    log("config:", { contentId, titleFromState, difficulty, numQuestions });

    if (!contentId) {
      setErrMsg("콘텐츠 ID가 없어 퀴즈를 생성할 수 없습니다.");
      setLoading(false);
      return;
    }

    try {
      sessionStorage.setItem(
        "lastQuizConfig",
        JSON.stringify({ contentId, title: titleFromState, difficulty, count: numQuestions })
      );
    } catch { /* ignore */ }

    (async () => {
      try {
        setLoading(true);
        setErrMsg("");

        const body = { numQuestions, difficulty };
        log("REQ /contents/:id/quiz/generate ->", body);
        const res = await api.post(`/contents/${contentId}/quiz/generate`, body);
        log("RES /quiz/generate <-", res.status, res.data);

        const data = res?.data ?? {};
        const rawList = Array.isArray(data?.quizzes) ? data.quizzes : [];
        if (!rawList.length) throw new Error(data?.message || "퀴즈 생성 결과가 비어 있습니다.");

        const list = rawList.slice(0, Math.max(1, Math.min(numQuestions, rawList.length)));

        const batchFromResp = data?.batch ?? list[0]?.quiz_batch ?? null;
        setCurrentBatch(batchFromResp);
        try { sessionStorage.setItem("lastQuizBatch", JSON.stringify(batchFromResp)); } catch { /* ignore */ }

        // 옵션 원문(raw) 유지 + 표시용 text만 접두 제거
        const mapped = {
          title: titleFromState,
          questions: list.map((q) => {
            const opts = Array.isArray(q.options)
              ? q.options
              : typeof q.options === "string"
                ? q.options.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
                : [];
            return {
              id: q.quiz_id ?? q.id,
              text: q.question ?? q.stem ?? "",
              type: "single",
              options: opts.map((opt, i) => ({
                id: `${q.quiz_id ?? q.id}_${i + 1}`,
                raw: String(opt),               // 예: "B. 56비트"
                text: stripLetterPrefix(opt),   // 예: "56비트"
                letter: LETTERS[i] || "",
              })),
              explanation: q.explanation || "",
            };
          }),
        };

        console.table(
          mapped.questions.map((q, i) => ({
            i, qid: q.id, stem: (q.text || "").slice(0, 28), choices: q.options.length,
          }))
        );

        setQuiz(mapped);
        setAnswers({});
      } catch (e) {
        error("ERR /quiz/generate", e);
        setErrMsg(
          e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "퀴즈 생성 중 오류가 발생했습니다."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line

  const allAnswered = useMemo(() => {
    if (!quiz) return false;
    return quiz.questions.every((q) => !!answers[q.id]);
  }, [quiz, answers]);

  const handleSingle = (qid, optId) => {
    setAnswers((prev) => {
      const next = { ...prev, [qid]: optId };
      log("SELECT", { qid, optId, snapshot: next });
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!quiz || !contentId) return;
    if (currentBatch == null) {
      alert("배치 정보가 없어 채점을 진행할 수 없습니다. 퀴즈를 다시 생성한 뒤 제출해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      // 선택 로그
      console.table(
        quiz.questions.map((q) => {
          const chosenId = answers[q.id];
          const i = q.options.findIndex((o) => o.id === chosenId);
          return {
            qid: q.id,
            picked_letter: i >= 0 ? (q.options[i].letter || LETTERS[i]) : null,
            picked_text:   i >= 0 ? q.options[i].text : null,
            picked_raw:    i >= 0 ? q.options[i].raw  : null,
          };
        })
      );

      // 서버가 이해할 수 있는 풍부한 페이로드(슈퍼셋) — 그대로 유지
      const payloadAnswers = quiz.questions.map((q) => {
        const chosenId = answers[q.id];
        const idx0 = q.options.findIndex((o) => o.id === chosenId); // 0-based
        const idx1 = idx0 >= 0 ? idx0 + 1 : null;                   // 1-based
        const letter = idx0 >= 0 ? (q.options[idx0].letter || LETTERS[idx0] || "") : "";
        const raw    = idx0 >= 0 ? String(q.options[idx0].raw  ?? "") : ""; // "C. 56비트"
        const text   = idx0 >= 0 ? String(q.options[idx0].text ?? "") : ""; // "56비트"

        return {
          quiz_id: q.id,
          // 대표 키
          answer: letter,
          answer_index: idx0,
          answer_index_1based: idx1,
          user_answer: raw,
          answer_text: text,
          // 레거시/대체 키
          selected_option: raw,
          selected_option_text: text,
          selected_option_letter: letter,
          selected_index: idx1,
          selected: letter,
          choice: letter,
          option: raw,
          option_index: idx1,
          // 보조
          user_answer_letter: letter,
          user_answer_index: idx0,
          user_answer_text: text,
        };
      });

      const answers_map_letter = {};
      const answers_map_text   = {};
      const answers_map_raw    = {};
      payloadAnswers.forEach(a => {
        answers_map_letter[a.quiz_id] = a.answer;
        answers_map_text[a.quiz_id]   = a.answer_text;
        answers_map_raw[a.quiz_id]    = a.user_answer;
      });

      const endpoint = `/contents/${contentId}/quiz/grade?batch=${currentBatch}`;
      const body = {
        content_id: contentId,
        batch: currentBatch,
        answers: payloadAnswers,
        // 서버가 map형만 읽더라도 채점되도록 보조 필드 포함
        answers_map_letter,
        answers_map_text,
        answers_map_raw,
        responses: payloadAnswers,
        submissions: payloadAnswers,
      };

      console.table(payloadAnswers.map(a => ({
        qid: a.quiz_id, letter: a.answer, idx0: a.answer_index, idx1: a.answer_index_1based, raw: a.user_answer, text: a.answer_text
      })));

      log("REQ /quiz/grade ->", { endpoint, body });
      const res = await api.post(endpoint, body);
      log("RES /quiz/grade <-", res.status, res.data);

      // ====== 여기부터는 "서버(DB) 결과만" 신뢰 ======
      const payload = (res?.data && typeof res.data === "object") ? res.data : {};
      const top = (payload && typeof payload.data === "object") ? payload.data : payload;

      const serverResults =
        Array.isArray(top?.results) ? top.results :
        Array.isArray(payload?.results) ? payload.results : [];

      // 결과 옵션이 비어있으면 로컬 옵션으로 보강(표시 안정성)
      const enrichResults = serverResults.map((r) => {
        const qid = r.quiz_id ?? r.id;
        const localQ = quiz.questions.find((x) => String(x.id) === String(qid));
        const fallbackOptions = localQ ? localQ.options.map(o => (o.raw ?? `${o.letter}. ${o.text}`)) : [];
        return {
          ...r,
          options: (Array.isArray(r.options) && r.options.length) ? r.options : (r.choices ?? fallbackOptions),
        };
      });

      const enriched = {
        status: payload?.status ?? top?.status ?? "success",
        message: payload?.message ?? top?.message ?? null,
        batch: payload?.batch ?? top?.batch ?? currentBatch ?? null,
        attempt_id: top?.attempt_id ?? payload?.attempt_id ?? null,
        content_id: top?.content_id ?? payload?.content_id ?? contentId,
        // ✅ 서버(DB) 점수/정답수/총문항 “그대로” 사용
        final_total_score: toNum(top?.final_total_score ?? top?.score ?? top?.accuracy, 0),
        correct_count:     toNum(top?.correct_count ?? top?.correct ?? top?.correct_answers, 0),
        total_questions:   toNum(top?.total_questions ?? top?.total, quiz?.questions?.length ?? 0),
        results: enrichResults,
      };

      log("GRADE CHECK (server)", {
        score: enriched.final_total_score,
        correct: enriched.correct_count,
        total: enriched.total_questions,
      });

      // (선택) 마지막 제출 스냅샷 저장
      try {
        sessionStorage.setItem(
          "quiz:lastSubmit",
          JSON.stringify({ contentId, batch: enriched.batch, attemptId: enriched.attempt_id })
        );
      } catch { /* ignore */ }

      navigate("/result", {
        state: {
          contentId,
          attemptId: enriched.attempt_id ?? null,
          title: `${quiz.title} 결과`,
          serverResult: enriched,
          batch: enriched.batch ?? null,
        },
      });
    } catch (e) {
      error("ERR /quiz/grade", e);
      alert(
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "채점/저장 중 오류가 발생했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="qp-layout">
        <Sidebar />
        <main className="qp-content">
          <div className="qp-container"><p>퀴즈 불러오는 중...</p></div>
        </main>
      </div>
    );
  }

  if (errMsg) {
    return (
      <div className="qp-layout">
        <Sidebar />
        <main className="qp-content">
          <div className="qp-container">
            <div className="qp-card" style={{ borderColor: "tomato" }}>
              <p style={{ color: "tomato", margin: 0 }}>⚠ {errMsg}</p>
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

          {/* 문항 리스트 */}
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
