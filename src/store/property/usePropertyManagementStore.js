// 임호탁 파트 (매물 등록·조회·수정·상태·삭제·검증 API 및 화면 상태 관리)
import { computed, ref } from "vue";
import { defineStore } from "pinia";
import myAxios from "../../api/myAxios.js";
import { useAuthStore } from "../auth/useAuthStore.js";
import { normalizePropertyError } from "../../constant/property/propertyMessage.js";
import {
  createMyPropertyListParams,
  createVersionedMutation,
  normalizePropertyId,
  PROPERTY_API_PATHS,
  resolveIdempotencyKey,
} from "./propertyRequestPolicy.js";

const CREATE_REQUEST_KEY = "zipda.property.create.request";

const normalizeProperty = (property) => ({
  ...property,
  propertyId: normalizePropertyId(property?.propertyId),
  propertyVerificationId: normalizePropertyId(property?.propertyVerificationId),
  regionId: normalizePropertyId(property?.regionId),
  apartmentComplexId: normalizePropertyId(property?.apartmentComplexId),
  images: Array.isArray(property?.images)
    ? property.images.map((image) => ({ ...image, fileId: normalizePropertyId(image.fileId) }))
    : property?.images,
});

const normalizeResponse = (response) => normalizeProperty(response?.data?.data ?? {});

const readPendingCreate = () => {
  try {
    return JSON.parse(sessionStorage.getItem(CREATE_REQUEST_KEY) || "null");
  } catch {
    return null;
  }
};

const getIdempotencyKey = async (request) => {
  const pending = readPendingCreate();
  const resolved = await resolveIdempotencyKey({
    request,
    pending,
    createKey: () => crypto.randomUUID(),
  });
  sessionStorage.setItem(CREATE_REQUEST_KEY, JSON.stringify({
    fingerprint: resolved.fingerprint,
    key: resolved.key,
  }));
  return resolved.key;
};

