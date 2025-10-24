// src/api/pyApi.js
import axios from "axios";

const PY_API_BASE_URL =
  import.meta.env.VITE_PYAPIURL || "http://127.0.0.1:8000"; // ✅ 환경변수 기반 (로컬 fallback)

const pyApi = axios.create({
  baseURL: PY_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
  withCredentials: false,
});

// 토큰 필요하면 여기서 붙이기(지금은 보통 불필요)
// pyApi.interceptors.request.use((config) => {
//   const token = localStorage.getItem("some_token_for_py");
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

export default pyApi;
