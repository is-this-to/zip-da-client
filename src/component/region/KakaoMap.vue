<script setup>
import {
  onBeforeUnmount,
  onMounted,
  shallowRef,
  watch,
} from "vue";

import { loadKakaoMapSdk } from "../../util/kakao/loadKakaoMapSdk.js";

const props = defineProps({
  regionDetail: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits([
  "ready",
  "level-change",
  "map-error",
]);

const mapContainer = shallowRef(null);
const map = shallowRef(null);
const polygons = shallowRef([]);

let kakaoApi = null;

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
const fitToRegion = (detail) =>{
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

    kakaoApi.maps.event.addListener(
      map.value,
      "zoom_changed",
      handleLevelChange,
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

onMounted(initializeMap);

onBeforeUnmount(() => {
  clearPolygons();

  if (map.value && kakaoApi) {
    kakaoApi.maps.event.removeListener(
      map.value,
      "zoom_changed",
      handleLevelChange,
    );
  }
});

defineExpose({
  moveToCurrentLocation,
  fitToRegion
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