import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import '../styles/global.css';
import '../styles/MainPage.css';
import { uploadContent } from '../api/contentApi'; 

function MainPage() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  // 로그인 안 했을 경우 접근 제한
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/login');
    }
  }, [navigate]);

  // 실제 파일 업로드 기능 (진행률 반영)
  const handleUpload = async (selectedFile = file) => {
    if (!selectedFile) return alert('파일을 선택해주세요!');
    console.log('[Upload] 파일 업로드 시작:', selectedFile.name);

    setStatus('PROCESSING');
    setProgress(0);

    try {
      // 일명 전체(확장자 포함)를 title로 전달
      const result = await uploadContent(
        selectedFile,
        selectedFile.name,
        (percent) => setProgress(percent) // ← 실시간 반영
      );

      console.log('업로드 성공:', result);
      setProgress(100);
      setStatus('COMPLETED');
    } catch (error) {
      console.error('업로드 실패:', error);
      setStatus('FAILED');
      alert('파일 업로드 중 오류가 발생했습니다.');
    }
  };

  // 파일 선택 이벤트
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setTimeout(() => handleUpload(selectedFile), 100);
    }
  };

  // 드래그 앤 드롭 업로드
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

  // UI 렌더링
  return (
    <div className="upload-layout">
      <Sidebar />

      <div className="upload-content">
        <div className="upload-board">
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

            {/* 실제 진행률 기반 로딩바 */}
            {status === 'PROCESSING' && (
              <div className="loading-wrapper">
                <div className="loading-bar" style={{ width: `${progress}%` }} />
                <p className="loading-text">{progress}%</p>
              </div>
            )}
          </div>

          {/* 업로드 결과 표시 */}
          <div className="upload-summary">
            <h2>분석 결과</h2>

            {status === 'COMPLETED' ? (
              <div className="upload-finish-message">요약 & 퀴즈 생성 완료!</div>
            ) : status === 'FAILED' ? (
              <div className="upload-finish-message error">업로드 실패!</div>
            ) : (
              <p className="upload-empty-text">분석이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainPage;
