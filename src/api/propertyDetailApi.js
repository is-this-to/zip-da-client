import myAxios from "./myAxios.js";

export const getPublicPropertyDetail = async (propertyId) => {
  const response = await myAxios.get(
    `/api/property/properties/${encodeURIComponent(String(propertyId))}`,
  );

  return response.data.data;
};

export const getMyPropertyDetail = async (propertyId) => {
  const response = await myAxios.get(
    `/api/property/properties/${encodeURIComponent(String(propertyId))}/edit`,
  );

  return response.data.data;
};
