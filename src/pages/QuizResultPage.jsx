// src/pages/QuizResultPage.jsx
import { useEffect, useState } from "react";
import '../styles/global.css';
import '../styles/DashBoardPage.css';
import '../styles/QuizResultPage.css';
import Sidebar from '../components/Sidebar';

function QuizResultPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [result, setResult] = useState({
    score: 0,
    accuracy: 0,
    totalCount: 0,
    items: []
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/quiz-results/latest');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setResult({
          score: data.score ?? 0,
          accuracy: data.accuracy ?? 0,
          totalCount: data.totalCount ?? (data.items?.length || 0),
          items: Array.isArray(data.items) ? data.items : []
        });
      } catch {
        // 🔹 Mock Data
        setResult({
          score: 87,
          accuracy: 0.8,
          totalCount: 5,
          items: [
            { id: 1, quizTitle: '1번퀴즈', number: 1, correct: true, question: 'TEA 알고리즘에 대한 설명으로 옳지 않은 것은?', selected: 'D. 아주 복잡한 블록 암호 사용' },
            { id: 2, quizTitle: '1번퀴즈', number: 2, correct: false, question: 'TEA 알고리즘에 대한 설명으로 옳지 않은 것은?', selected: 'D. 아주 복잡한 블록 암호 사용' },
            { id: 3, quizTitle: '1번퀴즈', number: 3, correct: true, question: 'TEA 알고리즘에 대한 설명으로 옳지 않은 것은?', selected: 'D. 아주 복잡한 블록 암호 사용' }
          ]
        });
        setErr('❗ 실제 결과를 불러오지 못해 예시 데이터를 표시합니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const percent = Math.round((result.accuracy || 0) * 100);

  return (
    <div className="board-layout">
      <Sidebar />
      <div className="content quiz-result-page">
        <div className="quiz-result-container">
          <h1>퀴즈 결과</h1>

          {/* ✅ Result Summary Card */}
          <div className="result-card summary-card">
            <div className="result-gauge" style={{ ['--p']: result.score + '%' }}>
              <div className="gauge-inner">
                <strong>{result.score}</strong>
                <span>점</span>
              </div>
            </div>

            <div className="summary-stats">
              <div className="stat-row">
                <span>정답률:</span>
                <b>{percent}%</b>
              </div>
              <div className="stat-row">
                <span>퀴즈 문항 수:</span>
                <b>{result.totalCount}개</b>
              </div>
              {err && <div className="stat-error">{err}</div>}
            </div>
          </div>

          {/* ✅ 상세 문항 */}
          <h2 className="detail-title">문항별 결과</h2>
          <div className="result-list">
            {loading && <div className="result-card">불러오는 중…</div>}

            {!loading && result.items.map((it) => (
              <div
                key={it.id ?? `${it.quizTitle}-${it.number}`}
                className={`result-card qa-item ${it.correct ? 'ok' : 'bad'}`}
              >
                <div className="qa-header">
                  <span className={`badge ${it.correct ? 'ok' : 'bad'}`}>
                    {it.correct ? '✔' : '✖'}
                  </span>
                  <b>{it.quizTitle} {it.number}번</b>
                </div>

                <div className="qa-body">
                  <div className="question">{it.question}</div>
                  {it.selected && (
                    <div className="selected-answer">선택한 답: {it.selected}</div>
                  )}
                </div>
              </div>
            ))}

            {!loading && result.items.length === 0 && (
              <div className="result-card">표시할 결과가 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuizResultPage;