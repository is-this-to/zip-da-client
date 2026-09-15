<script setup>
import { onBeforeUnmount, onMounted, shallowRef, watch } from "vue";

import { loadKakaoMapSdk } from "../../util/kakao/LoadKakaoMapSdk.js";

const props = defineProps({
  latitude: { type: [Number, String], required: true },
  longitude: { type: [Number, String], required: true },
});

const emit = defineEmits(["map-error"]);
const mapContainer = shallowRef(null);

let kakaoApi = null;
let map = null;
let marker = null;
let resizeObserver = null;

const getPosition = () =>
  new kakaoApi.maps.LatLng(
    Number(props.latitude),
    Number(props.longitude),
  );

const updatePosition = () => {
  if (!map || !marker || !kakaoApi) return;
  const position = getPosition();
  marker.setPosition(position);
  map.setCenter(position);
};

onMounted(async () => {
  try {
    kakaoApi = await loadKakaoMapSdk();
    const position = getPosition();
    map = new kakaoApi.maps.Map(mapContainer.value, {
      center: position,
      level: 4,
      draggable: false,
      scrollwheel: false,
    });
    marker = new kakaoApi.maps.Marker({ map, position });

    resizeObserver = new ResizeObserver(() => {
      if (!map) return;
      const center = map.getCenter();
      map.relayout();
      map.setCenter(center);
    });
    resizeObserver.observe(mapContainer.value);
  } catch (error) {
    emit("map-error", error);
  }
});

watch(() => [props.latitude, props.longitude], updatePosition);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  marker?.setMap(null);
  resizeObserver = null;
  marker = null;
  map = null;
  kakaoApi = null;
});
</script>

<template>
  <div
    ref="mapContainer"
    class="property-location-preview-map"
    role="img"
    aria-label="검증된 매물 위치 지도"
  ></div>
</template>

<style scoped>
.property-location-preview-map {
  width: 100%;
  height: 210px;
  overflow: hidden;
  background: var(--zipda-color-disabled);
  border: 1px solid var(--zipda-color-border);
  border-radius: var(--zipda-radius-large);
}
</style>
