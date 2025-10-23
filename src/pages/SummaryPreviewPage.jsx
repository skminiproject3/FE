// src/pages/SummaryPreviewPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import pyapi from "../api/pyApi";               // ✅ FastAPI 호출용
import Sidebar from "../components/Sidebar";
import "../styles/global.css";
import "../styles/SummaryPreviewPage.css";

function SummaryPreviewPage() {
  const { contentId } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [summaries, setSummaries] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // ✅ AI 질문 상태
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  // ✅ 퀴즈 옵션 상태
  const [difficulty, setDifficulty] = useState("중");
  const [count, setCount] = useState(10);

  // ✅ 선택된 챕터의 PDF 경로들
  const [selectedPaths, setSelectedPaths] = useState([]);

  useEffect(() => {
    // 📘 대시보드에 있던 파일 목록(더미 데이터)
    const demoProgress = [
      { contentId: 1, title: "자료구조 10장" },
      { contentId: 2, title: "운영체제 5장" },
      { contentId: 3, title: "AI 개론" },
    ];

    // 📘 챕터 요약 더미 + 각 챕터에 해당 PDF 경로 예시(서버 저장 경로에 맞춰 바꿔도 됨)
    const demoSummaries = {
      1: [
        { chapter: 1, summary_text: "배열과 연결 리스트의 차이점", pdfPath: "data/ds/ch01.pdf" },
        { chapter: 2, summary_text: "스택과 큐의 동작 원리",       pdfPath: "data/ds/ch02.pdf" },
        { chapter: 3, summary_text: "트리 탐색 및 순회 알고리즘",   pdfPath: "data/ds/ch03.pdf" },
      ],
      2: [
        { chapter: 1, summary_text: "프로세스와 스레드의 기본 개념", pdfPath: "data/os/ch01.pdf" },
        { chapter: 2, summary_text: "CPU 스케줄링 알고리즘의 종류",  pdfPath: "data/os/ch02.pdf" },
        { chapter: 3, summary_text: "데드락 예방 및 회피",           pdfPath: "data/os/ch03.pdf" },
      ],
      3: [
        { chapter: 1, summary_text: "AI의 기본 개념 및 역사",        pdfPath: "data/ai/ch01.pdf" },
        { chapter: 2, summary_text: "머신러닝 주요 알고리즘 개요",   pdfPath: "data/ai/ch02.pdf" },
        { chapter: 3, summary_text: "딥러닝과 신경망 구조",          pdfPath: "data/ai/ch03.pdf" },
      ],
    };

    const matchedContent = demoProgress.find(
      (item) => String(item.contentId) === String(contentId)
    );

    if (!matchedContent) {
      setError("❌ 해당 콘텐츠의 요약 정보를 찾을 수 없습니다.");
      setLoading(false);
      return;
    }

    setTitle(matchedContent.title);

    const summariesData = demoSummaries[contentId];
    if (!summariesData) {
      setError("❌ 요약 데이터가 없습니다.");
      setSummaries([]);
    } else {
      setSummaries(summariesData);
    }

    setSelectedPaths([]); // 페이지 이동/재진입 시 초기화
    setLoading(false);
  }, [contentId]);

  // ✅ 퀴즈 시작 (QuizPage로 이동 + state 전달)
  const startQuiz = () => {
    try {
      localStorage.setItem("latestContentId", String(contentId));
    } catch (e) {
      console.log(e);
    }

    navigate("/quiz", {
      state: { difficulty, count, contentId, title, pdfPaths: selectedPaths,},
    });
  };

  // ✅ 챕터 선택 토글
  const togglePath = (pdfPath) => {
    setSelectedPaths((prev) =>
      prev.includes(pdfPath) ? prev.filter((p) => p !== pdfPath) : [...prev, pdfPath]
    );
  };

  // ✅ AI 질문하기
  const handleAsk = async () => {
    if (!question.trim()) return;
    setAsking(true);
    setAnswer("AI가 답변을 생성 중입니다...");

    try {
      // FastAPI /question/ 호출
      const { data } = await pyapi.post("/question/", {
        question,
        // db에서 pdf 경로 가져오는걸로..?
        pdf_paths: ["data/ch02_암호 기초.pdf"],
      });

      // 응답 형태에 맞게 표시
      setAnswer(data?.answer ?? JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "질문 처리 중 오류가 발생했습니다.";
      setAnswer("⚠️ " + msg);
    } finally {
      setAsking(false);
    }
  };

  if (loading) return <p>불러오는 중...</p>;

  return (
    <div className="summary-preview-layout">
      <Sidebar />

      <div className="summary-preview-content">
        <h1>📁 {title}</h1>
        <h2>요약</h2>

        <ul className="summary-preview-list">
          {summaries.map((s) => (
            <li
              key={s.chapter}
              className="summary-preview-item"
              onClick={() => navigate(`/summary/${contentId}/${s.chapter}`)}
            >
              <div className="summary-line">
                <b>챕터 {s.chapter}</b> —{" "}
                {s.summary_text.length > 35
                  ? s.summary_text.slice(0, 35) + "..."
                  : s.summary_text}
              </div>

              {/* ✅ 이 챕터 PDF를 RAG 근거로 쓸지 선택 */}
              <label className="pdf-check">
                <input
                  type="checkbox"
                  checked={selectedPaths.includes(s.pdfPath)}
                  onChange={(e) => {
                    e.stopPropagation(); // 카드 클릭 이동 막기
                    togglePath(s.pdfPath);
                  }}
                />
                <span style={{ marginLeft: 6 }}>이 챕터 PDF 사용</span>
                <small style={{ marginLeft: 8, opacity: 0.6 }}>({s.pdfPath})</small>
              </label>
            </li>
          ))}
        </ul>

        {error && <p className="summary-preview-error">{error}</p>}

        {/* ✅ 퀴즈 선택 섹션 */}
        <div className="sp-quiz-panel">
          <h3 className="sp-quiz-title">📝 퀴즈 풀기</h3>

          <div className="sp-controls-row">
            {/* 난이도 선택 */}
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

            {/* 문제 개수 선택 */}
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

            {/* 버튼 */}
            <div className="sp-actions">
              <button className="sp-btn sp-btn-primary" onClick={startQuiz}>
                🔍 퀴즈 풀기
              </button>
            </div>
          </div>
        </div>

        {/* ✅ AI 질문 섹션 */}
        <div className="ai-question-section">
          <h2>🤖 AI에게 질문하기</h2>
          <div className="ai-question-box">
            <div className="ai-input-row">
              <input
                type="text"
                placeholder="이 파일(선택한 챕터) 내용에 대해 물어보세요..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              />
              <button onClick={handleAsk} disabled={asking}>
                {asking ? "생성 중..." : "질문하기"}
              </button>
            </div>

            {/* 선택 상태 안내 */}
            <div className="ai-selected-info">
              {selectedPaths.length > 0 ? (
                <small>선택된 PDF: {selectedPaths.join(", ")}</small>
              ) : (
                <small>선택된 PDF 없음 → 웹검색으로 보완될 수 있어요</small>
              )}
            </div>

            {answer && (
              <div className="ai-answer-card">
                <h4>AI의 답변</h4>
                <pre style={{ whiteSpace: "pre-wrap" }}>{answer}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SummaryPreviewPage;
