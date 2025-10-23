import api from "./axios";

// 업로드된 콘텐츠 목록 조회 (GET /api/contents)
export const fetchUserContents = async () => {
  try {
    const res = await api.get("/contents");
    return res.data;
  } catch (err) {
    console.error("[contentApi] 파일 목록 조회 실패:", err);
    throw err;
  }
};

// 파일 업로드 (POST /api/contents)
export const uploadContent = async (file, title,onProgress) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);

  try {
    const res = await api.post("/contents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (event.total) {
          const percent = Math.round((event.loaded * 100) / event.total);
          onProgress?.(percent); // 콜백으로 진행률 전달
        }
      },
    });
    return res.data;
  } catch (err) {
    console.error("[contentApi] 파일 업로드 실패:", err);
    throw err;
  }
};

// 콘텐츠 상태 조회 (GET /api/contents/{contentId}/status)
export const fetchContentStatus = async (contentId) => {
  try {
    const res = await api.get(`/contents/${contentId}/status`);
    return res.data;
  } catch (err) {
    console.error("[contentApi] 콘텐츠 상태 조회 실패:", err);
    throw err;
  }
};
