import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import '../styles/global.css';
import '../styles/MainPage.css';

function MainPage() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState('');
  const [summaries, setSummaries] = useState([]);
  const [progress, setProgress] = useState(0);

  // ================================
  // 📁 파일 업로드 (AI 서버 미구현용 mock)
  // ================================
  const handleUpload = async (selectedFile = file) => {
    if (!selectedFile) return alert('📁 파일을 선택해주세요!');
    console.log('[Mock] 파일 업로드 시작:', selectedFile.name);

    setStatus('PROCESSING');
    setProgress(10);

    // ⏳ 가짜 진행률 시뮬레이션
    const interval = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + 10));
    }, 400);

    // 3초 후 완료 처리
    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      setStatus('COMPLETED');

      // ✅ 더미 요약 데이터
      setSummaries([
        { chapter: 1, summary_text: 'AI의 기본 개념 및 역사' },
        { chapter: 2, summary_text: '머신러닝의 주요 알고리즘 개요' },
        { chapter: 3, summary_text: '딥러닝과 신경망 구조 이해' },
      ]);
    }, 3000);
  };

  // 드래그 앤 드롭 & 자동 업로드
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      // 한 프레임 뒤 업로드 자동 실행
      setTimeout(() => handleUpload(selectedFile), 100);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setTimeout(() => handleUpload(droppedFile), 100);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);

  return (
    <div className="upload-layout">
      <Sidebar />

      <div className="upload-content">
        <div className="upload-board">
          <h1>파일 업로드</h1>

          {/* 업로드 박스 */}
          <div
            className={`upload-box ${isDragging ? 'dragging' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="upload-icon">⬆️</div>
            <p>여기에 파일을 끌어놓으세요</p>

            <input
              type="file"
              id="fileInput"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <label htmlFor="fileInput" className="upload-select-btn">
              또는 파일 선택
            </label>

            {file && <p className="upload-file-name">📁 {file.name}</p>}

            {/* 로딩바 */}
            {status === 'PROCESSING' && (
              <div className="loading-wrapper">
                <div
                  className="loading-bar"
                  style={{ width: `${progress}%` }}
                />
                <p className="loading-text">L O A D I N G</p>
              </div>
            )}
          </div>

          {/* 요약 카드 */}
          <div className="upload-summary">
            <h2>챕터별 요약</h2>

            {status === 'COMPLETED' && summaries.length > 0 ? (
              summaries.map((s, idx) => (
                <div key={idx} className="upload-card active">
                  <b>챕터 {s.chapter}</b> — {s.summary_text}
                </div>
              ))
            ) : (
              <p className="upload-empty-text">요약이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainPage;
