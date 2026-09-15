import myAxios from "./myAxios.js";

export const getPublicPropertyDetail = async (propertyId) => {
  const response = await myAxios.get(`/api/properties/${encodeURIComponent(String(propertyId))}`);
  return response.data.data;
};
