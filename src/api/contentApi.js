// 📁 src/api/contentApi.js
import api from "./axios";

/** ✅ 파일 업로드 (POST /api/contents/upload) - multipart/form-data
 *  - 백엔드 시그니처: @RequestParam("files") List<MultipartFile> files, @RequestParam("title") String title
 *  - 단일 파일/다중 파일 모두 지원
 *  - Content-Type은 지정하지 말 것 (브라우저가 boundary 자동 지정)
 */
export const uploadContent = async (files, title, onProgress) => {
  const formData = new FormData();

  // title 필수면 반드시 포함
  if (title) formData.append("title", title);

  // 단일 파일/배열 둘 다 허용
  const list = Array.isArray(files) ? files : [files];
  for (const f of list) {
    formData.append("files", f); // ⬅️ 컨트롤러 키와 동일 ("files")
  }

  const { data } = await api.post("/contents/upload", formData, {
    onUploadProgress: (evt) => {
      if (evt?.total && typeof onProgress === "function") {
        const percent = Math.round((evt.loaded * 100) / evt.total);
        onProgress(percent);
      }
    },
    // headers: Content-Type 수동 지정 금지
  });

  return data; // List<UploadResponse>
};

/** ✅ 콘텐츠 처리 상태 조회 (GET /api/contents/{contentId}/status) */
export const fetchContentStatus = async (contentId) => {
  const { data } = await api.get(`/contents/${contentId}/status`);
  return data; // { status, ... }
};

/** ✅ FastAPI → 백엔드 콜백: 벡터 경로 업데이트 (PATCH /api/contents/{contentId}/vector-path?vectorPath=...) */
export const updateVectorPath = async (contentId, vectorPath) => {
  const { data } = await api.patch(`/contents/${contentId}/vector-path`, null, {
    params: { vectorPath },
  });
  return data; // "vectorPath 업데이트 완료: ...";
};

/** ⚠️ 아래 두 API는 네가 보여준 컨트롤러엔 없었음.
 *  백엔드에 해당 엔드포인트가 구현되어 있으면 그대로 사용,
 *  아니면 주석 처리하거나 백엔드에 추가 필요.
 */

/** (옵션) 업로드된 콘텐츠 목록 조회 (GET /api/contents) */
export const fetchUserContents = async () => {
  const { data } = await api.get("/contents");
  return data; // [{ contentId, title, fileName, status }, ...]
};

/** (옵션) 단일 콘텐츠 메타 조회 (GET /api/contents/{contentId}) */
export const fetchContentDetail = async (contentId) => {
  try {
    const { data } = await api.get(`/contents/${contentId}`);
    return data; // { contentId, title, fileName, status, ... }
  } catch (err) {
    console.log("권한/존재 문제로 null 반환:", err);
    return null;
  }
};

/** (옵션) 캐시된 요약 목록 조회 (GET /api/contents/{contentId}/summaries) */
export const fetchContentSummaries = async (contentId) => {
  try {
    const { data } = await api.get(`/contents/${contentId}/summaries`);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.log("요약 없음(또는 지연):", err);
    return [];
  }
};
