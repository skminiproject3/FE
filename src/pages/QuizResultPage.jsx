import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "../styles/QuizResultPage.css";

function QuizResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { title = "퀴즈 결과", score = 0, total = 0, detail = [] } = location.state || {};

  if (!location.state) {
    return (
      <div className="board-layout">
        <Sidebar />
        <div className="content">
          <h2>⚠ 결과 데이터가 없습니다. 먼저 퀴즈를 풀어주세요.</h2>
          <button onClick={() => navigate("/main")}>메인으로 이동</button>
        </div>
      </div>
    );
  }

  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <div className="board-layout">
      <Sidebar />
      <div className="content quiz-result-page">
        <div className="quiz-result-container">
          + <h1>{title || "퀴즈 결과"}</h1>

          {/* ✅ 점수 요약 카드 */}
          <div className="result-card summary-card">
            <div className="result-gauge" style={{ ["--p"]: `${accuracy}%` }}>
              <div className="gauge-inner">
                <strong>{score}</strong>
                <span>/ {total}</span>
              </div>
            </div>
            <div className="summary-stats">
              <div className="stat-row"><span>정답률:</span><b>{accuracy}%</b></div>
              <div className="stat-row"><span>총 문항:</span><b>{total}개</b></div>
            </div>
          </div>

          {/* ✅ 문항별 상세 결과 */}
          <h2 className="detail-title">문항별 결과</h2>
          <div className="result-list">
            {detail.map((d, idx) => (
              <div key={d.questionId} className={`result-card qa-item ${d.isCorrect ? "ok" : "bad"}`}>
                <div className="qa-header">
                  <span className={`badge ${d.isCorrect ? "ok" : "bad"}`}>
                    {d.isCorrect ? "✔" : "✖"}
                  </span>
                  <b>Q{idx + 1}</b>
                </div>

                <div className="qa-body">
                  <div className="question">{d.question}</div>

                  {/* ✅ 보기 출력 */}
                  <ul className="options-list">
                    {d.options?.map((opt) => (
                      <li
                        key={opt.id}
                        className={
                          d.correctOptionIds.includes(opt.id)
                            ? "option correct"
                            : d.userOptionIds.includes(opt.id)
                            ? "option user"
                            : "option"
                        }
                      >
                        {opt.id}. {opt.text}
                      </li>
                    ))}
                  </ul>

                  {/* ✅ 정답 / 내 답 */}
                  <div className="correct-answer">✅ 정답: {d.correctOptionIds.join(", ")}</div>
                  <div className="selected-answer">
                    📝 내 답: {Array.isArray(d.userOptionIds) ? d.userOptionIds.join(", ") : d.userOptionIds}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ✅ 메인으로 돌아가기 버튼만 */}
          <div className="qr-actions">
            <button className="qr-btn qr-btn-primary" onClick={() => navigate("/main")}>
              메인으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuizResultPage;
