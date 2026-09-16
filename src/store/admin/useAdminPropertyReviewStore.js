import { computed, ref } from "vue";
import { defineStore } from "pinia";

import myAxios from "../../api/myAxios.js";
import { normalizePropertyError } from "../../constant/property/propertyMessage.js";
import { normalizePropertyId } from "../property/propertyRequestPolicy.js";

import {
  ADMIN_PROPERTY_REVIEW_API_PATHS,
  createAdminPublicationListParams,
  createAdminVerificationListParams,
  createAuditReasonHeaders,
  createPublicationReviewMutation,
  createVerificationReviewMutation,
} from "./adminPropertyReviewRequestPolicy.js";

const normalizeNullableId = (value) =>
  value == null ? null : normalizePropertyId(value);

const normalizeVerification = (item = {}) => ({
  ...item,
  propertyId: normalizeNullableId(item.propertyId),
  verificationId: normalizeNullableId(item.verificationId),
});

const normalizePublication = (item = {}) => ({
  ...item,
  propertyId: normalizeNullableId(item.propertyId),
});

export const useAdminPropertyReviewStore = defineStore(
  "adminPropertyReviewStore",
  () => {
    const verificationItems = ref([]);
    const verificationNextCursor = ref(null);
    const verificationHasNext = ref(false);

    const publicationItems = ref([]);
    const publicationNextCursor = ref(null);
    const publicationHasNext = ref(false);

    const verificationDetail = ref(null);
    const publicationDetail = ref(null);

    const isVerificationListLoading = ref(false);
    const isPublicationListLoading = ref(false);
    const isDetailLoading = ref(false);

    const pendingAction = ref("");
    const error = ref(null);
    const conflict = ref(null);

    const isActionLoading = computed(() =>
      Boolean(pendingAction.value),
    );

    const clearFeedback = () => {
      error.value = null;
      conflict.value = null;
    };

    const runAction = async (action, callback) => {
      clearFeedback();
      pendingAction.value = action;

      try {
        return await callback();
      } catch (caught) {
        const normalized = normalizePropertyError(caught);

        error.value = normalized;

        if (normalized.isConflict) {
          conflict.value = normalized;
        }

        throw caught;
      } finally {
        pendingAction.value = "";
      }
    };

    const fetchVerificationList = async ({
                                           status = "IN_REVIEW",
                                           verificationType = null,
                                           cursor = null,
                                           size = 20,
                                           append = false,
                                         } = {}) => {
      if (isVerificationListLoading.value) {
        return null;
      }

      isVerificationListLoading.value = true;
      error.value = null;

      try {
        const response = await myAxios.get(
          ADMIN_PROPERTY_REVIEW_API_PATHS.verificationList,
          {
            params: createAdminVerificationListParams({
              status,
              verificationType,
              cursor,
              size,
            }),
          },
        );

        const data = response.data?.data ?? {};

        const received = Array.isArray(data.items)
          ? data.items.map(normalizeVerification)
          : [];

        verificationItems.value = append
          ? [...verificationItems.value, ...received]
          : received;

        verificationNextCursor.value =
          data.nextCursor ?? null;

        verificationHasNext.value =
          data.hasNext === true;

        return data;
      } catch (caught) {
        error.value = normalizePropertyError(caught);

        if (!append) {
          verificationItems.value = [];
          verificationNextCursor.value = null;
          verificationHasNext.value = false;
        }

        throw caught;
      } finally {
        isVerificationListLoading.value = false;
      }
    };

    const fetchNextVerificationPage = async ({
                                               status = "IN_REVIEW",
                                               verificationType = null,
                                               size = 20,
                                             } = {}) => {
      if (
        !verificationHasNext.value ||
        !verificationNextCursor.value
      ) {
        return null;
      }

      return fetchVerificationList({
        status,
        verificationType,
        cursor: verificationNextCursor.value,
        size,
        append: true,
      });
    };

    const fetchVerificationDetail = async (
      verificationId,
      auditReason,
    ) => {
      isDetailLoading.value = true;
      error.value = null;
      conflict.value = null;

      try {
        const response = await myAxios.get(
          ADMIN_PROPERTY_REVIEW_API_PATHS.verificationDetail(
            verificationId,
          ),
          {
            headers: createAuditReasonHeaders(auditReason),
          },
        );

        verificationDetail.value =
          normalizeVerification(
            response.data?.data ?? {},
          );

        return verificationDetail.value;
      } catch (caught) {
        error.value = normalizePropertyError(caught);
        verificationDetail.value = null;

        throw caught;
      } finally {
        isDetailLoading.value = false;
      }
    };

    const reviewVerification = ({
                                  propertyId,
                                  verificationId,
                                  propertyVersion,
                                  decision,
                                  reason = "",
                                }) =>
      runAction("verification-review", async () => {
        const mutation =
          createVerificationReviewMutation({
            propertyVersion,
            decision,
            reason,
          });

        const response = await myAxios.patch(
          ADMIN_PROPERTY_REVIEW_API_PATHS.verificationReview(
            propertyId,
            verificationId,
          ),
          mutation.body,
          {
            headers: mutation.headers,
          },
        );

        verificationItems.value =
          verificationItems.value.filter(
            (item) =>
              item.verificationId !==
              normalizePropertyId(verificationId),
          );

        verificationDetail.value = null;

        return response.data?.data ?? {};
      });

    const fetchPublicationList = async ({
                                          status = "IN_REVIEW",
                                          verificationStatus = null,
                                          publisherType = null,
                                          propertyType = null,
                                          cursor = null,
                                          size = 20,
                                          append = false,
                                        } = {}) => {
      if (isPublicationListLoading.value) {
        return null;
      }

      isPublicationListLoading.value = true;
      error.value = null;

      try {
        const response = await myAxios.get(
          ADMIN_PROPERTY_REVIEW_API_PATHS.publicationList,
          {
            params: createAdminPublicationListParams({
              status,
              verificationStatus,
              publisherType,
              propertyType,
              cursor,
              size,
            }),
          },
        );

        const data = response.data?.data ?? {};

        const received = Array.isArray(data.items)
          ? data.items.map(normalizePublication)
          : [];

        publicationItems.value = append
          ? [...publicationItems.value, ...received]
          : received;

        publicationNextCursor.value =
          data.nextCursor ?? null;

        publicationHasNext.value =
          data.hasNext === true;

        return data;
      } catch (caught) {
        error.value = normalizePropertyError(caught);

        if (!append) {
          publicationItems.value = [];
          publicationNextCursor.value = null;
          publicationHasNext.value = false;
        }

        throw caught;
      } finally {
        isPublicationListLoading.value = false;
      }
    };

    const fetchNextPublicationPage = async ({
                                              status = "IN_REVIEW",
                                              verificationStatus = null,
                                              publisherType = null,
                                              propertyType = null,
                                              size = 20,
                                            } = {}) => {
      if (
        !publicationHasNext.value ||
        !publicationNextCursor.value
      ) {
        return null;
      }

      return fetchPublicationList({
        status,
        verificationStatus,
        publisherType,
        propertyType,
        cursor: publicationNextCursor.value,
        size,
        append: true,
      });
    };

    const fetchPublicationDetail = async (
      propertyId,
      auditReason,
    ) => {
      isDetailLoading.value = true;
      error.value = null;
      conflict.value = null;

      try {
        const response = await myAxios.get(
          ADMIN_PROPERTY_REVIEW_API_PATHS.publicationDetail(
            propertyId,
          ),
          {
            headers: createAuditReasonHeaders(auditReason),
          },
        );

        publicationDetail.value =
          normalizePublication(
            response.data?.data ?? {},
          );

        return publicationDetail.value;
      } catch (caught) {
        error.value = normalizePropertyError(caught);
        publicationDetail.value = null;

        throw caught;
      } finally {
        isDetailLoading.value = false;
      }
    };

    const reviewPublication = ({
                                 propertyId,
                                 propertyVersion,
                                 targetStatus,
                                 reason,
                               }) =>
      runAction("publication-review", async () => {
        const mutation =
          createPublicationReviewMutation({
            propertyVersion,
            targetStatus,
            reason,
          });

        const response = await myAxios.patch(
          ADMIN_PROPERTY_REVIEW_API_PATHS.publicationStatus(
            propertyId,
          ),
          mutation.body,
          {
            headers: mutation.headers,
          },
        );

        publicationItems.value =
          publicationItems.value.filter(
            (item) =>
              item.propertyId !==
              normalizePropertyId(propertyId),
          );

        publicationDetail.value = null;

        return response.data?.data ?? {};
      });

    const resetVerification = () => {
      verificationItems.value = [];
      verificationNextCursor.value = null;
      verificationHasNext.value = false;
      verificationDetail.value = null;
    };

    const resetPublication = () => {
      publicationItems.value = [];
      publicationNextCursor.value = null;
      publicationHasNext.value = false;
      publicationDetail.value = null;
    };

    return {
      verificationItems,
      verificationNextCursor,
      verificationHasNext,

      publicationItems,
      publicationNextCursor,
      publicationHasNext,

      verificationDetail,
      publicationDetail,

      isVerificationListLoading,
      isPublicationListLoading,
      isDetailLoading,

      pendingAction,
      isActionLoading,
      error,
      conflict,

      fetchVerificationList,
      fetchNextVerificationPage,
      fetchVerificationDetail,
      reviewVerification,

      fetchPublicationList,
      fetchNextPublicationPage,
      fetchPublicationDetail,
      reviewPublication,

      clearFeedback,
      resetVerification,
      resetPublication,
    };
  },
);
