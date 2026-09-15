export const toPropertyDetailLocation = (property) =>
  `/properties/${encodeURIComponent(String(property.propertyId))}`;
