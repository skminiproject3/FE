import { Routes, Route } from 'react-router-dom';
import DashBoardPage from './pages/DashBoardPage';
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import QuizPage from './pages/QuizPage';
import QuizResultPage from './pages/QuizResultPage';
import PrivateRoute from './components/PrivateRoute';  // ✅ 추가

import './styles/DashBoardPage.css';
import FileListPage from './pages/FileListPage';
import SummaryPreviewPage from './pages/SummaryPreviewPage';
import './styles/SummaryPage.css';

function App() {
  return (
    <Routes>

      {/* ✅ 로그인하지 않아도 접근 가능한 페이지 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* ✅ 보호된 페이지(로그인 필요) */}
      <Route path="/" element={<PrivateRoute element={<MainPage />} />} />
      <Route path="/main" element={<PrivateRoute element={<MainPage />} />} />
      <Route path="/board" element={<PrivateRoute element={<DashBoardPage />} />} />
      <Route path="/quiz" element={<PrivateRoute element={<QuizPage />} />} />
      <Route path="/result" element={<PrivateRoute element={<QuizResultPage />} />} />
      <Route path="/file" element={<PrivateRoute element={<FileListPage />} />} />
      <Route path="/summary-preview/:contentId" element={<SummaryPreviewPage />} />
      {/* <Route path="/summary" element={<SummaryPage />} />  */}
    </Routes>
  );
}

export default App;