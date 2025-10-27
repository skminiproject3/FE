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

function normalizeDifficulty(d) {
  const s = String(d || "").trim().toUpperCase();
  if (["하", "LOW", "EASY"].includes(s)) return "EASY";
  if (["상", "HIGH", "HARD"].includes(s)) return "HARD";
  return "MEDIUM";
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

  // ✅ StrictMode 중복 호출 방지
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
    } catch {console.log("퀴즈 최근 업로드 에러")}

    (async () => {
      try {
        setLoading(true);
        setErrMsg("");

        const body = { numQuestions, difficulty };
        log("REQ /contents/:id/quiz/generate ->", body);
        const res = await api.post(`/contents/${contentId}/quiz/generate`, body);
        log("RES /quiz/generate <-", res.status, res.data);

        const data = res.data || {};
        const rawList = Array.isArray(data?.quizzes) ? data.quizzes : [];
        if (!rawList.length) throw new Error(data?.message || "퀴즈 생성 결과가 비어 있습니다.");

        const list = rawList.slice(0, Math.max(1, Math.min(numQuestions, rawList.length)));

        const batchFromResp = data?.batch ?? list[0]?.quiz_batch ?? null;
        setCurrentBatch(batchFromResp);
        try { sessionStorage.setItem("lastQuizBatch", JSON.stringify(batchFromResp)); } catch {console.log("배치번호 저장 에러")}

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
                text: String(opt),
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
        setLoading(false); // ⬅️ cleanup과 무관하게 항상 내려줌
      }
    })();
    // deps 빈 배열 + didInit 가드로 한 번만
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
      console.table(
        quiz.questions.map((q) => {
          const chosenId = answers[q.id];
          const i = q.options.findIndex((o) => o.id === chosenId);
          return {
            qid: q.id,
            picked_letter: i >= 0 ? (q.options[i].letter || LETTERS[i]) : null,
            picked_text:   i >= 0 ? q.options[i].text : null,
          };
        })
      );

      const payloadAnswers = quiz.questions.map((q) => {
        const chosenId = answers[q.id];
        const idx = q.options.findIndex((o) => o.id === chosenId);
        const letter = idx >= 0 ? (q.options[idx].letter || LETTERS[idx] || "") : "";
        const text   = idx >= 0 ? String(q.options[idx].text) : "";
        return {
          quiz_id: q.id,
          answer: letter,
          answer_index: idx,
          answer_text: text,
          user_answer: text,
          user_answer_letter: letter,
          user_answer_index: idx,
        };
      });

      const endpoint = `/contents/${contentId}/quiz/grade?batch=${currentBatch}`;
      const body = { batch: currentBatch, answers: payloadAnswers };

      log("REQ /quiz/grade ->", { endpoint, body });
      const res = await api.post(endpoint, body);
      log("RES /quiz/grade <-", res.status, res.data);

      const top = res.data?.data ? res.data.data : res.data;
      const resultsArr =
        Array.isArray(top?.results) ? top.results :
        Array.isArray(res.data?.results) ? res.data.results : [];

      const enrichResults = resultsArr.map((r) => {
        const q = quiz.questions.find((x) => x.id === (r.quiz_id ?? r.id));
        const options = q ? q.options.map((o) => o.text) : (r.options ?? r.choices ?? []);
        return {
          ...r,
          question: r.question ?? q?.text ?? r?.question,
          options,
        };
      });

      const enriched = {
        status: res.data?.status ?? "success",
        message: res.data?.message ?? top?.message ?? null,
        batch: res.data?.batch ?? top?.batch ?? currentBatch ?? null,
        attempt_id: top?.attempt_id ?? res.data?.attempt_id ?? null,
        content_id: top?.content_id ?? res.data?.content_id ?? contentId,
        final_total_score: top?.final_total_score ?? top?.score ?? top?.accuracy ?? null,
        correct_count: top?.correct_count ?? top?.correct ?? null,
        total_questions: top?.total_questions ?? top?.total ?? quiz?.questions?.length ?? null,
        results: enrichResults,
      };

      log("GRADE CHECK", {
        score: enriched.final_total_score,
        correct: enriched.correct_count,
        total: enriched.total_questions,
      });

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
          <div className="qp-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2 className="qp-title" style={{ margin: 0 }}>{quiz?.title}</h2>
            <div style={{ flex: 1 }} />
            <div className="qp-pill">문항: <b>{numQuestions}</b></div>
            <div className="qp-pill">난이도: <b>{difficulty}</b></div>
          </div>

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
