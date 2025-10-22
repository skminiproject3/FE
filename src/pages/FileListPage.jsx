import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "../styles/global.css";
import "../styles/FileListPage.css";

function FileListPage() {
  const navigate = useNavigate();

  const files = [
    { id: 1, title: "자료구조 10장" },
    { id: 2, title: "AI 개론" },
    { id: 3, title: "운영체제 5장" },
  ];

  const handleFileClick = (file) => {
    // 클릭 시 해당 파일 ID를 기반으로 summary-preview 페이지로 이동
    navigate(`/summary-preview/${file.id}`, { state: { title: file.title } });
  };

  return (
    <div className="summary-preview-layout">
      <Sidebar />
      <div className="summary-preview-content">
        <h1>업로드된 파일 목록</h1>
        <ul className="summary-preview-list">
          {files.map((file) => (
            <li
              key={file.id}
              className="summary-preview-item"
              onClick={() => handleFileClick(file)}
            >
              <span className="summary-chapter-title">📁 {file.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default FileListPage;
