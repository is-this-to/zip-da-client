import { formatPropertyPrice } from "./formatPropertyPrice.js";

const hasValue = (value) => {
  return value !== null && value !== undefined && value !== "";
};

const formatArea = (value) => `${value}㎡`;

/**
 * 상세 화면에서 쓰는 거래 가격 문구를 만든다.
 *
 * @param {object|null|undefined} property
 * @returns {string}
 */
export const formatDetailPrice = (property) => {
  return formatPropertyPrice(property);
};

/**
 * 값이 있는 공개 매물 기본 정보를 화면용 행으로 변환한다.
 *
 * @param {object|null|undefined} property
 * @returns {Array<[string, string]>}
 */
export const toPropertyDetailFacts = (property = {}) => {
  const facts = [];
  const addFact = (label, value) => {
    if (hasValue(value)) {
      facts.push([label, String(value)]);
    }
  };

  if (hasValue(property.supplyArea)) {
    addFact("공급면적", formatArea(property.supplyArea));
  }

  if (hasValue(property.exclusiveArea)) {
    addFact("전용면적", formatArea(property.exclusiveArea));
  }

  if (hasValue(property.floor)) {
    addFact(
      "층",
      hasValue(property.totalFloor)
        ? `${property.floor}층 / ${property.totalFloor}층`
        : `${property.floor}층`,
    );
  } else if (hasValue(property.totalFloor)) {
    addFact("총층", `${property.totalFloor}층`);
  }

  addFact(
    "방",
    hasValue(property.roomCount) ? `${property.roomCount}개` : null,
  );
  addFact(
    "욕실",
    hasValue(property.bathroomCount) ? `${property.bathroomCount}개` : null,
  );
  addFact("방향", property.direction);
  addFact("사용승인일", property.approvalDate);

  return facts;
};

export const formatBooleanAvailability = (value) => {
  if (value === true) {
    return "가능";
  }

  if (value === false) {
    return "불가";
  }

  return "정보 없음";
};

export const propertyTypeLabels = {
  APARTMENT: "아파트",
  OFFICETEL: "오피스텔",
  VILLA: "빌라",
  ROOM: "원룸·투룸",
};

export const publisherTypeLabels = {
  DIRECT_OWNER: "직거래",
  AGENT_BROKERAGE: "중개",
};
