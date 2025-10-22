import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/global.css";
import "../styles/FileListpage.css";
import Sidebar from "../components/Sidebar";

function FileListPage() {
  const [files, setFiles] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const demoProgress = [
      { contentId: 1, title: "자료구조 10장" },
      { contentId: 2, title: "AI 개론" },
      { contentId: 3, title: "운영체제 5장" },
    ];
    setFiles(demoProgress);
  }, []);

  // ✅ 파일 클릭 시 summary-preview 페이지로 이동
  const handleFileClick = (file) => {
    navigate(`/summary-preview/${file.contentId}`, {
      state: { title: file.title },
    });
  };

  return (
    <div className="file-board-layout">
      <Sidebar />
      <div className="file-content">
        <h1 className="file-title">업로드된 파일 목록</h1>

        {files.length === 0 ? (
          <p className="file-empty">업로드된 파일이 없습니다.</p>
        ) : (
          <ul className="file-list">
            {files.map((item) => (
              <li
                key={item.contentId}
                className="file-item"
                onClick={() => handleFileClick(item)}
              >
                📁 {item.title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default FileListPage;
