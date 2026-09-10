import { defineStore } from "pinia";
import myAxios from "../../api/myAxios";

export const useFileStore = defineStore("fileStore", () => {
  const uploadProfile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    return (
      await myAxios.post("/api/member/files/profiles", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data.data;
  };

  return { uploadProfile };
});
