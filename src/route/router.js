import { createRouter, createWebHistory } from "vue-router";
import Main from "../page/main/Main.vue";
import ErrorPage from "../page/error/ErrorPage.vue";
import SignIn from "../page/auth/SignIn.vue";
import SignUp from "../page/auth/SignUp.vue";
import { useAuthStore } from "../store/auth/useAuthStore.js";
import OAuth2Callback from "../page/auth/OAuth2Callback.vue";
import SocialSignUp from "../page/auth/SocialSignUp.vue";
import SocialAccountLink from "../page/auth/SocialAccountLink.vue";
import MyPage from "../page/member/MyPage.vue";
import AgentDocumentUpload from "../page/member/AgentDocumentUpload.vue";
import AgentOcrResult from "../page/member/AgentOcrResult.vue";
import MemberProfileEdit from "../page/member/MemberProfileEdit.vue";
import MemberPasswordChange from "../page/member/MemberPasswordChange.vue";
import AgentProfileEdit from "../page/agent/AgentProfileEdit.vue";
import AgentProfileDetail from "../page/agent/AgentProfileDetail.vue";
import PasswordReset from "../page/auth/PasswordReset.vue";

// 팀원 각자파트 권한을 나눠서 routes 컴포넌트 경로 적어주세요
const setMeta = (
  requiresAuth,
  guestOnly,
  roles = [],
  showBottomNav = false,
) => {
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
    path: "/properties/search",
    component: () => import("../page/property/PropertyMapPage.vue"),
    meta: setMeta(false, false, [], true),
  },
  // 임호탁 파트 (매물 등록·내 매물 관리 라우트)
  {
    path: "/my-properties",
    name: "my-properties",
    component: () => import("../page/property/MyPropertiesPage.vue"),
    meta: setMeta(true, false, ["USER", "AGENT"], true),
  },
  {
    path: "/properties/new",
    name: "property-create",
    component: () => import("../page/property/PropertyCreatePage.vue"),
    meta: setMeta(true, false, ["USER", "AGENT"]),
  },
  {
    path: "/properties/:propertyId/edit",
    name: "property-edit",
    component: () => import("../page/property/PropertyEditPage.vue"),
    meta: setMeta(true, false, ["USER", "AGENT", "CS_ADMIN", "SUPER_ADMIN"]),
  },
  {
    path: "/properties/:propertyId/verification/:mode(owner|tenant|reverification)",
    name: "property-verification",
    component: () => import("../page/property/PropertyVerificationPage.vue"),
    meta: setMeta(true, false, ["USER", "AGENT"]),
  },
  // 임호탁 파트 끝
  {
    path: "/properties",
    component: () => import("../page/property/PropertyMapPage.vue"),
    meta: setMeta(false, false, [], true),
  },
  {
    path: "/properties/:propertyId",
    name: "property-detail",
    component: () => import("../page/property/PropertyDetailPage.vue"),
    meta: setMeta(false, false),
  },
  {
    path: "/favorites",
    component: () => import("../page/favorite/FavoriteListPage.vue"),
    meta: setMeta(true, false, ["USER", "AGENT"], true),
  },
  {
    path: "/sign-in",
    component: SignIn,
    meta: setMeta(false, true),
  },
  {
    path: "/sign-up",
    component: SignUp,
    meta: setMeta(false, true),
  },
  {
    path: "/mypage",
    alias: "/members/me",
    component: MyPage,
    meta: setMeta(true, false, ["USER", "AGENT"], true),
  },
  {
    path: "/mypage/agent-application/documents",
    component: AgentDocumentUpload,
    meta: setMeta(true, false, ["USER"]),
  },
  {
    path: "/mypage/agent-application/ocr",
    component: AgentOcrResult,
    meta: setMeta(true, false, ["USER"]),
  },
  {
    path: "/mypage/profile",
    component: MemberProfileEdit,
    meta: setMeta(true, false, ["USER", "AGENT"]),
  },
  {
    path: "/mypage/password",
    component: MemberPasswordChange,
    meta: setMeta(true, false, ["USER", "AGENT"]),
  },
  {
    path: "/mypage/agent-profile",
    component: AgentProfileEdit,
    meta: setMeta(true, false, ["AGENT"]),
  },
  {
    path: "/agents/:agentId",
    component: AgentProfileDetail,
    meta: setMeta(false, false),
  },
  {
    path: "/password-reset",
    component: PasswordReset,
    meta: setMeta(false, true),
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
  const authStore = useAuthStore();
  if (!authStore.authInitialized) {
    try {
      await authStore.reissue();
    } catch {
      // 토큰 재발급 실패: 게스트 상태로 진행
    }
  }

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return next("/sign-in");
  }

  if (
    to.meta.roles?.length &&
    authStore.isLoggedIn &&
    !to.meta.roles.includes(authStore.role)
  ) {
    return next("/errors");
  }

  // 나머지는 통과
  next();
});

export default router;
