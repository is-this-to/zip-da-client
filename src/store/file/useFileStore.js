import { defineStore } from "pinia";
import myAxios from "../../api/myAxios";

export const useFileStore = defineStore("fileStore", () => {
  const uploadProfile = async (file) => {
    try {
      const url = "/api/member/files/profiles";

      const formData = new FormData();
      formData.append("file", file);

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };
      const res = await myAxios.post(url, formData, config);
      return res.data.data.fileId;
    } catch {
      return null;
    }
  };

  return { uploadProfile };
});
