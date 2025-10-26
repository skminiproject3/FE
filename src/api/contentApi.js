// 📁 src/api/contentApi.js
import api from "./axios";

/* ============================
 *  공통 헬퍼
 * ============================ */

/** 업로드 응답(data)이 단일/배열/객체 어떤 형태여도 파일 경로 리스트를 뽑아낸다 */
function extractFilePaths(uploadData) {
  const list = Array.isArray(uploadData) ? uploadData : [uploadData];
  const paths = [];

  for (const item of list) {
    if (!item) continue;
    const p =
      item.file_path ||
      item.filePath ||
      item.path ||
      item.vectorPath ||
      null;
    if (p) paths.push(p);
  }
  return paths;
}

/** 업로드 응답(data)에서 contentId(또는 id)를 최대한 뽑아낸다 */
function extractContentIds(uploadData) {
  const list = Array.isArray(uploadData) ? uploadData : [uploadData];
  const ids = [];

  for (const item of list) {
    if (!item) continue;
    const id = item.contentId ?? item.id ?? item.content_id ?? null;
    if (id != null) ids.push(id);
  }
  return ids;
}

/* ============================
 *  업로드
 * ============================ */

/**
 * ✅ 파일 업로드 (POST /api/contents/upload) - multipart/form-data
 * - @RequestParam("files") List<MultipartFile> files, @RequestParam("title") String title
 * - 단일/다중 파일 모두 지원
 * - Content-Type은 자동 설정(수동 지정 금지)
 */
export const uploadContent = async (files, title, onProgress) => {
  const formData = new FormData();
  if (title) formData.append("title", title);

  const list = Array.isArray(files) ? files : [files];
  for (const f of list) {
    formData.append("files", f); // 컨트롤러 파라미터명과 동일
  }

  const { data } = await api.post("/contents/upload", formData, {
    onUploadProgress: (evt) => {
      if (evt?.total && typeof onProgress === "function") {
        const percent = Math.round((evt.loaded * 100) / evt.total);
        onProgress(percent);
      }
    },
  });

  return data; // 배열/객체 어떤 형태든 그대로 반환
};

/* ============================
 *  요약 생성 (생성은 반드시 POST!)
 * ============================ */

/** ✅ 요약 생성: contentId로 트리거 (POST /api/contents/{id}/summarize) — 바디 없음 */
export const createSummaryByContentId = async (contentId) => {
  const url = `/contents/${contentId}/summarize`;
  const { data } = await api.post(url, null, { responseType: "text" });
  return data; // string
};

/** ✅ 챕터 요약 생성: (POST /api/contents/{id}/summaries) — { chapter: number }, 문자열 반환 */
export const createChapterSummary = async (contentId, chapter) => {
  const url = `/contents/${contentId}/summaries`;
  const { data } = await api.post(url, { chapter: Number(chapter) }, { responseType: "text" });
  return data; // string
};


/** (옵션) 요약 생성: 파일 경로 리스트로 트리거
 *  ⛔️ 백엔드에 /api/summaries (paths 기반) 엔드포인트가 있을 때만 사용
 */
export const createSummaryByPaths = async (paths, chapter = null) => {
  const payload = { pdf_paths: paths, chapter_request: chapter };
  const { data } = await api.post("/summaries", payload);
  return data;
};

/**
 * ✅ 업로드 → 요약 생성까지 한 번에
 * - 업로드 응답에서 contentId가 있으면 그 경로로 summarize 호출 (우선)
 * - (선택) paths 기반 summarize 엔드포인트가 있을 때만 보조로 시도
 */
export const uploadAndSummarize = async (files, title, onProgress, chapter = null) => {
  const uploadRes = await uploadContent(files, title, onProgress);

  const ids = extractContentIds(uploadRes);
  if (ids.length > 0) {
    const summary = chapter == null
      ? await createSummaryByContentId(ids[0])
      : await createChapterSummary(ids[0], chapter);
    return { upload: uploadRes, summary };
  }

  // (옵션) paths 기반 summarize는 백엔드에 있을 때만 사용. 없다면 이 블록은 삭제해도 됨.
  const paths = extractFilePaths(uploadRes);
  if (paths.length > 0 && chapter == null) {
    const summary = await createSummaryByPaths(paths, null);
    return { upload: uploadRes, summary };
  }

  throw new Error("업로드 응답에서 contentId 또는 file_path를 찾을 수 없습니다.");
};

/* ============================
 *  상태/조회 (GET은 조회용)
 * ============================ */

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
  return data;
};

/** (옵션) 업로드된 콘텐츠 목록 조회 (GET /api/contents) */
export const fetchUserContents = async () => {
  const { data } = await api.get("/contents");
  return data;
};

/** (옵션) 단일 콘텐츠 메타 조회 (GET /api/contents/{contentId}) */
export const fetchContentDetail = async (contentId) => {
  try {
    const { data } = await api.get(`/contents/${contentId}`);
    return data;
  } catch (err) {
    console.log("권한/존재 문제로 null 반환:", err);
    return null;
  }
};

/** (옵션) 캐시된 요약 목록 조회 (GET /api/contents/{contentId}/summaries)
 *  ⚠️ 생성이 아니라 조회입니다. (생성은 위의 POST 함수들 사용)
 */
export const fetchContentSummaries = async (contentId) => {
  try {
    const { data } = await api.get(`/contents/${contentId}/summaries`);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.log("요약 없음(또는 지연):", err);
    return [];
  }
};
