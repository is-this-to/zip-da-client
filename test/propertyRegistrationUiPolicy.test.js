import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const propertyCoreFormSource = readFileSync(
  new URL(
    "../src/component/property/PropertyCoreForm.vue",
    import.meta.url,
  ),
  "utf8",
);

const propertyCreatePageSource = readFileSync(
  new URL(
    "../src/page/property/PropertyCreatePage.vue",
    import.meta.url,
  ),
  "utf8",
);

test("매물 등록에서는 레거시 생활 조건 입력을 숨기고 Step4 옵션을 사용한다", () => {
  assert.match(
    propertyCoreFormSource,
    /showLivingConditions/,
  );

  assert.match(
    propertyCoreFormSource,
    /v-if="showLivingConditions"/,
  );

  assert.match(
    propertyCreatePageSource,
    /:show-living-conditions="false"/,
  );

  assert.doesNotMatch(
    propertyCreatePageSource,
    /isParkingAvailable:\s*false/,
  );

  assert.doesNotMatch(
    propertyCreatePageSource,
    /hasElevator:\s*false/,
  );

  assert.doesNotMatch(
    propertyCreatePageSource,
    /isPetAllowed:\s*false/,
  );

  assert.match(
    propertyCreatePageSource,
    /<PropertyRegistrationStep4/,
  );
});