import myAxios from "./myAxios.js";

export const fetchPropertyOptionCodes = async (propertyType) => {
  const response = await myAxios.get("/api/property/property-option-codes", {
    params: { propertyType },
  });
  return response.data?.data?.items ?? [];
};