export const usePropertyManagementStore = defineStore("propertyManagementStore", () => {
  const authStore = useAuthStore();
  const items = ref([]);
  const nextCursor = ref(null);
  const hasNext = ref(false);
  const editDetail = ref(null);
  const registrationIntegration = ref(null);
  const verificationEvidence = ref([]);
  const isListLoading = ref(false);
  const isMoreLoading = ref(false);
  const isDetailLoading = ref(false);
  const isAccessLoading = ref(false);
  const pendingAction = ref("");
  const error = ref(null);
  const conflict = ref(null);

  const isActionLoading = computed(() => Boolean(pendingAction.value));

  const ensureAccess = async (allowedRoles) => {
    isAccessLoading.value = true;
    error.value = null;
    try {
      if (!authStore.authInitialized) await authStore.reissue();
      if (!authStore.isLoggedIn) return "login";
      const role = String(authStore.role ?? "").replace(/^ROLE_/, "");
      if (!allowedRoles.includes(role)) {
        error.value = normalizePropertyError({
          response: { status: 403, data: { code: "E04", message: "FORBIDDEN" } },
        });
        return "forbidden";
      }
      return "allowed";
    } finally {
      isAccessLoading.value = false;
    }
  };

  const run = async (action, callback) => {
    error.value = null;
    conflict.value = null;
    pendingAction.value = action;
    try {
      return await callback();
    } catch (caught) {
      const normalized = normalizePropertyError(caught);
      error.value = normalized;
      if (normalized.isConflict) conflict.value = normalized;
      throw caught;
    } finally {
      pendingAction.value = "";
    }
  };

  const fetchMyProperties = async ({ append = false } = {}) => {
    if (append && (!hasNext.value || isMoreLoading.value)) return null;
    const cursor = append ? nextCursor.value : null;
    append ? (isMoreLoading.value = true) : (isListLoading.value = true);
    error.value = null;

    try {
      const response = await myAxios.get(PROPERTY_API_PATHS.myList, {
        params: createMyPropertyListParams({ cursor }),
      });
      const data = response.data?.data ?? {};
      const received = Array.isArray(data.items) ? data.items.map(normalizeProperty) : [];
      items.value = append ? [...items.value, ...received] : received;
      nextCursor.value = data.nextCursor ?? null;
      hasNext.value = data.hasNext === true;
      return data;
    } catch (caught) {
      error.value = normalizePropertyError(caught);
      if (!append) {
        items.value = [];
        nextCursor.value = null;
        hasNext.value = false;
      }
      throw caught;
    } finally {
      append ? (isMoreLoading.value = false) : (isListLoading.value = false);
    }
  };

  const fetchEditDetail = async (propertyId) => {
    isDetailLoading.value = true;
    error.value = null;
    conflict.value = null;
    try {
      const response = await myAxios.get(
        PROPERTY_API_PATHS.editDetail(propertyId),
      );
      editDetail.value = normalizeResponse(response);
      return editDetail.value;
    } catch (caught) {
      error.value = normalizePropertyError(caught);
      editDetail.value = null;
      throw caught;
    } finally {
      isDetailLoading.value = false;
    }
  };

  const createProperty = (request) => run("create", async () => {
    const idempotencyKey = await getIdempotencyKey(request);
    const response = await myAxios.post(PROPERTY_API_PATHS.create, request, {
      headers: { "Idempotency-Key": idempotencyKey },
    });
    sessionStorage.removeItem(CREATE_REQUEST_KEY);
    return normalizeResponse(response);
  });

  const updateProperty = (propertyId, version, request) => run("update", async () => {
    const mutation = createVersionedMutation(version, request);
    const response = await myAxios.patch(
      PROPERTY_API_PATHS.update(propertyId),
      mutation.body,
      { headers: mutation.headers },
    );
    const updated = normalizeResponse(response);
    editDetail.value = editDetail.value ? { ...editDetail.value, ...updated } : updated;
    return updated;
  });

  const changeTransactionStatus = (property, targetStatus, reason) => run("status", async () => {
    const mutation = createVersionedMutation(property.version, {
      targetStatus,
      reason: reason.trim(),
    });
    const response = await myAxios.patch(
      PROPERTY_API_PATHS.transactionStatus(property.propertyId),
      mutation.body,
      { headers: mutation.headers },
    );
    const updated = normalizeResponse(response);
    items.value = items.value.map((item) => item.propertyId === updated.propertyId
      ? { ...item, ...updated }
      : item);
    return updated;
  });

  const deleteProperty = (property, deleteReason) => run("delete", async () => {
    const mutation = createVersionedMutation(property.version, {
      deleteReason: deleteReason.trim(),
    });
    await myAxios.delete(
      PROPERTY_API_PATHS.update(property.propertyId),
      {
        headers: mutation.headers,
        data: mutation.body,
      },
    );
    items.value = items.value.filter((item) => item.propertyId !== property.propertyId);
  });

  const submitVerification = (property, mode, evidence) => run("verification", async () => {
    const mutation = createVersionedMutation(property.version, { evidence });
    const response = await myAxios.post(
      PROPERTY_API_PATHS.verification(property.propertyId, mode),
      mutation.body,
      { headers: mutation.headers },
    );
    const updated = normalizeResponse(response);
    items.value = items.value.map((item) => item.propertyId === updated.propertyId
      ? { ...item, version: updated.version, verificationStatus: updated.verificationStatus }
      : item);
    return updated;
  });

  const clearFeedback = () => {
    error.value = null;
    conflict.value = null;
  };

  const setRegistrationIntegration = (integration) => {
    registrationIntegration.value = integration
      ? {
          ...integration,
          regionId: normalizePropertyId(integration.regionId),
          apartmentComplexId: normalizePropertyId(integration.apartmentComplexId),
          fileIds: Array.isArray(integration.fileIds)
            ? integration.fileIds.map(normalizePropertyId)
            : [],
        }
      : null;
  };

  const setVerificationEvidence = (evidence) => {
    verificationEvidence.value = Array.isArray(evidence)
      ? evidence.map((item, index) => ({
          propertyFileId: normalizePropertyId(item.propertyFileId),
          evidenceType: item.evidenceType,
          sortOrder: item.sortOrder ?? index,
        }))
      : [];
  };

  return {
    items,
    nextCursor,
    hasNext,
    editDetail,
    registrationIntegration,
    verificationEvidence,
    isListLoading,
    isMoreLoading,
    isDetailLoading,
    isAccessLoading,
    pendingAction,
    isActionLoading,
    error,
    conflict,
    ensureAccess,
    fetchMyProperties,
    fetchEditDetail,
    createProperty,
    updateProperty,
    changeTransactionStatus,
    deleteProperty,
    submitVerification,
    setRegistrationIntegration,
    setVerificationEvidence,
    clearFeedback,
  };
});
