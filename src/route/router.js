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

// ???媛곸옄?뚰듃 沅뚰븳???섎닠??routes 而댄룷?뚰듃 寃쎈줈 ?곸뼱二쇱꽭??
const setMeta = (
  requiresAuth,
  guestOnly,
  roles = [],
  showBottomNav = false,
) => {
  return {
    requiresAuth, // 濡쒓렇?몄씠 ?꾩슂?
    guestOnly, // 寃뚯뒪?몃쭔 ?묎렐 媛??
    roles, // ?대떦 role??媛吏??좎?留??묎렐 媛?? []??寃쎌슦 role ?꾩슂 ?놁쓬
    showBottomNav, // 硫붿씤쨌紐⑸줉 ?붾㈃??湲곕낯 諛붾줈媛湲??쒖떆 ?щ?
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
  // ?꾪샇???뚰듃 (留ㅻЪ ?깅줉쨌??留ㅻЪ 愿由??쇱슦??
  {
    path: "/my-properties",
    name: "my-properties",
    component: () => import("../page/property/MyPropertiesPage.vue"),
    meta: setMeta(true, false, ["USER", "AGENT"], true),
  },
  {
    path: "/my-properties/:propertyId",
    name: "my-property-detail",
    component: () => import("../page/property/PropertyDetailPage.vue"),
    meta: setMeta(true, false, ["USER", "AGENT"]),
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
  // ?꾪샇???뚰듃 ??
  // 愿由ъ옄 留ㅻЪ 寃利씲룰났媛?寃??
  {
    path: "/admin/property-verifications",
    name: "admin-property-verifications",
    component: () =>
      import("../page/admin/PropertyVerificationAdminListPage.vue"),
    meta: setMeta(true, false, ["CS_ADMIN", "SUPER_ADMIN"]),
  },
  {
    path: "/admin/property-verifications/:verificationId",
    name: "admin-property-verification-detail",
    component: () =>
      import("../page/admin/PropertyVerificationAdminDetailPage.vue"),
    meta: setMeta(true, false, ["CS_ADMIN", "SUPER_ADMIN"]),
  },
  {
    path: "/admin/property-publication-reviews",
    name: "admin-property-publication-reviews",
    component: () =>
      import("../page/admin/PropertyPublicationAdminListPage.vue"),
    meta: setMeta(true, false, ["CS_ADMIN", "SUPER_ADMIN"]),
  },
  {
    path: "/admin/property-publication-reviews/:propertyId",
    name: "admin-property-publication-review-detail",
    component: () =>
      import("../page/admin/PropertyPublicationAdminDetailPage.vue"),
    meta: setMeta(true, false, ["CS_ADMIN", "SUPER_ADMIN"]),
  },
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
    path: "/mypage/reports",
    name: "my-property-reports",
    component: () =>
      import("../page/report/PropertyReportListPage.vue"),
    meta: setMeta(true, false, ["USER", "AGENT"]),
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

// 怨듯넻 而댄룷?뚰듃 ?뺤씤???붾㈃? 媛쒕컻 ?섍꼍?먯꽌留??몄텧?쒕떎.
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

// router ?대룞 ???ㅽ뻾?섎뒗 硫붿꽌??
// to: ?대룞?섎뒗 router, from: 吏湲??덈뒗 router
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  if (!authStore.authInitialized) {
    try {
      await authStore.reissue();
    } catch {
      // ?좏겙 ?щ컻湲??ㅽ뙣: 寃뚯뒪???곹깭濡?吏꾪뻾
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

  // ?섎㉧吏???듦낵
  next();
});

export default router;
