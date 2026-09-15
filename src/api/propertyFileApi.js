import myAxios from "./myAxios.js";
import {
  calculateFileChecksum,
  normalizePropertyFileId,
  normalizeUploadSessionFiles,
} from "./propertyFilePolicy.js";

export const createPropertyUploadSession = async (files, filePurpose = "PROPERTY_IMAGE") => {
  const response = await myAxios.post("/api/property/files/upload-sessions", {
    filePurpose,
    files: files.map((file) => ({ name: file.name, size: file.size })),
  });
  return normalizeUploadSessionFiles(response.data?.data?.files, files.length);
};

export const putPropertyFile = async (upload, file) => {
  const response = await fetch(upload.uploadUrl, {
    method: "PUT",
    headers: upload.requiredHeaders,
    body: file,
  });
  if (!response.ok) throw new Error(`파일 업로드에 실패했습니다. (${response.status})`);
};

export const completePropertyFile = async (fileId, file) => {
  const normalizedFileId = normalizePropertyFileId(fileId);
  const checksum = await calculateFileChecksum(file);
  await myAxios.post(
    `/api/property/files/${encodeURIComponent(normalizedFileId)}/complete`,
    { checksum, size: file.size },
  );
  return normalizedFileId;
};
