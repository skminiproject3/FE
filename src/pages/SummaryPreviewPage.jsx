// src/pages/SummaryPreviewPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import api from "../api/axios";      // baseURL: http://localhost:8080/api
import "../styles/global.css";
import "../styles/SummaryPreviewPage.css";

/** 🔧 원본 PDF 경로가 없을 때 테스트용 폴백 */
const DEV_FALLBACK_PDF_MAP = {
  "1": "uploaded_pdfs/c78286fc-f0fa-4ec9-abd8-350a171889f3.pdf",
  "2": "uploaded_pdfs/533cf776-958d-41bf-a464-3623b22ec499.pdf",
};

/** 응답 파서(백엔드 키 이름이 바뀌어도 안전하게 처리) */
const getText = (r) =>
  (r?.answer ?? r?.summary_text ?? r?.summaryText ?? r?.fullSummary ?? r?.text ?? r?.summary ?? "").toString();

const getScope = (r) => (r?.scope ?? r?.source_type ?? "").toString().toLowerCase(); // "in_pdf" | "out_of_scope" | "web"
const getScore = (r) => {
  const n = Number(r?.score ?? r?.relevance ?? r?.confidence);
  return Number.isFinite(n) ? n : null;
};
const getSources = (r) => (Array.isArray(r?.sources) ? r.sources : []);

/** 요약 응답에서 PDF 경로 후보들을 최대한 뽑아낸다 */
function extractPdfPathsFromSummaryResponse(data) {
  const bag = new Set();

  // 단일 키들
  const single = data?.pdf_path ?? data?.pdfPath ?? data?.path ?? data?.ai_server_path ?? data?.uploaded_pdf;
  if (typeof single === "string" && single.trim()) bag.add(single.replace(/\\/g, "/"));

  // 배열 키들
  const arrs = [
    data?.pdf_paths,
    data?.pdfPaths,
    data?.paths,
    data?.source_paths,
    data?.sourcePaths,
  ].filter(Array.isArray);

  arrs.forEach((arr) =>
    arr.forEach((p) => typeof p === "string" && p.trim() && bag.add(p.replace(/\\/g, "/")))
  );

  // 객체 배열 안의 키들 (예: items[].pdf_path, chapters[].path 등)
  const objArrays = [data?.items, data?.chapters, data?.summaries, data?.sources].filter(Array.isArray);
  objArrays.forEach((arr) =>
    arr.forEach((o) => {
      const p =
        o?.pdf_path ??
        o?.pdfPath ??
        o?.path ??
        o?.source_path ??
        o?.sourcePath ??
        o?.ai_server_path ??
        o?.uploaded_pdf;
      if (typeof p === "string" && p.trim()) bag.add(p.replace(/\\/g, "/"));
    })
  );

  return Array.from(bag);
}

