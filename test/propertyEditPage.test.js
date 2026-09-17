import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import { createPinia } from "pinia";
import { createRenderer, nextTick, reactive, ssrContextKey } from "vue";
import { routeLocationKey, routerKey } from "vue-router";

// 임호탁 파트 (매물 수정 조회·저장·충돌 UX 회귀 검증)
const renderer = createRenderer({
  createComment: () => ({}),
  insert() {},
  remove() {},
  parentNode: () => null,
  nextSibling: () => null,
});

let server;
let Page;
let useStore;
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
  Page = (await server.ssrLoadModule("/src/page/property/PropertyEditPage.vue")).default;
  useStore = (await server.ssrLoadModule(
    "/src/store/property/usePropertyManagementStore.js"
  )).usePropertyManagementStore;
  axios = (await server.ssrLoadModule("/src/api/myAxios.js")).default;
});

after(async () => {
  await server?.close();
});

const propertyId = "884685586571263701";
const detailFixture = {
  propertyId,
  version: 3,
  publisherType: "DIRECT_OWNER",
  propertyType: "APARTMENT",
  transactionType: "SALE",
  salePrice: 500000000,
  deposit: null,
  monthlyRent: null,
  maintenanceFee: 100000,
  supplyArea: 84.5,
  exclusiveArea: 59.9,
  roomCount: 3,
  bathroomCount: 2,
  floor: 8,
  totalFloor: 15,
  floorCondition: "중층",
  direction: "남향",
  approvalDate: "2024-01-01",
  buildingUse: "공동주택",
  isParkingAvailable: true,
  hasElevator: true,
  isPetAllowed: false,
  title: "수정 전 제목",
  description: "수정 전 설명입니다.",
  publicationStatus: "PUBLIC",
  transactionStatus: "AVAILABLE",
  verificationStatus: "OWNER_VERIFIED",
};

const flushMounted = async () => {
  await nextTick();
  await new Promise((resolve) => setImmediate(resolve));
  await nextTick();
};

const mountPage = async (t, access = "allowed") => {
  const pinia = createPinia();
  const store = useStore(pinia);
  const route = reactive({ params: { propertyId } });
  const navigations = [];
  let loadCount = 0;
  store.ensureAccess = async () => access;
  store.fetchEditDetail = async () => {
    loadCount += 1;
    const detail = loadCount === 1
      ? { ...detailFixture }
      : { ...detailFixture, version: 4, title: "수정된 제목" };
    store.editDetail = detail;
    return detail;
  };

  const app = renderer.createApp({ ...Page, render: () => null });
  app.use(pinia);
  app.provide(ssrContextKey, {});
  app.provide(routeLocationKey, route);
  app.provide(routerKey, {
    replace: async (path) => navigations.push({ type: "replace", path }),
    push: async (path) => navigations.push({ type: "push", path }),
  });
  const instance = app.mount({});
  t.after(() => app.unmount());
  await flushMounted();

  return {
    store,
    state: instance.$.setupState,
    navigations,
    getLoadCount: () => loadCount,
  };
};

test("수정 화면은 권한 확인 후 상세 데이터를 입력 폼에 반영한다", async (t) => {
  const { state, store, getLoadCount } = await mountPage(t);

  assert.equal(getLoadCount(), 1);
  assert.equal(store.editDetail.propertyId, propertyId);
  assert.equal(state.form.title, "수정 전 제목");
  assert.equal(state.form.version, 3);
  assert.equal(state.form.salePrice, 50000);
  assert.equal(state.form.maintenanceFee, 10);
});

test("로그인이 필요하면 상세 조회 없이 로그인 화면으로 이동한다", async (t) => {
  const { navigations, getLoadCount } = await mountPage(t, "login");

  assert.equal(getLoadCount(), 0);
  assert.deepEqual(navigations, [{ type: "replace", path: "/sign-in" }]);
});

test("변경 내용이 없으면 수정 API를 호출하지 않는다", async (t) => {
  const { state } = await mountPage(t);
  const originalAdapter = axios.defaults.adapter;
  const requests = [];
  axios.defaults.adapter = async (config) => {
    requests.push(config);
    throw new Error("수정 요청이 호출되면 안 됩니다.");
  };
  t.after(() => {
    axios.defaults.adapter = originalAdapter;
  });

  await state.submit();

  assert.equal(state.errors.form, "변경된 내용이 없습니다.");
  assert.deepEqual(requests, []);
});

test("매물 수정은 중복 제출을 차단하고 최신 상세를 다시 조회한다", async (t) => {
  const { state, store, getLoadCount } = await mountPage(t);
  const originalAdapter = axios.defaults.adapter;
  const requests = [];
  const resolvers = [];
  axios.defaults.adapter = (config) => {
    requests.push(config);
    return new Promise((resolve) => resolvers.push(() => resolve({
      config,
      status: 200,
      statusText: "OK",
      headers: {},
      data: {
        code: "00",
        data: { ...detailFixture, version: 4, title: "수정된 제목" },
      },
    })));
  };
  t.after(() => {
    axios.defaults.adapter = originalAdapter;
  });

  state.form.title = "  수정된 제목  ";
  state.form.salePrice = 55000;
  const firstSubmit = state.submit();
  const duplicateSubmit = state.submit();
  await new Promise((resolve) => setImmediate(resolve));
  resolvers.forEach((resolve) => resolve());
  await Promise.all([firstSubmit, duplicateSubmit]);

  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, "patch");
  assert.equal(requests[0].url, `/api/property/properties/${propertyId}`);
  assert.equal(requests[0].headers.get("If-Match"), '"3"');
  assert.deepEqual(JSON.parse(requests[0].data), {
    version: 3,
    changes: { title: "수정된 제목", salePrice: 550000000 },
  });
  assert.equal(getLoadCount(), 2);
  assert.equal(store.editDetail.version, 4);
  assert.equal(state.form.title, "수정된 제목");
});

test("수정 버전 충돌 시 작성값을 유지하고 자동 재조회하지 않는다", async (t) => {
  const { state, store, getLoadCount } = await mountPage(t);
  const originalAdapter = axios.defaults.adapter;
  axios.defaults.adapter = async () => {
    throw {
      response: {
        status: 409,
        data: {
          code: "P03",
          message: "VERSION_CONFLICT",
          traceId: "trace-edit-conflict",
        },
      },
    };
  };
  t.after(() => {
    axios.defaults.adapter = originalAdapter;
  });

  state.form.title = "충돌 중 작성한 제목";
  await state.submit();

  assert.equal(getLoadCount(), 1);
  assert.equal(state.form.title, "충돌 중 작성한 제목");
  assert.equal(store.conflict.traceId, "trace-edit-conflict");
  assert.equal(store.editDetail.version, 3);
});
