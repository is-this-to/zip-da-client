import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import { createPinia } from "pinia";
import { createRenderer, nextTick, reactive, ssrContextKey } from "vue";
import { routeLocationKey, routerKey } from "vue-router";

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

const renderer = createRenderer({
  createComment: () => ({}),
  insert() {},
  remove() {},
  parentNode: () => null,
  nextSibling: () => null,
});

let server, Page, useStore;

before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    configFile: false,
    plugins: [vue()],
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  Page = (await server.ssrLoadModule("/src/page/property/PropertyCreatePage.vue")).default;
  useStore = (await server.ssrLoadModule("/src/store/property/usePropertyManagementStore.js")).usePropertyManagementStore;
});

after(async () => {
  await server?.close();
});

const mountCreatePage = async (t) => {
  const pinia = createPinia();
  const store = useStore(pinia);
  store.ensureAccess = async () => "allowed";
  const navigations = [];
  const app = renderer.createApp({ ...Page, render: () => null });
  app.use(pinia);
  app.provide(ssrContextKey, {});
  app.provide(routeLocationKey, reactive({}));
  app.provide(routerKey, {
    replace: async (path) => navigations.push({ type: "replace", path }),
    push: async (path) => navigations.push({ type: "push", path }),
  });
  const instance = app.mount({});
  t.after(() => app.unmount());
  await nextTick();
  return { store, navigations, state: instance.$.setupState };
};

test("매물 등록에서 생활 조건 정형 필드를 입력받고 form 초기값을 유지한다", () => {
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

  assert.match(
    propertyCreatePageSource,
    /isParkingAvailable:\s*false/,
  );

  assert.match(
    propertyCreatePageSource,
    /hasElevator:\s*false/,
  );

  assert.match(
    propertyCreatePageSource,
    /isPetAllowed:\s*false/,
  );

  assert.match(
    propertyCreatePageSource,
    /<PropertyRegistrationStep4/,
  );
});

test("PropertyRegistrationStep4는 v-else-if로 언마운트되지 않고 v-show로 유지되어 사진 preview와 상태를 보존한다", () => {
  assert.doesNotMatch(
    propertyCreatePageSource,
    /v-else-if="step === 4"/,
  );

  assert.match(
    propertyCreatePageSource,
    /v-show="step === 4"/,
  );

  assert.match(
    propertyCreatePageSource,
    /hasVisitedStep4/,
  );
});

test("A. 4단계 사진 업로드 상태 -> 5단계 이동 -> 이전 시 Step4 상태가 유지되는 흐름을 검증한다", async (t) => {
  const { state, store } = await mountCreatePage(t);

  assert.equal(state.step, 1);
  assert.equal(state.hasVisitedStep4, false);

  state.form.propertyType = "APARTMENT";
  state.form.publisherType = "DIRECT_OWNER";

  const locationFixture = {
    regionId: "884685586571263701",
    apartmentComplexId: "884685586571263704",
    address: {
      roadAddress: "서울시 강남구 테헤란로 1",
      jibunAddress: "역삼동 100",
      legalDongCode: "1168010100",
      longitude: 127.01,
      latitude: 37.51,
    },
  };

  // 3단계 완료 -> 4단계 진입
  state.completeLocationStep(locationFixture);
  await nextTick();
  assert.equal(state.step, 4);
  assert.equal(state.hasVisitedStep4, true);

  // 4단계에서 사진 업로드 및 옵션 선택 완료 -> 5단계 이동
  const step4Patch = {
    fileIds: ["884685586571263702", "884685586571263703"],
    options: [
      { optionCode: "AIR_CONDITIONER", optionValue: "true" },
      { optionCode: "REFRIGERATOR", optionValue: "false" },
    ],
  };
  state.completeStep4(step4Patch);
  assert.equal(state.step, 5);
  // 5단계에서도 hasVisitedStep4는 true로 유지되어 Step4 컴포넌트가 언마운트되지 않음
  assert.equal(state.hasVisitedStep4, true);
  assert.equal(store.registrationIntegration?.fileIds?.length, 2);
  assert.deepEqual(store.registrationIntegration?.fileIds, ["884685586571263702", "884685586571263703"]);

  // 5단계에서 이전 버튼 클릭 -> 4단계로 복귀
  state.goBack();
  assert.equal(state.step, 4);
  assert.equal(state.hasVisitedStep4, true);

  // 4단계에서 이전 버튼 클릭 -> 3단계 복귀 후 다시 4단계 이동
  state.backFromStep4(step4Patch);
  assert.equal(state.step, 3);
  assert.equal(state.hasVisitedStep4, true);

  state.completeLocationStep(locationFixture);
  assert.equal(state.step, 4);
  assert.equal(state.hasVisitedStep4, true);
});

test("B. 새 등록 페이지 시작 시 이전 registration draft는 초기화되는 기존 정책 유지", async (t) => {
  const pinia = createPinia();
  const store = useStore(pinia);

  // 이전 등록의 잔여 데이터 시뮬레이션
  store.setRegistrationIntegration({
    regionId: "884685586571263701",
    apartmentComplexId: "884685586571263704",
    fileIds: ["884685586571263702", "884685586571263703"],
    options: [{ optionCode: "AIR_CONDITIONER", optionValue: "true" }],
  });
  store.error = { message: "이전 에러", fieldErrors: {} };

  assert.notEqual(store.registrationIntegration, null);
  assert.equal(store.registrationIntegration?.fileIds?.length, 2);
  assert.equal(store.error?.message, "이전 에러");

  // resetRegistrationDraft 호출 (또는 페이지 mount)
  store.resetRegistrationDraft();

  assert.equal(store.registrationIntegration, null);
  assert.equal(store.error, null);

  // 페이지 마운트 시에도 resetRegistrationDraft가 실행되는지 검증
  store.setRegistrationIntegration({
    regionId: "884685586571263701",
    fileIds: ["884685586571263702"],
    options: [],
  });
  const { store: mountedStore } = await mountCreatePage(t);
  assert.equal(mountedStore.registrationIntegration, null);
});
