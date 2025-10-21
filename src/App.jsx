import { Routes, Route } from 'react-router-dom';
import DashBoardPage  from './pages/DashBoardPage';
import MainPage from './pages/MainPage';
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import SummaryPage from './pages/SummaryPage';
import './styles/DashBoardPage.css';

function App() {
  return (
    <Routes>

      <Route path="/" element={<MainPage />} />
      <Route path="/main" element={<MainPage />} />

      <Route path="/board" element={<DashBoardPage />} />
      
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/summary" element={<SummaryPage />} />
    </Routes>
  );
}

export default App;
