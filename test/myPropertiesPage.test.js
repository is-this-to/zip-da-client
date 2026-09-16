// 임호탁 파트 (내 매물 목록 진입·상태 렌더링·더 보기 회귀 테스트)
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createPinia } from "pinia";
import {
  createRenderer,
  createSSRApp,
  nextTick,
  ssrContextKey,
} from "vue";
import { renderToString } from "@vue/server-renderer";
import { routerKey } from "vue-router";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";

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
  Page = (await server.ssrLoadModule("/src/page/property/MyPropertiesPage.vue")).default;
  useStore = (await server.ssrLoadModule(
    "/src/store/property/usePropertyManagementStore.js"
  )).usePropertyManagementStore;
  axios = (await server.ssrLoadModule("/src/api/myAxios.js")).default;
});

after(async () => {
  await server?.close();
});

const flushMounted = async () => {
  await nextTick();
  await new Promise((resolve) => setImmediate(resolve));
};

const mountPage = async (t, access = "allowed") => {
  const pinia = createPinia();
  const store = useStore(pinia);
  const fetchCalls = [];
  const navigations = [];
  store.ensureAccess = async () => access;
  store.fetchMyProperties = async (options) => {
    fetchCalls.push(options);
  };

  const app = renderer.createApp({ ...Page, render: () => null });
  app.use(pinia);
  app.provide(ssrContextKey, {});
  app.provide(routerKey, {
    push: async (path) => navigations.push(path),
    replace: async (path) => navigations.push(path),
  });
  const instance = app.mount({});
  t.after(() => app.unmount());
  await flushMounted();

  return { fetchCalls, navigations, state: instance.$.setupState, store };
};

const renderPage = async (configureStore) => {
  const pinia = createPinia();
  const store = useStore(pinia);
  configureStore(store);

  const app = createSSRApp(Page);
  app.use(pinia);
  app.provide(routerKey, {
    back() {},
    push() {},
    replace() {},
  });
  return renderToString(app);
};

const propertyFixture = {
  propertyId: "884685586571263701",
  version: 3,
  publisherType: "DIRECT_OWNER",
  propertyType: "VILLA",
  transactionType: "SALE",
  salePrice: 15000,
  publicationStatus: "IN_REVIEW",
  transactionStatus: "AVAILABLE",
  verificationStatus: "UNVERIFIED",
  title: "내 매물 목록 테스트",
  updatedAt: "2026-09-16T10:00:00",
};

test("허용된 사용자는 최초 목록을 조회하고 더 보기는 append 요청을 사용한다", async (t) => {
  const { fetchCalls, state } = await mountPage(t);
  assert.deepEqual(fetchCalls, [undefined]);

  await state.loadMore();
  assert.deepEqual(fetchCalls, [undefined, { append: true }]);
});

test("로그인이 필요하면 목록을 조회하지 않고 로그인 화면으로 이동한다", async (t) => {
  const { fetchCalls, navigations } = await mountPage(t, "login");
  assert.deepEqual(fetchCalls, []);
  assert.deepEqual(navigations, ["/sign-in"]);
});

test("내 매물 화면은 단일 헤더와 로딩·빈 결과·오류·목록 상태를 구분한다", async () => {
  const emptyHtml = await renderPage((store) => {
    store.items = [];
    store.error = null;
    store.isAccessLoading = false;
    store.isListLoading = false;
  });
  assert.equal((emptyHtml.match(/<header\b/g) ?? []).length, 1);
  assert.match(emptyHtml, /등록한 매물이 없습니다/);

  const loadingHtml = await renderPage((store) => {
    store.items = [];
    store.error = null;
    store.isListLoading = true;
  });
  assert.match(loadingHtml, /매물을 불러오는 중입니다/);
  assert.doesNotMatch(loadingHtml, /등록한 매물이 없습니다/);

  const errorHtml = await renderPage((store) => {
    store.items = [];
    store.isListLoading = false;
    store.error = {
      message: "목록을 불러오지 못했습니다.",
      traceId: "trace-list",
      isRetryable: true,
    };
  });
  assert.match(errorHtml, /목록을 불러오지 못했습니다/);
  assert.match(errorHtml, /문의 코드: trace-list/);
  assert.match(errorHtml, /다시 시도/);
  assert.doesNotMatch(errorHtml, /등록한 매물이 없습니다/);

  const listHtml = await renderPage((store) => {
    store.items = [propertyFixture];
    store.error = null;
    store.isListLoading = false;
    store.hasNext = true;
  });
  assert.match(listHtml, /내 매물 목록 테스트/);
  assert.match(listHtml, /더 보기/);
});

