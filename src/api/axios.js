// 📁 src/api/axios.js
import axios from "axios";
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from "../utils/auth";

const api = axios.create({
  baseURL: "http://localhost:8080/api", // 필요 시 수정
  withCredentials: false, // Bearer 방식이므로 false
});

// 요청 인터셉터: 토큰 자동 첨부
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 401이면 refresh로 1회 재발급 & 재시도
let isRefreshing = false;
let pendingQueue = [];

function runQueue(error, token = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (token) {
      resolve(token);
    } else {
      reject(error);
    }
  });
  pendingQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // 401이고, 아직 재시도 안했으면
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      // 이미 갱신 중이면 큐에 걸어두었다가 새 토큰으로 재시도
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token) => {
              original.headers.Authorization = `Bearer ${token}`;
              resolve(api.request(original));
            },
            reject: (err) => reject(err),
          });
        });
      }

      isRefreshing = true;

      try {
        // (만료여부와 무관하게) refreshToken으로 재발급 시도
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error("No refresh token");

        const resp = await axios.post(
          "http://localhost:8080/api/auth/reissue",
          { refreshToken } // JwtTokenProvider 기준, refresh만 있으면 됨
        );

        // 백엔드 TokenResponse: { accessToken, refreshToken, expiresIn }
        saveTokens(resp.data);

        // 대기중인 요청들 재시도
        runQueue(null, resp.data.accessToken);

        // 원래 요청 재시도
        original.headers.Authorization = `Bearer ${resp.data.accessToken}`;
        return api.request(original);
      } catch (e) {
        runQueue(e, null);
        clearTokens();
        // 라우터 접근 어려우니 강제 이동
        window.location.href = "/login";
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;