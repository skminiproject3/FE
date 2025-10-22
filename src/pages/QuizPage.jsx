// src/pages/QuizPage.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import '../styles/global.css';
import '../styles/DashBoardPage.css';
import '../styles/QuizPage.css';

import Sidebar from '../components/Sidebar';

function QuizPage() {
  const navigate = useNavigate();

  // 업로드 상태
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // 퀴즈 목록
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    // 필요시 백엔드에서 퀴즈 목록을 가져옴
    // API 주소는 환경에 맞게 수정
    async function fetchQuizzes() {
      try {
        const res = await fetch("http://localhost:3000/quizzes");
        if (!res.ok) throw new Error("퀴즈 목록 조회 실패");
        const data = await res.json();
        setQuizzes(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        // 임시 목업
        setQuizzes([
          { id: 1, title: "1번 퀴즈" },
          { id: 2, title: "2번 퀴즈" },
          { id: 3, title: "3번 퀴즈" },
        ]);
      }
    }
    fetchQuizzes();
  }, []);

  const handleBrowseClick = () => fileInputRef.current?.click();

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    uploadFile(file);
  };

  // 업로드 (진행률 표시를 위해 XMLHttpRequest 사용)
  const uploadFile = (file) => {
    const url = "http://localhost:3000/quizzes/upload"; // 업로드 API로 수정
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const p = Math.round((e.loaded / e.total) * 100);
        setProgress(p);
      }
    };

    xhr.onloadstart = () => {
      setUploading(true);
      setProgress(0);
    };

    xhr.onloadend = () => {
      setUploading(false);
      // 완료 후 목록 새로고침
      // 성공 응답 코드에 맞게 분기
      if (xhr.status >= 200 && xhr.status < 300) {
        // 업로드 후 퀴즈 목록 리로드
        (async () => {
          try {
            const res = await fetch("http://localhost:8080/quizzes");
            const data = await res.json();
            setQuizzes(Array.isArray(data) ? data : []);
          } catch {
            /* ignore */
          }
        })();
      } else {
        console.error("업로드 실패:", xhr.status, xhr.responseText);
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      console.error("업로드 중 오류 발생");
    };

    xhr.send(formData);
  };

  // 드래그 앤 드롭
  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="board-layout">
      <Sidebar />
      <div className="content">
        <div className="dashboard">
          <h1>퀴즈 업로드</h1>

          {/* 업로드 박스 */}
          <div
            className={`upload-box ${isDragging ? 'dragging' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={handleBrowseClick}
            role="button"
            aria-label="파일 업로드"
            tabIndex={0}
          >
            <div className="upload-icon">⬆️</div>
            <div className="upload-text">
              여기에 파일을 끌어놓으세요
              <br />
              <small>또는 <u>파일 선택</u></small>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.csv"
              style={{ display: "none" }}
              onChange={(e) => handleFiles(e.target.files)}
            />

            {/* 진행률 바 */}
            {uploading && (
              <div className="progress-wrap" aria-live="polite">
                <div className="progress-bar" style={{ width: `${progress}%` }} />
                <div className="progress-label">LOADING {progress}%</div>
              </div>
            )}
          </div>

          {/* 퀴즈 목록 */}
          <h2 style={{ marginTop: "24px" }}>퀴즈</h2>
          <div className="quiz-list">
            {quizzes.map((q) => (
              <div key={q.id} className="card quiz-item">
                <span>{q.title}</span>
                <button onClick={() => navigate(`/quiz/${q.id}`)}>열기</button>
              </div>
            ))}
            {quizzes.length === 0 && (
              <div className="card">
                <span>등록된 퀴즈가 없습니다.</span>
              </div>
            )}
          </div>

          {/* 결과 페이지로 이동 예시 */}
          <div className="card" style={{ marginTop: "16px" }}>
            <span>퀴즈 결과</span>
            <button onClick={() => navigate('/result')}>📊 결과 보기</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuizPage;