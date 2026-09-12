<script setup>
import {
  onBeforeUnmount,
  onMounted,
  shallowRef,
  watch,
} from "vue";

import { loadKakaoMapSdk } from "../../util/kakao/LoadKakaoMapSdk.js";
import { groupNearbyMapItems } from "../../util/kakao/groupNearbyMapItems.js";
import { formatPropertyPrice } from "../../util/property/formatPropertyPrice.js";

const PROPERTY_MARKER_GROUP_DISTANCE_PIXELS = 60;

const props = defineProps({
  regionDetail: {
    type: Object,
    default: null,
  },
  responseType: {
    type: String,
    default: "",
  },
  mapItems: {
    type: Array,
    default: () => [],
  },
  truncated: {
    type: Boolean,
    default: false,
  },
  selectedPropertyId: {
    type: [String, Number],
    default: null,
  },
});

const emit = defineEmits([
  "ready",
  "level-change",
  "bounds-change",
  "map-error",
  "select-region-aggregate",
  "select-property",
]);

const mapContainer = shallowRef(null);
const map = shallowRef(null);
const polygons = shallowRef([]);

let kakaoApi = null;
let markerClusterer = null;
let propertyMarkers = [];
let propertyMarkerListeners = [];
let propertyOverlays = [];
let mapResizeObserver = null;
let mapRelayoutFrame = null;

/**
 * 현재 표시 중인 매물 마커·클러스터·오버레이를 제거한다.
 */
const clearPropertyLayers = () => {
  markerClusterer?.clear();
  markerClusterer = null;

  propertyMarkerListeners.forEach(({ marker, handler }) => {
    kakaoApi?.maps?.event?.removeListener(
      marker,
      "click",
      handler,
    );
  });

  propertyMarkers.forEach((marker) => {
    marker.setMap(null);
  });

  propertyOverlays.forEach((overlay) => {
    overlay.setMap(null);
  });

  propertyMarkers = [];
  propertyMarkerListeners = [];
  propertyOverlays = [];
};

/**
 * 현재 카카오 지도의 bounds와 확대 수준을 반환한다.
 */
const getViewport = () => {
  if (!map.value) {
    return null;
  }

  const bounds = map.value.getBounds();
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();

  return {
    minLat: southWest.getLat(),
    minLng: southWest.getLng(),
    maxLat: northEast.getLat(),
    maxLng: northEast.getLng(),
    zoomLevel: map.value.getLevel(),
  };
};

const emitViewport = () => {
  const viewport = getViewport();

  if (viewport) {
    emit("bounds-change", viewport);
  }
};

/**
 * 반응형 레이아웃 변경 후 카카오 지도가 현재 컨테이너 크기를
 * 다시 계산하도록 한다. relayout 과정에서 기존 중심은 유지한다.
 */
const relayoutMap = () => {
  if (
    !map.value ||
    !mapContainer.value ||
    mapContainer.value.clientWidth === 0 ||
    mapContainer.value.clientHeight === 0
  ) {
    return;
  }

  const center = map.value.getCenter();

  map.value.relayout();
  map.value.setCenter(center);
  emitViewport();
};

const scheduleMapRelayout = () => {
  if (mapRelayoutFrame !== null) {
    cancelAnimationFrame(mapRelayoutFrame);
  }

  mapRelayoutFrame = requestAnimationFrame(() => {
    mapRelayoutFrame = null;
    relayoutMap();
  });
};

const createRegionAggregateOverlay = (item) => {
  const button = document.createElement("button");
  const name = document.createElement("span");
  const count = document.createElement("strong");

  button.type = "button";
  button.className = "zipda-region-aggregate-marker";
  button.setAttribute(
    "aria-label",
    `${item.regionName} 매물 ${item.propertyCount}개`,
  );

  name.textContent = item.regionName;
  count.textContent = `${Number(item.propertyCount).toLocaleString("ko-KR")}개`;
  button.append(name, count);

  button.addEventListener("click", () => {
    emit("select-region-aggregate", item);
  });

  return new kakaoApi.maps.CustomOverlay({
    map: map.value,
    position: new kakaoApi.maps.LatLng(
      item.latitude,
      item.longitude,
    ),
    content: button,
    yAnchor: 0.5,
  });
};

const createPropertyPriceOverlay = (item) => {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "zipda-property-price-marker";
  button.textContent = formatPropertyPrice(item);
  button.setAttribute("aria-label", `${item.title} ${button.textContent}`);

  if (
    String(item.propertyId) === String(props.selectedPropertyId)
  ) {
    button.classList.add("zipda-property-price-marker--selected");
  }

  button.addEventListener("click", () => {
    emit("select-property", item);
  });

  return new kakaoApi.maps.CustomOverlay({
    map: map.value,
    position: new kakaoApi.maps.LatLng(
      item.latitude,
      item.longitude,
    ),
    content: button,
    yAnchor: 1,
  });
};

const createPropertyGroupOverlay = (items) => {
  const button = document.createElement("button");
  const latitude =
    items.reduce((sum, item) => sum + Number(item.latitude), 0) /
    items.length;
  const longitude =
    items.reduce((sum, item) => sum + Number(item.longitude), 0) /
    items.length;
  const position = new kakaoApi.maps.LatLng(latitude, longitude);
  const includesSelectedProperty = items.some(
    (item) =>
      String(item.propertyId) === String(props.selectedPropertyId),
  );

  button.type = "button";
  button.className = "zipda-property-group-marker";
  button.textContent = `매물 ${items.length.toLocaleString("ko-KR")}개`;
  button.setAttribute(
    "aria-label",
    `가까운 매물 ${items.length.toLocaleString("ko-KR")}개, 지도를 확대합니다.`,
  );

  if (includesSelectedProperty) {
    button.classList.add("zipda-property-group-marker--selected");
  }

  button.addEventListener("click", () => {
    const currentLevel = map.value.getLevel();

    if (currentLevel > 1) {
      map.value.setLevel(currentLevel - 1, {
        anchor: position,
      });
      return;
    }

    map.value.panTo(position);
  });

  return new kakaoApi.maps.CustomOverlay({
    map: map.value,
    position,
    content: button,
    yAnchor: 1,
  });
};

const renderRegionAggregates = () => {
  propertyOverlays = props.mapItems.map(createRegionAggregateOverlay);
};

const renderPropertyPoints = () => {
  if (!kakaoApi.maps.MarkerClusterer) {
    emit(
      "map-error",
      new Error("카카오 지도 클러스터 라이브러리를 불러오지 못했습니다."),
    );
    return;
  }

  markerClusterer = new kakaoApi.maps.MarkerClusterer({
    map: map.value,
    averageCenter: true,
    minLevel: 5,
    gridSize: 60,
    disableClickZoom: false,
  });

  propertyMarkers = props.mapItems.map((item) => {
    const marker = new kakaoApi.maps.Marker({
      position: new kakaoApi.maps.LatLng(
        item.latitude,
        item.longitude,
      ),
      title: item.title,
    });

    const handleMarkerClick = () => {
      emit("select-property", item);
    };

    kakaoApi.maps.event.addListener(
      marker,
      "click",
      handleMarkerClick,
    );

    propertyMarkerListeners.push({
      marker,
      handler: handleMarkerClick,
    });

    return marker;
  });

  markerClusterer.addMarkers(propertyMarkers);
};

const renderPropertyMarkers = () => {
  const projection = map.value.getProjection();
  const positionedItems = props.mapItems.map((item) => {
    const point = projection.containerPointFromCoords(
      new kakaoApi.maps.LatLng(item.latitude, item.longitude),
    );

    return {
      item,
      x: point.x,
      y: point.y,
    };
  });
  const groupedItems = groupNearbyMapItems(
    positionedItems,
    PROPERTY_MARKER_GROUP_DISTANCE_PIXELS,
  );

  propertyOverlays = groupedItems.map((items) =>
    items.length === 1
      ? createPropertyPriceOverlay(items[0])
      : createPropertyGroupOverlay(items),
  );
};

const renderPropertyLayers = () => {
  clearPropertyLayers();

  if (
    !map.value ||
    props.truncated ||
    props.mapItems.length === 0
  ) {
    return;
  }

  switch (props.responseType) {
    case "REGION_AGGREGATE":
      renderRegionAggregates();
      break;
    case "PROPERTY_POINTS":
      renderPropertyPoints();
      break;
    case "PROPERTY_MARKER":
      renderPropertyMarkers();
      break;
  }
};

/**
 * 표시 중인 경계 제거
 */
const clearPolygons = () => {
  polygons.value.forEach((polygon) => {
    polygon.setMap(null);
  });

  polygons.value = [];
};

/**
 * [경도, 위도]를 Kakao LatLng로 변환
 */
const toLatLng = ([longitude, latitude]) => {
  return new kakaoApi.maps.LatLng(
    latitude,
    longitude,
  );
};

/**
 * Polygon 또는 MultiPolygon 표시
 */
const drawGeometry = (geometry) => {
  clearPolygons();

  if (
    !geometry?.type ||
    !geometry?.coordinates
  ) {
    return;
  }

  const polygonGroups =
    geometry.type === "Polygon"
      ? [geometry.coordinates]
      : geometry.coordinates;

  polygons.value = polygonGroups.map(
    (polygonCoordinates) => {
      /*
       * polygonCoordinates
       * → Ring 목록
       *
       * 첫 번째 Ring: 외곽선
       * 나머지 Ring: 내부 구멍
       */
      const paths = polygonCoordinates.map(
        (ring) => ring.map(toLatLng),
      );

      const polygon =
        new kakaoApi.maps.Polygon({
          map: map.value,
          path: paths,
          strokeWeight: 2,
          strokeColor: "#516237",
          strokeOpacity: 0.9,
          fillColor: "#cfe1b9",
          fillOpacity: 0.25,
        });

      return polygon;
    },
  );
};

/**
 * 지역 전체가 보이도록 지도 범위 조정
 */
const fitRegionBounds = (boundsData) => {
  if (
    !boundsData?.southWest ||
    !boundsData?.northEast
  ) {
    return false;
  }

  const bounds =
    new kakaoApi.maps.LatLngBounds();

  bounds.extend(
    new kakaoApi.maps.LatLng(
      boundsData.southWest.latitude,
      boundsData.southWest.longitude,
    ),
  );

  bounds.extend(
    new kakaoApi.maps.LatLng(
      boundsData.northEast.latitude,
      boundsData.northEast.longitude,
    ),
  );

  map.value.setBounds(bounds);

  return true;
};

/**
 * 경계만 다시 그린다.
 * 
 * 확대 단계 변경으로 새 경계 데이터를 받아도
 * 지도 중심과 확대 단계는 변경하지 않는다.
 */
const renderRegionDetail = (detail) => {
  if (!map.value || !detail) {
    return;
  }

  drawGeometry(detail.geometry);
};

/**
 * 새로운 지역을 지도에 처음 적용할 때만 호출한다.
 */
const fitToRegion = (detail, { maximumLevel = null } = {}) =>{
  if(!map.value || !detail){
    return;
  }

  const boundsApplied = fitRegionBounds(detail.bounds);

  if(!boundsApplied && detail.center){
    const center = new kakaoApi.maps.LatLng(
      detail.center.latitude,
      detail.center.longitude
    );

    map.value.setCenter(center);
  }

  /**
   * 읍·면·동을 선택했을 때는 개별 공개 좌표를 조회할 수 있는
   * 확대 단계까지 진입한다. 이미 더 가까이 확대된 경우에는
   * 사용자의 현재 확대 수준을 유지한다.
   */
  if (
    Number.isFinite(maximumLevel) &&
    map.value.getLevel() > maximumLevel
  ) {
    map.value.setLevel(maximumLevel, {
      anchor: map.value.getCenter(),
    });
  }
};


/**
 * 현재 위치로 이동
 */
const moveToCurrentLocation = () => {
  if (!navigator.geolocation || !map.value) {
    return;
  }

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const position =
        new kakaoApi.maps.LatLng(
          coords.latitude,
          coords.longitude,
        );

      map.value.setCenter(position);
    },
    (error) => {
      emit("map-error", error);
    },
  );
};

/**
 * 목록에서 선택한 매물의 공개 좌표로 지도를 이동한다.
 */
const focusProperty = (item) => {
  if (!map.value || !item) {
    return;
  }

  map.value.panTo(
    new kakaoApi.maps.LatLng(
      item.latitude,
      item.longitude,
    ),
  );
};

/**
 * 지도 초기화
 */
const initializeMap = async () => {
  try {
    kakaoApi =
      await loadKakaoMapSdk();

    const defaultCenter =
      new kakaoApi.maps.LatLng(
        37.5665,
        126.978,
      );

    map.value =
      new kakaoApi.maps.Map(
        mapContainer.value,
        {
          center: defaultCenter,
          level: 8,
        },
      );

    /**
     * 모바일·데스크톱 미디어쿼리 전환뿐 아니라 최초 렌더링에서
     * 확정되는 컨테이너 크기도 감지하여 지도 크기를 동기화한다.
     */
    if (typeof ResizeObserver !== "undefined") {
      mapResizeObserver = new ResizeObserver(scheduleMapRelayout);
      mapResizeObserver.observe(mapContainer.value);
    }

    scheduleMapRelayout();

    kakaoApi.maps.event.addListener(
      map.value,
      "zoom_changed",
      handleLevelChange,
    );

    kakaoApi.maps.event.addListener(
      map.value,
      "idle",
      emitViewport,
    );

    emit(
      "ready",
      map.value.getLevel(),
    );

    if (props.regionDetail) {
      renderRegionDetail(
        props.regionDetail,
      );
    }

    renderPropertyLayers();
    emitViewport();
  } catch (error) {
    emit("map-error", error);
  }
};

const handleLevelChange = () => {
  if (!map.value) {
    return;
  }

  emit(
    "level-change",
    map.value.getLevel(),
  );
};

watch(
  () => props.regionDetail,
  (detail) => {
    renderRegionDetail(detail);
  },
);

watch(
  () => [
    props.responseType,
    props.mapItems,
    props.truncated,
    props.selectedPropertyId,
  ],
  renderPropertyLayers,
  { deep: true },
);

onMounted(initializeMap);

onBeforeUnmount(() => {
  mapResizeObserver?.disconnect();
  mapResizeObserver = null;

  if (mapRelayoutFrame !== null) {
    cancelAnimationFrame(mapRelayoutFrame);
    mapRelayoutFrame = null;
  }

  clearPolygons();
  clearPropertyLayers();

  if (map.value && kakaoApi) {
    kakaoApi.maps.event.removeListener(
      map.value,
      "zoom_changed",
      handleLevelChange,
    );

    kakaoApi.maps.event.removeListener(
      map.value,
      "idle",
      emitViewport,
    );
  }
});

defineExpose({
  moveToCurrentLocation,
  fitToRegion,
  focusProperty,
  getViewport,
  relayoutMap,
});


</script>

<template>
  <div
    ref="mapContainer"
    class="kakao-map"
    aria-label="선택 지역 지도"
  ></div>
</template>

<style scoped>
.kakao-map{
  width: 100%;
  height: 100%;
  background: var(--zipda-color-disabled);
}
</style>

<!--
  Kakao CustomOverlay의 DOM은 Vue의 scoped 속성을 받지 않으므로
  충돌 가능성이 낮은 zipda 접두사 전역 클래스를 사용한다.
-->
<style>
.zipda-region-aggregate-marker,
.zipda-property-price-marker,
.zipda-property-group-marker {
  appearance: none;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 3px 10px rgb(32 33 31 / 18%);
}

.zipda-region-aggregate-marker {
  display: grid;
  gap: 2px;
  min-width: 82px;
  padding: 9px 13px;
  color: #ffffff;
  background: #516237;
  border: 2px solid #ffffff;
  border-radius: 9999px;
  text-align: center;
}

.zipda-region-aggregate-marker span {
  font-size: 11px;
}

.zipda-region-aggregate-marker strong {
  font-size: 14px;
}

.zipda-property-price-marker {
  padding: 8px 11px;
  color: #20211f;
  background: #ffffff;
  border: 2px solid #718355;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.zipda-property-price-marker--selected {
  color: #ffffff;
  background: #516237;
  border-color: #ffffff;
  transform: scale(1.08);
}

.zipda-property-group-marker {
  padding: 8px 12px;
  color: #ffffff;
  background: #d7a52b;
  border: 2px solid #ffffff;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.zipda-property-group-marker--selected {
  background: #516237;
  transform: scale(1.08);
}
</style>
