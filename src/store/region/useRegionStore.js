import { computed, ref } from "vue"
import { defineStore } from "pinia";
import myAxios from "../../api/myAxios";

export const useRegionStore = defineStore("regionStore", ()=>{
  // 지역 목록
  const sidoRegions = ref([]);
  const sigunguRegions = ref([]);
  const emdRegions = ref([]);

  // 선택된 지역
  const selectedSido = ref(null);
  const selectedSigungu = ref(null);
  const selectedEmd = ref(null);

  // 지도 상세 응답
  const regionDetail = ref(null);

  // 로딩 상태
  const isListLoading = ref(false);
  const isDetailLoading = ref(false);

  // 가장 최근 상세 요청 번호(Race Condition(경쟁상태)방지)
  let detailRequestSequence = 0;

  const selectedRegion = computed(() =>{
    return (
      selectedEmd.value ??
      selectedSigungu.value ??
      selectedSido.value
    );
  });

  /*
   * 최상위 시·도 조회
   */
  const getRootRegions = async () => {
    try{
      isListLoading.value = true;

      const response = await myAxios.get(
        "/api/property/regions/root",
      )

      sidoRegions.value = response.data.data;
    }catch(error){
      throw error;
    }finally{
      isListLoading.value = false;
    }
  }
  
  /**
   * 하위 지역 API 호출
   * Store 내부에서만 사용하는 공통 함수
   */
  const requestChildRegions = async (parentRegionId)=>{
    const response = await myAxios.get(
      `/api/property/regions/${parentRegionId}/children`,
    );

    return response.data.data;
  };

  /**
   * 시·도 선택
   */
  const selectSido = async (region) =>{
    selectedSido.value = region;

    // 기존 하위 선택 초기화
    selectedSigungu.value = null;
    selectedEmd.value = null;

    sigunguRegions.value = [];
    emdRegions.value = [];

    if(!region.hasChildren){
      return;
    }

    const selectedRegionId = region.regionId;
    const children = await requestChildRegions(selectedRegionId);

    // 사용자가 다른 시·도를 먼저 선택했다면
    // 이전 응답을 Store에 반영하지 않는다.
    if(selectedSido.value?.regionId !== selectedRegionId){
      return;
    }

    sigunguRegions.value = children;
  };

  /**
   * 시·군·구 선택
   */
  const selectSigungu = async (region)=>{
    selectedSigungu.value = region;

    selectedEmd.value = null;
    emdRegions.value = [];

    if(!region.hasChildren){
      return;
    }

    const selectedRegionId = region.regionId;
    const children = await requestChildRegions(selectedRegionId);

    if(selectedSigungu.value?.regionId !== selectedRegionId){
      return;
    }

    emdRegions.value = children;
  };

  /**
   * 읍·면·동 선택
   * 
   * 읍·면·동은 공개 선택의 마지막 단계이므로
   * children API를 호출하지 않는다.
   */
  const selectEmd = (region) =>{
    selectedEmd.value = region;
  };

  /**
   * 지역 중심점·경계 조회
   */
  const getRegionDetail = async ( regionId, zoomLevel) => {
    const currentSequence = ++detailRequestSequence;

    try{
      isDetailLoading.value = true;

      const response = await myAxios.get(
        `/api/property/regions/${regionId}`, {params: {zoomLevel}}
      );

      // 늦게 도착한 이전 요청은 무시
      if(currentSequence !== detailRequestSequence){
        return null;
      }

      const detail = response.data.data;

      regionDetail.value = detail;

      return detail;
    }catch(error){
      // 이미 더 새로운 요청이 실행됐다면
      // 이전 요청의 오류도 화면에 반영하지 않는다.
      if(currentSequence !== detailRequestSequence){
        return null;
      }

      regionDetail.value = null;

      throw error;
    }finally{
      if(currentSequence === detailRequestSequence){
        isDetailLoading.value = false;
      }
    }
  };

  /**
   * 지도 페이지에서 나갈 때 초기화
   */
  const clearRegionState = () =>{
    sidoRegions.value = [];
    sigunguRegions.value = [];
    emdRegions.value = [];

    selectedSido.value = null;
    selectedSigungu.value = null;
    selectedEmd.value = null;

    regionDetail.value = null;

    detailRequestSequence++;
  };

  return{
    sidoRegions,
    sigunguRegions,
    emdRegions,

    selectedSido,
    selectedSigungu,
    selectedEmd,
    selectedRegion,

    regionDetail,

    isListLoading,
    isDetailLoading,

    getRootRegions,
    selectSido,
    selectSigungu,
    selectEmd,
    getRegionDetail,
    clearRegionState
  };

});