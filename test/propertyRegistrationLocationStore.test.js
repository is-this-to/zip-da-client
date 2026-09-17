// 임호탁 파트 (매물 등록 주소 재선택과 Region 문자열 ID 연동 회귀 테스트)
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createPinia } from "pinia";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";

let server;
let useLocationStore;
let axios;

before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    configFile: false,
    plugins: [vue()],
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  useLocationStore = (
    await server.ssrLoadModule(
      "/src/store/property/usePropertyRegistrationLocationStore.js",
    )
  ).usePropertyRegistrationLocationStore;
  axios = (await server.ssrLoadModule("/src/api/myAxios.js")).default;
});

after(async () => {
  await server?.close();
});

const address = {
  roadAddress: "대구광역시 수성구 달구벌대로 2450",
  jibunAddress: "대구광역시 수성구 범어동 123",
  legalDongCode: "2726010100",
  longitude: 128.625123,
  latitude: 35.859321,
};

const location = {
  regionId: "4065",
  regionCode: "2726010100",
  regionName: "범어동",
  fullRegionName: "대구광역시 수성구 범어동",
  ...address,
};

const response = (config, data) => ({
  config,
  status: 200,
  statusText: "OK",
  headers: {},
  data: { code: "00", message: "SUCCESS", data },
});

const createDeferred = () => {
  let resolve;
  const promise = new Promise((next) => {
    resolve = next;
  });
  return { promise, resolve };
};

test("새 주소 검증을 시작하면 이전 Region과 아파트 단지 선택을 즉시 폐기한다", async (t) => {
  const store = useLocationStore(createPinia());
  store.hydrateValidatedLocation({ ...location, regionId: "1" });
  store.apartmentComplexItems = [{ apartmentComplexId: "4423" }];

  const originalAdapter = axios.defaults.adapter;
  const deferred = createDeferred();
  axios.defaults.adapter = async (config) => deferred.promise.then(() =>
    response(config, location));
  t.after(() => {
    axios.defaults.adapter = originalAdapter;
  });

  const pending = store.validateAddress(address);
  assert.equal(store.validatedLocation, null);
  assert.deepEqual(store.apartmentComplexItems, []);
  assert.equal(store.isValidationLoading, true);

  deferred.resolve();
  const result = await pending;

  assert.equal(result.regionId, "4065");
  assert.equal(store.validatedLocation.regionId, "4065");
  assert.equal(typeof store.validatedLocation.regionId, "string");
  assert.equal(store.isValidationLoading, false);
});

test("주소 선택을 해제하면 늦게 도착한 이전 검증 응답을 반영하지 않는다", async (t) => {
  const store = useLocationStore(createPinia());
  const originalAdapter = axios.defaults.adapter;
  const deferred = createDeferred();
  axios.defaults.adapter = async (config) => deferred.promise.then(() =>
    response(config, location));
  t.after(() => {
    axios.defaults.adapter = originalAdapter;
  });

  const pending = store.validateAddress(address);
  store.clearLocationSelection();
  deferred.resolve();

  assert.equal(await pending, null);
  assert.equal(store.validatedLocation, null);
  assert.deepEqual(store.apartmentComplexItems, []);
  assert.equal(store.isValidationLoading, false);
});

test("아파트 단지 조회에는 Region AUTO_INCREMENT ID를 숫자 문자열로 전달한다", async (t) => {
  const store = useLocationStore(createPinia());
  const originalAdapter = axios.defaults.adapter;
  let requestConfig;
  axios.defaults.adapter = async (config) => {
    requestConfig = config;
    return response(config, {
      items: [{ apartmentComplexId: "4423", complexName: "3차가든하이츠" }],
    });
  };
  t.after(() => {
    axios.defaults.adapter = originalAdapter;
  });

  const items = await store.searchApartmentComplexes({
    regionId: "4065",
    size: 20,
  });

  assert.equal(requestConfig.params.regionId, "4065");
  assert.equal(typeof requestConfig.params.regionId, "string");
  assert.equal(items[0].apartmentComplexId, "4423");
  assert.equal(store.isComplexLoading, false);
});

test("주소 검증 오류 메시지를 유지하고 로딩 상태를 종료한다", async (t) => {
  const store = useLocationStore(createPinia());
  const originalAdapter = axios.defaults.adapter;
  axios.defaults.adapter = async () => {
    const error = new Error("request failed");
    error.response = {
      data: { message: "주소와 Region을 찾을 수 없습니다." },
    };
    throw error;
  };
  t.after(() => {
    axios.defaults.adapter = originalAdapter;
  });

  await assert.rejects(store.validateAddress(address), /request failed/);
  assert.equal(store.validatedLocation, null);
  assert.equal(store.isValidationLoading, false);
  assert.equal(store.errorMessage, "주소와 Region을 찾을 수 없습니다.");
});
