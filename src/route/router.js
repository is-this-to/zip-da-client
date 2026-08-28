import { createRouter, createWebHistory } from "vue-router";
import Main from "../page/main/Main.vue";
import ErrorPage from "../page/error/ErrorPage.vue";

// 팀원 각자파트 권한을 나눠서 routes 컴포넌트 경로 적어주세요
const setMeta = (requiresAuth, guestOnly, roles = [], showBottomNav = false) => {
  return {
    requiresAuth, // 로그인이 필요?
    guestOnly, // 게스트만 접근 가능?
    roles, // 해당 role을 가진 유저만 접근 가능, []인 경우 role 필요 없음
    showBottomNav, // 메인·목록 화면의 기본 바로가기 표시 여부
  };
};

const routes = [
  {
    path: "/",
    redirect: "/main",
    meta: setMeta(false, false),
  },
  {
    path: "/main",
    component: Main,
    meta: setMeta(false, false, [], true),
  },
  {
    path: "/errors",
    component: ErrorPage,
    meta: setMeta(false, false),
  },
];

// 공통 컴포넌트 확인용 화면은 개발 환경에서만 노출한다.
if (import.meta.env.DEV) {
  routes.push({
    path: "/examples/components",
    component: () => import("../page/example/CommonComponentSample.vue"),
    meta: setMeta(false, false),
  });
}

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// router 이동 전 실행되는 메서드
// to: 이동하는 router, from: 지금 있는 router
router.beforeEach(async (to, from, next) => {

  // 나머지는 통과
  next();
});

export default router;