export default function SummaryPreviewPage() {
  const { contentId: rawId } = useParams();
  const contentId = String(rawId ?? "");
  const { state } = useLocation();
  const navigate = useNavigate();

  // 타이틀/원본 경로는 state 우선(없으면 비워둠—요약에서 자동 감지)
  const [title] = useState(state?.title ?? `콘텐츠 #${contentId}`);
  const [uploadedPdfPath] = useState(() => {
    const raw =
      state?.uploadedPdfPath || state?.aiServerPath || state?.uploaded_pdf || state?.uploadedPdf || "";
    return typeof raw === "string" ? raw.replace(/\\/g, "/") : "";
  });

  // 전체 요약 + 감지된 PDF 경로
  const [fullSummary, setFullSummary] = useState("");
  const [detectedPdfPaths, setDetectedPdfPaths] = useState([]); // 요약 응답에서 자동 추출
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState("");
  const [errMsg, setErrMsg] = useState("");

  // 퀴즈
  const [difficulty, setDifficulty] = useState("중");
  const [count, setCount] = useState(10);

  // AI 질문
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [answerMode, setAnswerMode] = useState(""); // "pdf" | "web"
  const [answerScore, setAnswerScore] = useState(null);
  const [answerSources, setAnswerSources] = useState([]);
  const [asking, setAsking] = useState(false);

  /** 최종 사용할 PDF 경로 결정 우선순위:
   *  state.uploadedPdfPath → 요약 응답에서 감지 → DEV_FALLBACK → 없음
   */
  const resolvedPdfPaths = useMemo(() => {
    if (uploadedPdfPath) return [uploadedPdfPath];
    if (detectedPdfPaths.length > 0) return detectedPdfPaths;
    if (DEV_FALLBACK_PDF_MAP[contentId]) return [DEV_FALLBACK_PDF_MAP[contentId]];
    return [];
  }, [uploadedPdfPath, detectedPdfPaths, contentId]);

  // ✅ 전체 요약 로드 (GET /api/contents/{id}/summarize) + PDF 경로 자동 감지
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErrMsg("");
      setInfo("");

      try {
        const { data } = await api.get(`/contents/${contentId}/summarize`, {
          headers: { Accept: "application/json" },
        });

        // 요약 텍스트
        setFullSummary(getText(data).trim());

        // 요약 응답에서 PDF 경로 감지
        const paths = extractPdfPathsFromSummaryResponse(data);
        if (!ignore && paths.length > 0) setDetectedPdfPaths(paths);

        if (!ignore) setInfo("전체 요약을 불러왔습니다.");
      } catch (e) {
        if (!ignore) {
          const s = e?.response?.status;
          const d =
            e?.response?.data?.message || e?.response?.data?.error || e?.message || "전체 요약을 불러오지 못했습니다.";
          setErrMsg(`(${s ?? "ERR"}) ${d}`);
          setFullSummary("");
          setDetectedPdfPaths([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [contentId]);

  // 🤖 AI 질문: /api/contents/{id}/ask
  //  - 1차: force_web=false (PDF 우선)
  //  - 2차: 범위 밖/저신뢰/실패 → force_web=true (웹)
  const handleAsk = async () => {
    const q = question.trim();
    if (!q) return;

    const pdf_paths = resolvedPdfPaths.map((p) => p.replace(/\\/g, "/"));

    setAsking(true);
    setAnswer("AI가 답변을 생성 중입니다...");
    setAnswerMode("");
    setAnswerScore(null);
    setAnswerSources([]);

    // 내부 함수: 웹 폴백 실행
    const askWeb = async () => {
      const { data: webRes } = await api.post(`/contents/${contentId}/ask`, {
        question: q,
        force_web: true,
      });
      setAnswer(getText(webRes) || "결과가 없습니다.");
      setAnswerMode("web");
      setAnswerScore(getScore(webRes));
      setAnswerSources(getSources(webRes));
    };

    try {
      // PDF 경로가 없으면 곧장 웹으로
      if (pdf_paths.length === 0) {
        await askWeb();
        return;
      }

      // 1) PDF 기반
      const { data: pdfRes } = await api.post(`/contents/${contentId}/ask`, {
        question: q,
        force_web: false,
        pdf_paths,
      });

      const scope1 = getScope(pdfRes);  // "in_pdf" | "out_of_scope" ...
      const score1 = getScore(pdfRes);  // 0~1 (없으면 null)
      const text1 = getText(pdfRes);
      const srcs1 = getSources(pdfRes);

      const confidentEnough = score1 == null ? true : score1 >= 0.55;
      const inPdf = scope1.includes("in_pdf") || scope1.includes("pdf");

      if (inPdf && confidentEnough && text1) {
        setAnswer(text1);
        setAnswerMode("pdf");
        setAnswerScore(score1);
        setAnswerSources(srcs1);
      } else {
        // 2) 웹 폴백
        await askWeb();
      }
    } catch (err) {
      console.error(err);
      // PDF 단계에서 에러가 났다면 웹으로 한 번 더 시도
      try {
        await askWeb();
      } catch (err2) {
        const detail =
          err2?.response?.data?.detail ||
          err2?.response?.data?.message ||
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err2?.message ||
          err?.message ||
          "질문 처리 중 오류가 발생했습니다.";
        setAnswer("⚠️ " + detail);
        setAnswerMode("");
        setAnswerScore(null);
        setAnswerSources([]);
      }
    } finally {
      setAsking(false);
    }
  };

  // 📝 퀴즈 시작
  const startQuiz = () => {
    try { localStorage.setItem("latestContentId", String(contentId)); } catch { alert("퀴즈생성오류"); }
    navigate("/quiz", {
      state: { difficulty, count, contentId, title, pdfPaths: resolvedPdfPaths },
    });
  };

  if (loading) return <p>불러오는 중...</p>;

  return (
    <div className="summary-preview-layout">
      <Sidebar />

      <div className="summary-preview-content">
        <h1>📁 {title}</h1>

        {info && <p style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>{info}</p>}

        {/* 감지된/사용될 PDF 경로 안내 */}
        <div className="ai-selected-info" style={{ marginTop: 8 }}>
          {(resolvedPdfPaths.length > 0 || DEV_FALLBACK_PDF_MAP[contentId]) && (
            <div className="ai-selected-info" style={{ marginTop: 8 }}>
              {resolvedPdfPaths.length > 0 ? (
                <small>질문/퀴즈에 사용할 PDF: {resolvedPdfPaths.join(", ")}</small>
              ) : (
                <small>원본 없음 → 임시 경로 사용: {DEV_FALLBACK_PDF_MAP[contentId]}</small>
              )}
            </div>
          )}

        </div>

        {errMsg && <p className="summary-preview-error">{errMsg}</p>}

        {/* ✅ 전체 요약 */}
        <h2 style={{ marginTop: 16 }}>전체 요약</h2>
        {fullSummary ? (
          <div className="summary-body" style={{ marginTop: 8 }}>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{fullSummary}</pre>
          </div>
        ) : (
          <p style={{ opacity: 0.7 }}>표시할 요약이 없습니다.</p>
        )}

        {/* 📝 퀴즈 패널 */}
        <div className="sp-quiz-panel">
          <h3 className="sp-quiz-title">📝 퀴즈 풀기</h3>
          <div className="sp-controls-row">
            <fieldset className="sp-fieldset">
              <legend>난이도</legend>
              {["하", "중", "상"].map((lv) => (
                <label key={lv} className="sp-radio">
                  <input
                    type="radio"
                    name="difficulty"
                    value={lv}
                    checked={difficulty === lv}
                    onChange={(e) => setDifficulty(e.target.value)}
                  />
                  <span>{lv}</span>
                </label>
              ))}
            </fieldset>

            <fieldset className="sp-fieldset">
              <legend>문제 개수</legend>
              {[3, 5, 8, 10].map((n) => (
                <label key={n} className="sp-radio">
                  <input
                    type="radio"
                    name="qcount"
                    value={n}
                    checked={count === n}
                    onChange={(e) => setCount(Number(e.target.value))}
                  />
                  <span>{n}문항</span>
                </label>
              ))}
            </fieldset>

            <div className="sp-actions">
              <button className="sp-btn sp-btn-primary" onClick={startQuiz}>
                🔍 퀴즈 풀기
              </button>
            </div>
          </div>
        </div>

        {/* 🤖 AI 질문 섹션 */}
        <div className="ai-question-section">
          <h2>🤖 AI에게 질문하기</h2>
          <div className="ai-question-box">
            <div className="ai-input-row">
              <input
                type="text"
                placeholder="이 파일 내용 또는 관련 주제에 대해 물어보세요..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              />
              <button onClick={handleAsk} disabled={asking}>
                {asking ? "생성 중..." : "질문하기"}
              </button>
            </div>

            {(answerMode || answerSources.length > 0 || answerScore != null) && (
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {answerMode && (
                  <span className={`badge ${answerMode === "pdf" ? "badge-pdf" : "badge-web"}`}>
                    {answerMode === "pdf" ? "PDF 기반" : "웹 검색 기반"}
                  </span>
                )}
                {answerScore != null && (
                  <span className="badge badge-neutral">score: {answerScore.toFixed(2)}</span>
                )}
              </div>
            )}

            {answer && (
              <div className="ai-answer-card">
                <h4>AI의 답변</h4>
                <pre style={{ whiteSpace: "pre-wrap" }}>{answer}</pre>

                {answerSources.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <h5 style={{ margin: "0 0 6px" }}>참고한 출처</h5>
                    <ul className="ai-sources-list">
                      {answerSources.map((s, i) => {
                        const t = s?.title || s?.name || s?.path || s?.url || `source-${i + 1}`;
                        const meta = [];
                        if (s?.type) meta.push(s.type);
                        if (s?.page != null) meta.push(`p.${s.page}`);
                        if (s?.score != null) meta.push(`${(Number(s.score) || 0).toFixed(2)}`);
                        return (
                          <li key={i}>
                            {s?.url ? (
                              <a href={s.url} target="_blank" rel="noreferrer">
                                {t}
                              </a>
                            ) : (
                              <span>{t}</span>
                            )}
                            {meta.length > 0 && (
                              <small style={{ marginLeft: 6, opacity: 0.7 }}>
                                ({meta.join(" · ")})
                              </small>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
