import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

  // ✅ 퀴즈 옵션 상태 (추가됨)
  const [difficulty, setDifficulty] = useState("중");
  const [count, setCount] = useState(10);

  useEffect(() => {
    const demoProgress = [
      { contentId: 1, title: "자료구조 10장" },
      { contentId: 2, title: "운영체제 5장" },
      { contentId: 3, title: "AI 개론" },
    ];

    const demoSummaries = {
      1: [
        { chapter: 1, summary_text: "배열과 연결 리스트의 차이점" },
        { chapter: 2, summary_text: "스택과 큐의 동작 원리" },
        { chapter: 3, summary_text: "트리 탐색 및 순회 알고리즘" },
      ],
      2: [
        { chapter: 1, summary_text: "프로세스와 스레드의 기본 개념" },
        { chapter: 2, summary_text: "CPU 스케줄링 알고리즘의 종류" },
        { chapter: 3, summary_text: "데드락(교착 상태) 예방 및 회피" },
      ],
      3: [
        { chapter: 1, summary_text: "AI의 기본 개념 및 역사" },
        { chapter: 2, summary_text: "머신러닝의 주요 알고리즘 개요" },
        { chapter: 3, summary_text: "딥러닝과 신경망 구조 이해 및 응용" },
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
    } else {
      setSummaries(summariesData);
    }

    setLoading(false);
  }, [contentId]);

  // ✅ 퀴즈 시작 함수 (QuizPage로 이동 + state 전달)
  const startQuiz = () => {
    try {
      localStorage.setItem("latestContentId", String(contentId));
    } catch (e) {
      console.log(e);
    }

    navigate("/quiz", {
      state: {
        difficulty,
        count,
        contentId,
        title,
      },
    });
  };

  // ✅ AI 질문하기 함수
  const handleAsk = async () => {
    if (!question.trim()) return;
    setAsking(true);
    setAnswer("AI가 답변을 생성 중입니다...");

    try {
      const res = await fetch("http://localhost:3000/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, contentId }),
      });
      const data = await res.json();
      if (!data.answer || data.confidence < 0.4) {
        const webRes = await fetch("http://localhost:3000/api/websearch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        });
        const webData = await webRes.json();
        setAnswer(webData.answer || "웹 검색 결과가 없습니다.");
      } else {
        setAnswer(data.answer);
      }
    } catch (err) {
      setAnswer("⚠️ 오류가 발생했습니다: " + err.message);
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
                <b>챕터 {s.chapter}</b> — {s.summary_text.length > 35 ? s.summary_text.slice(0, 35) + "..." : s.summary_text}
              </div>
            </li>
          ))}
        </ul>

        {error && <p className="summary-preview-error">{error}</p>}

        {/* ✅ ✅ 여기서부터 퀴즈 선택 섹션 추가됨 */}
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

        {/* ✅ 기존 AI 질문 섹션 유지 */}
        <div className="ai-question-section">
          <h2>🤖 AI에게 질문하기</h2>
          <div className="ai-question-box">
            <div className="ai-input-row">
              <input
                type="text"
                placeholder="이 파일 내용에 대해 물어보세요..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              />
              <button onClick={handleAsk} disabled={asking}>
                {asking ? "생성 중..." : "질문하기"}
              </button>
            </div>

            {answer && (
              <div className="ai-answer-card">
                <h4>AI의 답변</h4>
                <p>{answer}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SummaryPreviewPage;
