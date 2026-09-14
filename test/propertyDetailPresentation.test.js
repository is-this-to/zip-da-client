import test from "node:test";
import assert from "node:assert/strict";

import {
  formatDetailPrice,
  toPropertyDetailFacts,
} from "../src/util/property/propertyDetailPresentation.js";

test("formats monthly rent detail price with deposit", () => {
  assert.equal(
    formatDetailPrice({
      transactionType: "MONTHLY_RENT",
      deposit: 50000000,
      monthlyRent: 700000,
    }),
    "월세 5,000만 / 70만",
  );
});

test("omits missing property facts", () => {
  assert.deepEqual(
    toPropertyDetailFacts({
      exclusiveArea: "59.8",
      floor: 7,
      totalFloor: 15,
      roomCount: null,
      bathroomCount: 1,
      direction: "남향",
      approvalDate: "2020-04-03",
    }),
    [
      ["전용면적", "59.8㎡"],
      ["층", "7층 / 15층"],
      ["욕실", "1개"],
      ["방향", "남향"],
      ["사용승인일", "2020-04-03"],
    ],
  );
});
