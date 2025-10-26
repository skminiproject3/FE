// src/pages/QuizResultPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "../styles/global.css";
import "../styles/QuizResultPage.css";
import api from "../api/axios";

/* -------------------- 유틸 (컴포넌트 밖) -------------------- */

const EMPTY_OBJ = Object.freeze({});
const EMPTY_ARR = Object.freeze([]);
const labelOf = (i) => String.fromCharCode(65 + i);

// 보기 문장 앞 라벨 "A) ", "B. ", "(C) ", "1) ", "① " 등 제거
const stripLabelPrefix = (s) =>
  String(s ?? "")
    .replace(/^\s*(?:[A-Za-z]\s*[.)]|\(?[A-Za-z][)\]]|[①-⑳]|\d+\s*[.)])\s*/u, "")
    .trim();

// 공백/개행·대소문자 무시 비교용
const fold = (t) =>
  String(t ?? "")
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const normForMatch = (t) => fold(stripLabelPrefix(t));

// options 다양한 형태 → 문자열 배열
const parseOptions = (raw) => {
  if (!raw) return EMPTY_ARR;
  if (Array.isArray(raw)) return raw.map((x) => String(x));
  if (typeof raw === "string") {
    return raw
      .split(/\r?\n|[|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof raw === "object") {
    const keys = Object.keys(raw).sort((a, b) => {
      const na = Number(a),
        nb = Number(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return String(a).localeCompare(String(b));
    });
    return keys.map((k) => String(raw[k]));
  }
  return EMPTY_ARR;
};

// “A/1/텍스트” 어떤 형식이든 보기 인덱스로 환원 (0-base). 못 찾으면 -1
const resolveIndexFromAny = (ans, options) => {
  const opts = Array.isArray(options) ? options : EMPTY_ARR;
  if (ans == null || ans === "") return -1;
  const s = String(ans).trim();

  // 통일 비교(라벨 제거 + 공백/대소문자 무시)
  const normS = normForMatch(s);
  const normOpts = opts.map(normForMatch);
  const idxByNorm = normOpts.findIndex((o) => o === normS);
  if (idxByNorm >= 0) return idxByNorm;

  // 완전 동일
  const exactIdx = opts.findIndex((o) => String(o).trim() === s);
  if (exactIdx >= 0) return exactIdx;

  // 숫자 0/1-base
  const n = Number(s);
  if (Number.isFinite(n) && `${n}` === s) {
    if (opts[n] != null) return n;
    if (opts[n - 1] != null) return n - 1;
  }

  // 알파벳 라벨
  if (/^[A-Za-z]$/.test(s)) {
    const idx = s.toUpperCase().charCodeAt(0) - 65;
    return opts[idx] != null ? idx : -1;
  }

  return -1;
};

// 텍스트/인덱스 기반 동등성 체크 (옵션이 없을 때도 안전)
const answersEqual = (userRaw, correctRaw, options) => {
  const opts = Array.isArray(options) ? options : EMPTY_ARR;

  if (opts.length > 0) {
    const uIdx = resolveIndexFromAny(userRaw, opts);
    const cIdx = resolveIndexFromAny(correctRaw, opts);
    if (uIdx >= 0 && cIdx >= 0) return uIdx === cIdx;
  }
  // 옵션이 없거나 인덱스를 못 찾은 경우 텍스트 비교
  return normForMatch(userRaw) === normForMatch(correctRaw);
};

// 화면 표시용(사용자/정답 공통)
const displayFromAny = (raw, options) => {
  const opts = Array.isArray(options) ? options : EMPTY_ARR;
  const idx = resolveIndexFromAny(raw, opts);
  if (idx >= 0 && idx < opts.length) {
    return { label: labelOf(idx), text: String(opts[idx]) };
  }
  const s = String(raw ?? "").trim();
  return s ? { label: "-", text: s } : { label: "-", text: "-" };
};

// 안전 GET
const safeGet = async (path, headers) => {
  try {
    const { data } = await api.get(path, { headers });
    return data;
  } catch {
    return null;
  }
};

// 배열 찾기
const firstArray = (...cands) => cands.find((v) => Array.isArray(v)) || [];

/* -------------------- 컴포넌트 -------------------- */

export default function QuizResultPage() {
  const { state } = useLocation() || {};
  const navigate = useNavigate();

  // ---- 입력(라우팅 state/서버 스냅샷) ----
  const title = state?.title ?? "퀴즈 결과";
  const serverSnap = state?.serverResult || EMPTY_OBJ; // 컨트롤러 /grade 응답 그대로
  const batch = state?.batch ?? serverSnap?.batch ?? null;
  const contentId = state?.contentId ?? serverSnap?.content_id ?? null;
  const attemptIdFromState = state?.attemptId ?? serverSnap?.attempt_id ?? null;

  // ---- serverRoot 안정화 ----
  const serverRoot = useMemo(() => {
    // /grade 응답은 최상위에 값이 들어있음
    if (serverSnap?.results || serverSnap?.detail || serverSnap?.items) return serverSnap;
    if (serverSnap?.data) return serverSnap.data; // 혹시 data 래핑인 경우
    return EMPTY_OBJ;
  }, [serverSnap]);

  // ---- 서버에서 온 원시 items (있으면 사용) ----
  const resultsRawFromServer = useMemo(() => {
    const direct = firstArray(
      serverRoot?.results,
      serverRoot?.detail,
      serverRoot?.items,
      serverRoot?.questions
    );
    if (direct.length > 0) return direct;

    const nestedCandidates = [
      serverRoot?.items?.data,
      serverRoot?.result?.items,
      serverRoot?.result?.questions,
    ].filter(Array.isArray);
    return nestedCandidates[0] || EMPTY_ARR;
  }, [serverRoot]);

  // ---- 시도 요약 폴백(총점/정답수/총문항 용) ----
  const [attemptSummary, setAttemptSummary] = useState(null); // {attempt_id, score, correct_answers, total_questions,...}

  useEffect(() => {
    // 서버가 이미 results를 줬으면 요약도 서버값을 우선 사용하므로 필수는 아님.
    // 그래도 서버 요약이 없다면(프론트 진입만 한 경우) 최신 시도 요약을 폴백으로 확보.
    if (resultsRawFromServer.length > 0) return; // 이미 결과가 있으면 패스
    if (!contentId) return;

    let aborted = false;
    (async () => {
      const token = localStorage.getItem("accessToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const attemptsRes = await safeGet(
        `/contents/${contentId}/quiz/attempts${batch != null ? `?batch=${batch}` : ""}`,
        headers
      );
      const attempts = Array.isArray(attemptsRes?.attempts) ? attemptsRes.attempts : EMPTY_ARR;
      if (attempts.length > 0) {
        attempts.sort(
          (a, b) =>
            (Date.parse(b?.created_at || 0) - Date.parse(a?.created_at || 0)) ||
            ((Number(b?.attempt_id) || 0) - (Number(a?.attempt_id) || 0))
        );
        if (!aborted) setAttemptSummary(attempts[0]);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [contentId, batch, resultsRawFromServer.length]);

  // ---- 렌더링용 표준 아이템 만들기 ----
  const mergedItems = useMemo(() => {
    // 1) 서버가 results를 줬으면 1순위 (재조회 없음)
    const base = resultsRawFromServer;

    return base.map((r, i) => {
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

      const userRaw =
        r.user_answer ?? r.userAnswer ?? r.user_selected ?? r.user ?? r.selected ?? "";
      const correctRaw = r.correct_answer ?? r.answer ?? r.correct ?? "";

      // 파생 판정
      const derivedOk = answersEqual(userRaw, correctRaw, options);

      // 서버 is_correct 있으면 우선, 없으면 파생 사용
      const okFromServer =
        typeof r.is_correct === "boolean" ? r.is_correct : (r.correct === true ? true : null);
      const ok = okFromServer === true ? true : derivedOk;

      return {
        id: r.quiz_id ?? r.id ?? i + 1,
        question: r.question ?? r.prompt ?? r.text ?? "",
        options,
        userRaw,
        correctRaw,
        isCorrect: ok,
        explanation: r.explanation ?? r.solution ?? "",
      };
    });
  }, [resultsRawFromServer]);

  // ---- 요약(총점/정답수/총문항) 계산: 서버값 우선, 없으면 파생/폴백 ----
  const { total, correctCount, totalScore } = useMemo(() => {
    const totalQFromServer =
      serverRoot?.total_questions ??
      serverRoot?.total ??
      attemptSummary?.total_questions ??
      null;

    const totalQ =
      totalQFromServer ?? (Array.isArray(mergedItems) ? mergedItems.length : 0);

    const correctFromServer =
      serverRoot?.correct_count ??
      serverRoot?.correct ??
      attemptSummary?.correct_answers ??
      null;

    const derivedCorrect =
      Array.isArray(mergedItems) && mergedItems.length > 0
        ? mergedItems.reduce((acc, it) => acc + (it.isCorrect ? 1 : 0), 0)
        : null;

    const correct = correctFromServer ?? (derivedCorrect != null ? derivedCorrect : 0);

    // 총점: 서버 퍼센트 점수 있으면 우선 사용
    let score =
      (typeof serverRoot?.final_total_score === "number" && serverRoot.final_total_score) ||
      (typeof serverRoot?.total_score === "number" && serverRoot.total_score) ||
      (typeof attemptSummary?.score === "number" && attemptSummary.score) ||
      null;

    if (score == null && totalQ > 0) {
      score = Math.round((correct / totalQ) * 100);
    }
    if (score == null) score = 0;

    return { total: totalQ, correctCount: correct, totalScore: score };
  }, [serverRoot, attemptSummary, mergedItems]);

  /* -------------------- UI -------------------- */
  return (
    <div className="qp-layout">
      <Sidebar />
      <main className="qp-content">
        <div className="qp-container">
          <h2 className="qp-title">{title}</h2>

          <p style={{ opacity: 0.9, margin: "6px 0 12px" }}>
            문항 수: <b>{total}</b> · 정답 개수: <b>{correctCount}</b> · 점수: <b>{totalScore}</b>
          </p>

          <div style={{ marginTop: 12 }}>
            <h4 style={{ margin: "0 0 8px" }}>문항별 결과</h4>
            {mergedItems.length === 0 ? (
              <p>표시할 결과가 없습니다.</p>
            ) : (
              <ul>
                {mergedItems.map((it, i) => {
                  const ua = displayFromAny(it.userRaw, it.options);
                  const ca = displayFromAny(it.correctRaw, it.options);

                  return (
                    <li
                      key={it.id ?? i}
                      className={`qa-item ${it.isCorrect ? "ok" : "bad"}`}
                      style={{ marginBottom: 16 }}
                    >
                      <div className="qa-question">
                        <b>Q{i + 1}.</b> {it.question}
                      </div>

                      {it.options.length > 0 && (
                        <ul className="options-list" style={{ marginTop: 6 }}>
                          {it.options.map((opt, j) => {
                            const isUser =
                              normForMatch(opt) === normForMatch(it.userRaw);
                            const isCorrect =
                              normForMatch(opt) === normForMatch(it.correctRaw);
                            const cls = ["option", isCorrect ? "correct" : "", isUser ? "user" : ""]
                              .filter(Boolean)
                              .join(" ");
                            return (
                              <li key={j} className={cls}>
                                <b className="option-label">{labelOf(j)}</b>
                                <span>{String(opt)}</span>
                                {(isCorrect || isUser) && (
                                  <span className="option-badges">
                                    {isCorrect && <span className="tag-correct">정답</span>}
                                    {isUser && <span className="tag-user">내 답</span>}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      <div className="qa-state" style={{ marginTop: 6 }}>
                        {it.isCorrect ? (
                          <span className="ok">정답 ✅</span>
                        ) : (
                          <span className="bad">오답 ❌</span>
                        )}
                      </div>

                      <div className="qa-answers" style={{ marginTop: 4 }}>
                        내 답:{" "}
                        <b className={`mine ${it.isCorrect ? "ok" : "bad"}`}>
                          {ua.label}
                          {it.options.length > 0 ? `) ${ua.text}` : ` (${ua.text})`}
                        </b>{" "}
                        · 정답:{" "}
                        <b className="correct">
                          {ca.label}
                          {it.options.length > 0 ? `) ${ca.text}` : ` (${ca.text})`}
                        </b>
                      </div>

                      {it.explanation && (
                        <div className="qa-explain" style={{ marginTop: 4, opacity: 0.85 }}>
                          해설: {it.explanation}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <section className="qp-card qp-actions" style={{ marginTop: 16 }}>
            <button className="qp-btn qp-btn-primary" onClick={() => navigate("/board", {
              state: { attemptId: attemptIdFromState ?? serverRoot?.attempt_id ?? null, contentId, batch }
            })}>
              대시보드로
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
