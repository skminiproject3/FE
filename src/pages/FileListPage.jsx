import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/global.css";
import "../styles/FileListpage.css";
import Sidebar from "../components/Sidebar";
import { fetchUserContents } from "../api/contentApi";

function FileListPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 로그인 여부 확인 + 업로드 파일 목록 로드
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("로그인이 필요한 서비스입니다.");
      navigate("/login");
      return;
    }

    const loadFiles = async () => {
      try {
        const data = await fetchUserContents(); // contentApi 호출
        console.log("파일 목록:", data);
        setFiles(data);
      } catch (err) {
        console.error("파일 목록 조회 실패:", err);
        alert("파일 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadFiles();
  }, [navigate]);

  //파일 클릭 시 summary-preview 페이지로 이동
  const handleFileClick = (file) => {
    navigate(`/summary-preview/${file.contentId}`, {
      state: { title: file.title , contentId: file.contentId},
    });
  };

  // 로딩 중 표시
  if (loading) {
    return (
      <div className="file-board-layout">
        <Sidebar />
        <div className="file-content">
          <h1 className="file-title">업로드된 파일 목록</h1>
          <p>불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 실제 렌더링
  return (
    <div className="file-board-layout">
      <Sidebar />
      <div className="file-content">
        <h1 className="file-title">업로드된 파일 목록</h1>

        {files.length === 0 ? (
          <p className="file-empty">업로드된 파일이 없습니다...</p>
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
