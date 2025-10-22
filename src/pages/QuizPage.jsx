// src/pages/QuizPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "../styles/QuizPage.css";

// ✅ 퀴즈 데이터 (난이도 포함, 총 30문제 예시)
import { MOCK_QUIZ_BANK } from "../utils/mockQuizBank";

export default function QuizPage() {
  const navigate = useNavigate();
  const { state } = useLocation();

  // ✅ SummaryPreviewPage에서 전달된 값
  const difficulty = state?.difficulty || "중"; // 상/중/하
  const questionCount = state?.count || 5;      // 3, 5, 8, 10
  const contentId = state?.contentId || null;   // 파일 기준 ID
  const title = state?.title || "자동 생성 퀴즈";

  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    // 1) 난이도에 맞는 문제만 필터링
    const filtered = MOCK_QUIZ_BANK.filter((q) => q.difficulty === difficulty);

    // 2) 랜덤 섞은 후 → questionCount 만큼 자르기
    const selected = filtered.sort(() => Math.random() - 0.5).slice(0, questionCount);

    // 3) 형식 맞춰 퀴즈 데이터로 저장
    const generatedQuiz = {
      id: `quiz-${Date.now()}`,
      title: `${title} — (${difficulty} / ${questionCount}문항)`,
      questions: selected,
    };
    setQuiz(generatedQuiz);

    // 4) 정답 저장용 상태 초기화
    const init = {};
    selected.forEach((q) => {
      init[q.id] = q.type === "multi" ? [] : "";
    });
    setAnswers(init);
  }, [difficulty, questionCount, title]);

  // ✅ 단일 선택
  const handleSingle = (qid, optId) => {
    setAnswers((prev) => ({ ...prev, [qid]: optId }));
  };

  // ✅ 복수 선택
  const handleMulti = (qid, optId, checked) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[qid]) ? prev[qid] : [];
      const updated = checked
        ? [...current, optId]
        : current.filter((x) => x !== optId);
      return { ...prev, [qid]: updated };
    });
  };

  // ✅ 모든 문제에 답했는지 체크
  const allAnswered = quiz?.questions?.every((q) => {
    const ans = answers[q.id];
    return q.type === "multi"
      ? Array.isArray(ans) && ans.length > 0
      : typeof ans === "string" && ans.trim() !== "";
  });

  // ✅ 제출 → 결과 계산 + 결과 페이지 이동
  const handleSubmit = () => {
    if (!quiz) return;

    const detail = quiz.questions.map((q) => {
      const userAnswers = Array.isArray(answers[q.id]) ? answers[q.id] : [answers[q.id]];
      const isCorrect =
        userAnswers.sort().join(",") === q.correctOptionIds.slice().sort().join(",");

      return {
        questionId: q.id,
        question: q.text,
        options: q.options,               // ✅ 보기 전체
        correctOptionIds: q.correctOptionIds,
        userOptionIds: userAnswers,
        isCorrect,
      };
    });

    const score = detail.filter((d) => d.isCorrect).length;
    const total = detail.length;

    alert("제출되었습니다!");

    navigate("/result", {
      state: {
        title: quiz.title,
        difficulty,
        count: questionCount,
        contentId,
        score,
        total,
        detail,
      },
    });
  };

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
                      <span>{q.text}</span>
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
                                ? answers[q.id]?.includes(opt.id)
                                : answers[q.id] === opt.id
                            }
                            onChange={(e) =>
                              q.type === "multi"
                                ? handleMulti(q.id, opt.id, e.target.checked)
                                : handleSingle(q.id, opt.id)
                            }
                          />
                          {opt.text}
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
