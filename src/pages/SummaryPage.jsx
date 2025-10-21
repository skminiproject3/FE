import { useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "../styles/global.css";
import "../styles/SummaryPage.css";

function SummaryPage() {
  const { contentId, chapter } = useParams();

  // 나중에 실제 API로 연결할 때 이렇게 쓸 수 있음
  // fetch(`/contents/${contentId}/summaries`) 해서 chapter 맞는 거만 보여주기

  const chapterTitle = `챕터 ${chapter} 요약`;
  const summaryPoints = [
    "앨리스는 송신자 받은 수신자",
    "CIA triad 는 C:기밀성, I: 무결성, A: 가용성을 뜻한다",
    "암호학, 복호화",
    "암호화 알고리즘, 복호화 알고리즘",
    "일방향 해시함수는 문서의 무결성이다.",
  ];

  return (
    <div className="summary-layout">
      <Sidebar />
      <div className="summary-content">
        <div className="summary-board">
          <h1 className="summary-title">{chapterTitle}</h1>

          <ul className="summary-list">
            {summaryPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default SummaryPage;
