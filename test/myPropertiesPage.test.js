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

  return { fetchCalls, navigations, state: instance.$.setupState };
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
