export const normalizePropertyFileId = (fileId) => {
  if (typeof fileId !== "string" || !/^\d+$/.test(fileId)) {
    throw new TypeError("fileId는 숫자로 변환하지 않은 TSID 문자열이어야 합니다.");
  }
  return fileId;
};

export const normalizeUploadSessionFiles = (files, expectedCount) => {
  if (!Array.isArray(files) || files.length !== expectedCount) {
    throw new Error("업로드 세션의 파일 수가 요청과 일치하지 않습니다.");
  }
  return files.map((item) => {
    if (typeof item?.uploadUrl !== "string" || item.uploadUrl.length === 0) {
      throw new Error("업로드 세션 URL이 올바르지 않습니다.");
    }
    return {
      ...item,
      fileId: normalizePropertyFileId(item.fileId),
      requiredHeaders: item.requiredHeaders && typeof item.requiredHeaders === "object"
        ? { ...item.requiredHeaders }
        : {},
    };
  });
};

export const calculateFileChecksum = async (file) => {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const createFilePreviewUrl = (file, createObjectUrl = URL.createObjectURL) => {
  try {
    return createObjectUrl(file);
  } catch {
    return "";
  }
};
