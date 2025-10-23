// src/api/pyApi.js
import axios from "axios";

const pyApi = axios.create({
  baseURL: "http://127.0.0.1:8000",   // FastAPI
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
  withCredentials: false,             // 보통 필요 없음
});

// 토큰 필요하면 여기서 붙이기(지금은 보통 불필요)
// pyApi.interceptors.request.use((config) => {
//   const token = localStorage.getItem("some_token_for_py");
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

export default pyApi;
