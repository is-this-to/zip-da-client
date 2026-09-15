import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import vue from "@vitejs/plugin-vue";
import { createPinia } from "pinia";
import { createRenderer, nextTick, reactive, ssrContextKey } from "vue";
import { routeLocationKey, routerKey } from "vue-router";

// 실제 페이지 setup과 Pinia store를 실행하되 DOM과 HTTP 전송만 대체한다.
const renderer = createRenderer({
  createComment: () => ({}),
  insert() {},
  remove() {},
  parentNode: () => null,
  nextSibling: () => null,
});
let server, Page, useStore, axios;
before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL("..", import.meta.url)),
    configFile: false,
    plugins: [vue()],
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: "custom",
  });
  Page = (await server.ssrLoadModule("/src/page/property/PropertyVerificationPage.vue")).default;
  useStore = (await server.ssrLoadModule("/src/store/property/usePropertyManagementStore.js")).usePropertyManagementStore;
  axios = (await server.ssrLoadModule("/src/api/myAxios.js")).default;
});
after(async () => { await server?.close(); });

const firstId = "884685586571263701";
const secondId = "884685586571263702";
const fileId = "884685586571263703";
const secondFileId = "884685586571263704";
const fixture = (propertyId, publisherType = "DIRECT_OWNER", verificationStatus = "UNVERIFIED") => ({
  propertyId, publisherType, verificationStatus, version: 4, title: "검증 매물",
});

const mountPage = async (t, mode = "owner", item = fixture(firstId)) => {
  const pinia = createPinia();
  const store = useStore(pinia);
  store.items = [item, fixture(secondId)];
  store.setVerificationEvidence([{ propertyFileId: secondFileId, evidenceType: "OTHER", sortOrder: 0 }]);
  store.ensureAccess = async () => "allowed";
  const route = reactive({ params: { propertyId: firstId, mode } });
  const navigations = [];
  const app = renderer.createApp({ ...Page, render: () => null });
  app.use(pinia);
  app.provide(ssrContextKey, {});
  app.provide(routeLocationKey, route);
  app.provide(routerKey, { replace: async (path) => { navigations.push(path); } });
  const instance = app.mount({});
  t.after(() => app.unmount());
  await nextTick();
  return { store, route, navigations, state: instance.$.setupState };
};

const successResponse = (config) => ({
  config, status: 200, statusText: "OK", headers: {},
  data: { code: "00", data: { ...fixture(firstId), version: 5, verificationStatus: "IN_REVIEW" } },
});

test("페이지 진입·파일 삭제·동의·모드 조건과 중복 제출 및 성공 초기화", async (t) => {
  const { state, store, navigations } = await mountPage(t);
  assert.deepEqual(store.verificationEvidence, []);
  const requests = [];
  let finish;
  axios.defaults.adapter = (config) => {
    requests.push(config);
    return new Promise((resolve) => { finish = () => resolve(successResponse(config)); });
  };
  state.confirmed = true;
  await state.submit();
  assert.equal(requests.length, 0);

  state.verificationFileIds = [fileId, secondFileId];
  assert.equal(state.evidenceReady, true);
  state.verificationFileIds = [secondFileId];
  assert.deepEqual(store.verificationEvidence, [{ propertyFileId: secondFileId, evidenceType: "REGISTRY_DOCUMENT", sortOrder: 0 }]);
  state.verificationFileIds = [];
  assert.equal(state.evidenceReady, false);
  state.verificationFileIds = [fileId];
  state.confirmed = false;
  await state.submit();
  assert.equal(requests.length, 0);
  state.confirmed = true;
  store.items[0].verificationStatus = "IN_REVIEW";
  await state.submit();
  assert.equal(requests.length, 0);
  store.items[0].verificationStatus = "UNVERIFIED";

  const pending = state.submit();
  await state.submit();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, `/api/property/properties/${firstId}/verifications/owner`);
  assert.equal(requests[0].headers.get("If-Match"), '"4"');
  assert.deepEqual(JSON.parse(requests[0].data), {
    version: 4,
    evidence: [{ propertyFileId: fileId, evidenceType: "REGISTRY_DOCUMENT", sortOrder: 0 }],
  });
  finish();
  await pending;
  assert.deepEqual(store.verificationEvidence, []);
  assert.deepEqual(state.verificationFileIds, []);
  assert.equal(state.confirmed, false);
  assert.deepEqual(navigations, ["/my-properties"]);
});

test("임차인·중개사 재검증의 완료 파일을 실제 store에 연결한다", async (t) => {
  for (const [mode, publisher, status, evidenceType] of [
    ["tenant", "DIRECT_TENANT", "UNVERIFIED", "OWNERSHIP_CONTRACT"],
    ["reverification", "AGENT_BROKERAGE", "AGENT_VERIFIED", "BROKERAGE_REGISTRATION"],
  ]) {
    await t.test(mode, async (t) => {
      const { state, store } = await mountPage(t, mode, fixture(firstId, publisher, status));
      state.verificationFileIds = [fileId];
      assert.equal(state.modeAllowed, true);
      assert.equal(store.verificationEvidence[0].evidenceType, evidenceType);
      t.after(() => assert.deepEqual(store.verificationEvidence, []));
    });
  }
});

test("요청 실패 시 기존 오류·traceId와 증빙을 유지한다", async (t) => {
  const { state, store, navigations } = await mountPage(t);
  axios.defaults.adapter = async () => {
    throw { response: { status: 503, data: { message: "UNAVAILABLE", traceId: "trace-verification" } } };
  };
  state.verificationFileIds = [fileId];
  state.confirmed = true;
  await state.submit();
  assert.equal(store.error.traceId, "trace-verification");
  assert.ok(store.error.message);
  assert.equal(store.error.isRetryable, true);
  assert.equal(store.verificationEvidence.length, 1);
  assert.equal(state.isSubmitting, false);
  assert.deepEqual(navigations, []);
});

test("같은 페이지에서 매물·모드를 바꾸면 초기화하고 이전 제출 완료가 새 증빙에 영향을 주지 않는다", async (t) => {
  const { state, store, route, navigations } = await mountPage(t);
  let finish;
  axios.defaults.adapter = (config) => new Promise((resolve) => { finish = () => resolve(successResponse(config)); });
  state.verificationFileIds = [fileId];
  state.confirmed = true;
  const pending = state.submit();
  await new Promise((resolve) => setImmediate(resolve));
  const oldSession = state.evidenceSession;
  route.params = { propertyId: secondId, mode: "owner" };
  await nextTick();
  assert.ok(state.evidenceSession > oldSession);
  assert.deepEqual(store.verificationEvidence, []);
  assert.equal(state.confirmed, false);
  state.verificationFileIds = [secondFileId];
  finish();
  await pending;
  assert.equal(store.verificationEvidence[0].propertyFileId, secondFileId);
  assert.deepEqual(navigations, []);
  route.params.mode = "reverification";
  await nextTick();
  assert.deepEqual(state.verificationFileIds, []);
  assert.deepEqual(store.verificationEvidence, []);
});
