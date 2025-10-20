import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import '../styles/global.css';
import '../styles/MainPage.css';

function FileUploadPage() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // 파일 선택 핸들러
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // 드래그 앤 드롭 핸들러
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="main-layout">
      <Sidebar />

      <div className="content">
        <h1>파일 업로드</h1>

        {/* 업로드 영역 */}
        <div
          className={`upload-box ${isDragging ? 'dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="upload-icon">⬆️</div>
          <p>여기에 파일을 끌어놓으세요</p>
          <span className="or-text">또는 파일 선택</span>

          <input
            type="file"
            id="fileInput"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <label htmlFor="fileInput" className="select-file-btn">
            파일 선택
          </label>

          {file && (
            <p className="file-name">📁 {file.name}</p>
          )}
        </div>

        {/* 챕터별 요약 */}
        <div className="chapter-summary">
          <p className="section-title">챕터별 요약</p>
          <div className="chapter-card active">챕터 1 요약 내용</div>
          <div className="chapter-card">챕터 2 요약 내용</div>
          <div className="chapter-card">챕터 3 요약 내용</div>
        </div>
      </div>
    </div>
  );
}

export default FileUploadPage;
