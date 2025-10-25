// src/pages/QuizResultPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "../styles/global.css";
import "../styles/QuizResultPage.css";
import api from "../api/axios";

export default function QuizResultPage() {
  const { state } = useLocation() || {};
  const navigate = useNavigate();

  // ---------- Incoming ----------
  const title = state?.title ?? "퀴즈 결과";
  const server = state?.serverResult || {}; // 채점 원문 응답(문항이 없을 수 있음)
  const batch = state?.batch ?? server?.batch ?? null;

  // 식별자
  const contentId = state?.contentId ?? server?.content_id ?? null;
  const attemptIdFromState = state?.attemptId ?? null;

  // ---------- Helpers ----------
  const labelOf = (i) => String.fromCharCode(65 + i);

  const parseOptions = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      const lines = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      if (lines.length > 1) return lines;
      if (raw.includes("|")) return raw.split("|").map((s) => s.trim());
    }
    if (typeof raw === "object") {
      // {A:"",B:""} 또는 {"0":"..."} 형태도 지원
      const keys = Object.keys(raw).sort((a, b) => {
        const na = Number(a), nb = Number(b);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
        return String(a).localeCompare(String(b));
      });
      return keys.map((k) => String(raw[k]));
    }
    return [];
  };

  // 숫자(0/1-based), 알파벳, 보기 텍스트 모두 커버
  const normalizeAnswerDisplay = (ans, options) => {
    if (ans == null || ans === "") return { label: "-", text: "-" };
    const opts = Array.isArray(options) ? options : [];

    const n = Number(ans);
    if (Number.isFinite(n) && `${n}` === `${ans}`) {
      const idx0 = n;
      const idx1 = n - 1;
      if (opts[idx0] != null) {
        const label = labelOf(idx0);
        const text = String(opts[idx0]);
        return { label, text };
      }
      if (opts[idx1] != null) {
        const label = labelOf(idx1);
        const text = String(opts[idx1]);
        return { label, text };
      }
      return { label: String(n), text: String(n) };
    }

    if (typeof ans === "string" && /^[A-Za-z]$/.test(ans.trim())) {
      const ch = ans.trim().toUpperCase();
      const idx = ch.charCodeAt(0) - 65;
      const text = opts[idx] != null ? String(opts[idx]) : ch;
      return { label: ch, text };
    }

    if (typeof ans === "string" && opts.length > 0) {
      const idx = opts.findIndex((o) => String(o).trim() === ans.trim());
      if (idx >= 0) return { label: labelOf(idx), text: String(opts[idx]) };
    }
    return { label: String(ans), text: String(ans) };
  };

  const firstArray = (...cands) => cands.find((v) => Array.isArray(v)) || [];

  // ---------- Raw items from server ----------
  const resultsRaw = useMemo(() => {
    const direct = firstArray(
      server?.results,
      server?.detail,
      server?.items,
      server?.questions,
      server?.graded_items,
      server?.answer_sheet,
      server?.data?.results,
      server?.data?.detail,
      server?.data?.items,
      server?.data?.questions,
      state?.results,
      state?.detail,
      state?.items,
      state?.questions
    );
    if (direct.length > 0) return direct;

    const nestedCandidates = [
      server?.items?.data,
      server?.result?.items,
      server?.result?.questions,
      server?.data?.items?.data,
      server?.data?.result?.items,
      server?.data?.result?.questions,
    ].filter(Array.isArray);
    return nestedCandidates[0] || [];
  }, [server, state]);

  // ---------- Fallback/summary states ----------
  const [fallbackItems, setFallbackItems] = useState(null);
  const [attemptSummary, setAttemptSummary] = useState(null); // {attempt_id,batch,score,correct_answers,total_questions,...}
  const effectiveRaw = fallbackItems ?? resultsRaw;

  // ---------- Parse + Derive ----------
  const parsed = useMemo(() => {
    // 문항 배열 정규화
    const results = (Array.isArray(effectiveRaw) ? effectiveRaw : []).map((r) => {
      const options = parseOptions(
        r.options ??
        r.choices ??
        r.options_text ??
        r.choices_text ??
        r.option_texts ??
        r.choice_texts ??
        r.answers ??
        r.options_obj
      );
      return { ...r, _options: options };
    });

    // 총 문항수
    const total =
      server?.total_questions ??
      server?.total ??
      attemptSummary?.total_questions ??
      (Array.isArray(results) ? results.length : null);

    // 정답 개수
    let correctCount =
      server?.correct_count ??
      server?.correct ??
      attemptSummary?.correct_answers ??
      null;

    // correctCount 없으면 직접 카운트(ua/ca 텍스트 매칭 + is_correct 플래그)
    if (correctCount == null) {
      correctCount = results.reduce((acc, r) => {
        const ua = normalizeAnswerDisplay(r.user_answer ?? r.userAnswer ?? r.user_selected, r._options);
        const ca = normalizeAnswerDisplay(r.correct_answer ?? r.answer ?? r.correct, r._options);
        const ok =
          (typeof r.is_correct === "boolean" && r.is_correct) ||
          r.correct === true ||
          (ua.text !== "-" && ca.text !== "-" && ua.text === ca.text);
        return acc + (ok ? 1 : 0);
      }, 0);
    }

    // 점수
    let totalScore =
      server?.final_total_score ??
      server?.score ??
      server?.total_score ??
      attemptSummary?.score ??
      null;

    // 점수 없으면 per-item score 합 또는 정답률(%)
    if (totalScore == null) {
      const itemScores = results
        .map((r) => (typeof r.score === "number" ? r.score : null))
        .filter((v) => v != null);
      const sum = itemScores.reduce((a, b) => a + b, 0);
      totalScore =
        itemScores.length > 0 && sum > 0
          ? sum
          : total > 0
            ? Math.round((correctCount / total) * 100)
            : 0;
    }

    return { total, correctCount, totalScore, results };
  }, [effectiveRaw, server, attemptSummary]);

  // 공용 안전 GET
  const safeGet = async (path, headers) => {
    try {
      const { data } = await api.get(path, { headers });
      return data;
    } catch (e) {
      // 개발 시 확인용
      console.debug("safeGet fail:", path, e?.response?.status);
      return null;
    }
  };

  // ---------- Attempts 요약 + 문항 폴백 조회 ----------
  useEffect(() => {
    if (!contentId) return;

    const token = localStorage.getItem("accessToken");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    let aborted = false;

    const sortAttempts = (arr) =>
      arr.sort(
        (a, b) =>
          (Date.parse(b?.created_at || 0) - Date.parse(a?.created_at || 0)) ||
          ((Number(b?.attempt_id) || 0) - (Number(a?.attempt_id) || 0))
      );

    const toItemsArray = (data) => {
      if (!data) return [];
      if (Array.isArray(data?.items)) return data.items;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      if (Array.isArray(data?.result?.items)) return data.result.items;
      if (Array.isArray(data?.result?.questions)) return data.result.questions;
      if (Array.isArray(data?.items?.data)) return data.items.data;
      return [];
    };

    const tryFetchItems = async (attemptId) => {
      if (!attemptId) return [];
      // 1) contents/{contentId}
      const d1 = await safeGet(
        `/contents/${contentId}/quiz/attempts/${attemptId}/items`,
        headers
      );
      const arr1 = toItemsArray(d1);
      if (arr1.length > 0) return arr1;

      // 2) 전역 attempts
      const d2 = await safeGet(`/quiz/attempts/${attemptId}/items`, headers);
      const arr2 = toItemsArray(d2);
      if (arr2.length > 0) return arr2;

      // 3) latest
      const d3 = await safeGet(`/quiz/attempts/latest/items`, headers);
      const arr3 = toItemsArray(d3);
      if (arr3.length > 0) return arr3;

      return [];
    };

    (async () => {
      // A) attempts 요약을 항상 가져와서 score / correct_answers / total_questions 확보
      const attemptsRes = await safeGet(
        `/contents/${contentId}/quiz/attempts${batch != null ? `?batch=${batch}` : ""}`,
        headers
      );
      const attempts = Array.isArray(attemptsRes?.attempts) ? attemptsRes.attempts : [];
      if (attempts.length > 0) {
        sortAttempts(attempts);
        const latest = attempts[0];
        if (!aborted) setAttemptSummary(latest);

        // B) 문항이 비어 있으면, 최신 attemptId(또는 state에서 받은 id)로 아이템 폴백 조회
        if ((resultsRaw?.length ?? 0) === 0) {
          const attemptId = attemptIdFromState ?? latest?.attempt_id ?? null;
          if (attemptId) {
            const items = await tryFetchItems(attemptId);
            if (!aborted && items.length > 0) setFallbackItems(items);
          }
        }
      } else if ((resultsRaw?.length ?? 0) === 0 && attemptIdFromState) {
        // attempts가 비어도 attemptId가 있으면 아이템 조회 시도
        const items = await tryFetchItems(attemptIdFromState);
        if (!aborted && items.length > 0) setFallbackItems(items);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [contentId, batch, attemptIdFromState, resultsRaw]);

  // ---------- UI ----------
  return (
    <div className="qp-layout">
      <Sidebar />
      <main className="qp-content">
        <div className="qp-container">
          <h2 className="qp-title">{title}</h2>

          <p style={{ opacity: 0.9, margin: "6px 0 12px" }}>
            문항 수: <b>{parsed.total ?? "-"}</b> · 정답 개수:{" "}
            <b>{parsed.correctCount ?? "-"}</b>
            {parsed.totalScore != null && (
              <>
                {" "}
                · 점수: <b>{parsed.totalScore}</b>
              </>
            )}
          </p>

          <div style={{ marginTop: 12 }}>
            <h4 style={{ margin: "0 0 8px" }}>문항별 결과</h4>
            {parsed.results.length === 0 ? (
              <p>표시할 결과가 없습니다.</p>
            ) : (
              <ul>
                {parsed.results.map((r, i) => {
                  const opts = r._options || [];
                  const ua = normalizeAnswerDisplay(
                    r.user_answer ?? r.userAnswer ?? r.user_selected,
                    opts
                  );
                  const ca = normalizeAnswerDisplay(
                    r.correct_answer ?? r.answer ?? r.correct,
                    opts
                  );

                  const isCorrect =
                    (typeof r.is_correct === "boolean" && r.is_correct) ||
                    r.correct === true ||
                    (ua.text !== "-" && ca.text !== "-" && ua.text === ca.text);

                  return (
                    // ✅ 문항 카드 상태 클래스 추가
                    <li
                      key={r.quiz_id ?? r.id ?? i}
                      className={`qa-item ${isCorrect ? "ok" : "bad"}`}
                      style={{ marginBottom: 16 }}
                    >
                      <div className="qa-question">
                        <b>Q{i + 1}.</b> {r.question ?? r.prompt ?? r.text}
                      </div>

                      {/* ✅ 보기 리스트 클래스 + 보기별 상태 클래스 */}
                      {opts.length > 0 && (
                        <ul className="options-list" style={{ marginTop: 6 }}>
                          {opts.map((opt, j) => {
                            const text = String(opt);
                            const isCorrectOpt = ca.text && text === String(ca.text);
                            const isUserOpt = ua.text && text === String(ua.text);
                            const cls = [
                              "option",
                              isCorrectOpt ? "correct" : "",
                              isUserOpt ? "user" : "",
                            ]
                              .filter(Boolean)
                              .join(" ");

                            return (
                              <li key={j} className={cls}>
                                <b className="option-label">{labelOf(j)}</b>
                                <span>{text}</span>
                                {(isCorrectOpt || isUserOpt) && (
                                  <span className="option-badges">
                                    {isCorrectOpt && <span className="tag-correct">정답</span>}
                                    {isUserOpt && <span className="tag-user">내 답</span>}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      <div className="qa-state" style={{ marginTop: 6 }}>
                        {isCorrect ? (
                          <span className="ok">정답 ✅</span>
                        ) : (
                          <span className="bad">오답 ❌</span>
                        )}{" "}
                        ({r.score != null ? `${r.score}점` : "채점"})
                      </div>

                      <div className="qa-answers" style={{ marginTop: 4 }}>
                        내 답:{" "}
                        <b className={`mine ${isCorrect ? "ok" : "bad"}`}>
                          {ua.label}
                          {opts.length > 0 ? `) ${ua.text}` : ` (${ua.text})`}
                        </b>{" "}
                        · 정답:{" "}
                        <b className="correct">
                          {ca.label}
                          {opts.length > 0 ? `) ${ca.text}` : ` (${ca.text})`}
                        </b>
                      </div>

                      {(r.explanation ?? r.solution) && (
                        <div className="qa-explain" style={{ marginTop: 4, opacity: 0.85 }}>
                          해설: {r.explanation ?? r.solution}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <section className="qp-card qp-actions" style={{ marginTop: 16 }}>
            <button
              className="qp-btn qp-btn-primary"
              onClick={() => navigate("/board")}
            >
              대시보드로
            </button>
          </section>

          {/* 개발 확인용 로그 - 필요 시만 열어보세요
          <details style={{ marginTop: 12 }}>
            <summary>디버그</summary>
            <pre style={{ whiteSpace: "pre-wrap" }}>
{JSON.stringify({ server, attemptSummary, resultsRawLength: resultsRaw?.length, fallbackItemsLength: fallbackItems?.length }, null, 2)}
            </pre>
          </details>
          */}
        </div>
      </main>
    </div>
  );
}
