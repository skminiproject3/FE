import { Routes, Route } from 'react-router-dom';
import DashBoardPage  from './pages/DashBoardPage';
import MainPage from './pages/MainPage';
import './styles/DashBoardPage.css';

function App() {
  return (
    <Routes>

      <Route path="/" element={<MainPage />} />
      <Route path="/main" element={<MainPage />} />

      <Route path="/board" element={<DashBoardPage />} />
    </Routes>
  );
}

export default App;