test("거래 상태 모달은 허용된 전이와 변경 사유만 제출한다", async (t) => {
  const { state, store } = await mountPage(t);
  const calls = [];
  store.changeTransactionStatus = async (...args) => calls.push(args);

  state.openStatus(propertyFixture);
  assert.equal(state.dialogMode, "status");
  assert.equal(state.targetStatus, "RESERVED");
  assert.equal(state.isStatusSelectable("RESERVED"), true);
  assert.equal(state.isStatusSelectable("AVAILABLE"), false);
  assert.equal(state.isStatusSelectable("COMPLETED"), false);

  await state.submitStatus();
  assert.equal(state.localError, "변경 사유를 입력해 주세요.");
  assert.deepEqual(calls, []);

  state.reason = "테스트 상태 변경";
  state.targetStatus = "COMPLETED";
  await state.submitStatus();
  assert.equal(state.localError, "변경할 수 있는 거래 상태를 선택해 주세요.");
  assert.deepEqual(calls, []);

  state.targetStatus = "RESERVED";
  await state.submitStatus();
  assert.deepEqual(calls, [[propertyFixture, "RESERVED", "테스트 상태 변경"]]);
  assert.equal(state.dialogMode, "");
  assert.equal(state.selectedProperty, null);
});

test("거래 상태 변경은 중복 제출을 차단하고 성공한 최신 상태를 목록에 반영한다", async (t) => {
  const { state, store } = await mountPage(t);
  store.items = [{ ...propertyFixture }];
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
        data: {
          ...propertyFixture,
          version: 4,
          transactionStatus: "RESERVED",
        },
      },
    })));
  };
  t.after(() => {
    axios.defaults.adapter = originalAdapter;
  });

  state.openStatus(store.items[0]);
  state.reason = "예약 협의 시작";
  const firstSubmit = state.submitStatus();
  const duplicateSubmit = state.submitStatus();
  await new Promise((resolve) => setImmediate(resolve));
  resolvers.forEach((resolve) => resolve());
  await Promise.all([firstSubmit, duplicateSubmit]);

  assert.equal(requests.length, 1);
  assert.equal(
    requests[0].url,
    `/api/property/properties/${propertyFixture.propertyId}/transaction-status`,
  );
  assert.equal(requests[0].headers.get("If-Match"), '"3"');
  assert.deepEqual(JSON.parse(requests[0].data), {
    version: 3,
    targetStatus: "RESERVED",
    reason: "예약 협의 시작",
  });
  assert.equal(store.items[0].transactionStatus, "RESERVED");
  assert.equal(store.items[0].version, 4);
  assert.equal(state.dialogMode, "");
});

test("버전 충돌 시 거래 상태 모달과 입력값을 유지한다", async (t) => {
  const { state, store } = await mountPage(t);
  store.items = [{ ...propertyFixture }];
  const originalAdapter = axios.defaults.adapter;
  axios.defaults.adapter = async () => {
    throw {
      response: {
        status: 409,
        data: {
          code: "P03",
          message: "VERSION_CONFLICT",
          traceId: "trace-status-conflict",
        },
      },
    };
  };
  t.after(() => {
    axios.defaults.adapter = originalAdapter;
  });

  state.openStatus(store.items[0]);
  await state.submitStatus();
  assert.equal(state.localError, "변경 사유를 입력해 주세요.");
  state.reason = "예약 협의 시작";
  await state.submitStatus();

  assert.equal(state.dialogMode, "status");
  assert.equal(state.reason, "예약 협의 시작");
  assert.equal(state.localError, "");
  assert.equal(store.conflict.traceId, "trace-status-conflict");
  assert.equal(store.items[0].transactionStatus, "AVAILABLE");
});
