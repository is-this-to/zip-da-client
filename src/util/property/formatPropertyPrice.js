/**
 * 원 단위 금액을 억·만 단위의 한국식 문자열로 변환한다.
 *
 * @param {number|string|null|undefined} amount
 * @returns {string}
 */
export const formatKoreanAmount = (amount) => {
  if (
    amount === null ||
    amount === undefined ||
    amount === ""
  ) {
    return "-";
  }

  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount < 0
  ) {
    return "-";
  }

  const won = Math.trunc(numericAmount);

  if (won === 0) {
    return "0원";
  }

  const eok = Math.floor(won / 100_000_000);
  const man = Math.floor((won % 100_000_000) / 10_000);

  if (eok > 0 && man > 0) {
    return (
      `${eok.toLocaleString("ko-KR")}억 ` +
      `${man.toLocaleString("ko-KR")}만`
    );
  }

  if (eok > 0) {
    return `${eok.toLocaleString("ko-KR")}억`;
  }

  if (man > 0) {
    return `${man.toLocaleString("ko-KR")}만`;
  }

  return `${won.toLocaleString("ko-KR")}원`;
};

const hasAmount = (amount) => {
  return (
    amount !== null &&
    amount !== undefined &&
    amount !== "" &&
    Number.isFinite(Number(amount)) &&
    Number(amount) >= 0
  );
};

/**
 * 거래 유형에 맞는 공개 매물 가격 문구를 만든다.
 * API 호출이나 외부 상태에 의존하지 않는 순수 함수다.
 *
 * @param {object|null|undefined} property
 * @returns {string}
 */
export const formatPropertyPrice = (property) => {
  if (!property) {
    return "가격 정보 없음";
  }

  switch (property.transactionType) {
    case "SALE":
      return hasAmount(property.salePrice)
        ? `매매 ${formatKoreanAmount(property.salePrice)}`
        : "가격 정보 없음";

    case "JEONSE":
      return hasAmount(property.deposit)
        ? `전세 ${formatKoreanAmount(property.deposit)}`
        : "가격 정보 없음";

    case "MONTHLY_RENT": {
      const hasDeposit = hasAmount(property.deposit);
      const hasMonthlyRent = hasAmount(property.monthlyRent);

      if (!hasDeposit && !hasMonthlyRent) {
        return "가격 정보 없음";
      }

      if (hasDeposit && hasMonthlyRent) {
        return (
          `월세 ${formatKoreanAmount(property.deposit)}` +
          ` / ${formatKoreanAmount(property.monthlyRent)}`
        );
      }

      if (hasDeposit) {
        return `월세 보증금 ${formatKoreanAmount(property.deposit)}`;
      }

      return `월세 ${formatKoreanAmount(property.monthlyRent)}`;
    }

    default:
      return "가격 정보 없음";
  }
};
