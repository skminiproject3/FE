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

  useEffect(() => {
    // 📘 대시보드에 있던 파일 목록(더미 데이터)
    const demoProgress = [
      { contentId: 1, title: "자료구조 10장" },
      { contentId: 2, title: "운영체제 5장" },
      { contentId: 3, title: "AI 개론" },
    ];

    // 📘 챕터 요약 더미 데이터
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
        { chapter: 3, summary_text: "딥러닝과 신경망 구조 이해" },
      ],
    };

    // 📌 title 찾기
    const matchedContent = demoProgress.find(
      (item) => String(item.contentId) === String(contentId)
    );

    if (!matchedContent) {
      setError("❌ 해당 콘텐츠의 요약 정보를 찾을 수 없습니다.");
      setLoading(false);
      return;
    }

    setTitle(matchedContent.title);

    // 📌 챕터 리스트 불러오기
    const summariesData = demoSummaries[contentId];
    if (!summariesData) {
      setError("❌ 요약 데이터가 없습니다.");
    } else {
      setSummaries(summariesData);
    }

    setLoading(false);
  }, [contentId]);

  if (loading) return <p>불러오는 중...</p>;

  return (
    <div className="summary-preview-layout">
      <Sidebar />
      <div className="summary-preview-content">
        <h1>
          📘 챕터별 요약 <span className="summary-title-file">— {title}</span>
        </h1>

        <ul className="summary-preview-list">
          {summaries.map((s) => (
            <li
              key={s.chapter}
              className="summary-preview-item"
              onClick={() => navigate(`/summary/${contentId}/${s.chapter}`)}
            >
              <h2 className="summary-chapter-title">챕터 {s.chapter}</h2>
              <p className="summary-chapter-text">{s.summary_text}</p>
            </li>
          ))}
        </ul>

        {error && <p className="summary-preview-error">{error}</p>}
      </div>
    </div>
  );
}

export default SummaryPreviewPage;
