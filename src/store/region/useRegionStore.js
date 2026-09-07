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
  
  /**
   * 지역명 검색 상태
   */
  const searchResults = ref([]);
  const selectedSearchRegion = ref(null);

  // 지도 상세·경계 응답
  const regionDetail = ref(null);

  // 로딩 상태
  const isListLoading = ref(false);
  const isDetailLoading = ref(false);
  const isSearchLoading = ref(false);

  /**
   * 상세 API 요청 순서
   * 
   * 여러 요청이 동시에 실행됐을 때
   * 늦게 도착한 이전 응답을 무시한다.
   * 가장 최근 상세 요청 번호(Race Condition(경쟁상태)방지)
   */
  let detailRequestSequence = 0;

  /**
   * 검색 API 요청 순서
   * 
   * 사용자가 검색어를 빠르게 변경했을 때
   * 오래된 검색 결과가 최신 결과를 덮지 않게 한다.
   */
  let searchRequestSequence = 0;

  /**
   * 최종 선택 Region
   * 
   * 검색 결과로 선택한 Region을 우선하고,
   * 검색 선택이 없으면 기존 계층 선택을 사용한다.
   */
  const selectedRegion = computed(() =>{
    return (
      selectedSearchRegion.value ??
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
    }finally{
      isListLoading.value = false;
    }
  };
  
  /**
   * 하위 지역 API 호출
   * 
   * Store 내부에서만 사용하는 사용하는 함수다.
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

    /**
     * 계층 선택을 시작했으므로
     * 검색으로 선택한 Region은 초기화한다.
     */
    selectedSearchRegion.value = null;

    selectedSido.value = region;

    /**
     * 새로운 시·도를 선택했으므로
     * 기존 하위 선택과 목록을 초기화한다.
     */
    selectedSigungu.value = null;
    selectedEmd.value = null;

    sigunguRegions.value = [];
    emdRegions.value = [];

    if(!region.hasChildren){
      return;
    }

    const selectedRegionId = region.regionId;
    const children = await requestChildRegions(selectedRegionId);

    /**
     * API 응답이 도착하기 전에 사용자가
     * 다른 시·도를 선택했다면 이전 응답은 무시한다.
     */
    if(selectedSido.value?.regionId !== selectedRegionId){
      return;
    }

    sigunguRegions.value = children;
  };

  /**
   * 시·군·구 선택
   */
  const selectSigungu = async (region)=>{
    selectedSearchRegion.value = null;

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
    selectedSearchRegion.value = null;
    selectedEmd.value = region;
  };

  /**
   * 지역명 검색
   * 
   * API:
   * GET /api/property/regions/search
   * 
   * Query Parameter:
   * keyword
   */
  const searchRegions = async(keyword)=>{
    const normalizedKeyword = (keyword ?? "").trim();

    /**
     * 이번 요청의 순번을 발급한다.
     */
    const currentSequence = ++searchRequestSequence;

    /**
     * 새로운 검색을 시작하므로
     * 기존 결과와 검색 선택을 초기화한다.
     */
    searchResults.value = [];
    selectedSearchRegion.value = null;

    /**
     * 공백 제거 후 빈 문자열이라면
     * API를 호출하지 않는다.
     */
    if(!normalizedKeyword){
      isSearchLoading.value = false;
      return [];
    }
    
    try{
      isSearchLoading.value = true;

      const response = await myAxios.get("/api/property/regions/search",{
          params: {
            keyword:
            normalizedKeyword,
          },
        },
      );
      
      /**
       * 현재 요청보다 더 새로운 검색 요청이
       * 이미 시작됐다면 이전 응답을 무시한다.
       */
      if(currentSequence !== searchRequestSequence){
        return [];
      }

      /**
       * 백엔드는 결과가 없으면
       * data에 빈 배열을 반환한다.
       */
      const regions = response.data.data ?? [];

      searchResults.value = regions;

      return regions;
    }catch(error){
      /**
       * 이미 새로운 요청이 실행됐다면
       * 이전 요청의 오류도 화면에 반영하지 않는다.
       */
      if(currentSequence !== searchRequestSequence){
        return [];
      }

      searchResults.value = [];
      
      throw error;
    }finally{
      /**
       * 가장 최근 요청만 로딩 상태를 종료한다.
       */
      if(currentSequence === searchRequestSequence){
        isSearchLoading.value = false;
      }
    }
  };

  /**
   * 지역명 검색 결과 선택
   */
  const selectSearchRegion = (region)=>{
    selectedSearchRegion.value = region;

    /**
     * 검색 결과와 기존 계층 선택이
     * 서로 다른 지역을 가리키지 않도록 초기화한다.
     */
    selectedSido.value = null;
    selectedSigungu.value = null;
    selectedEmd.value = null;

    sigunguRegions.value = [];
    emdRegions.value = [];
  };

  /**
   * 지역명 검색 상태 초기화
   *
   * 검색어를 지우거나 페이지를 종료할 때 사용한다.
   */
  const clearRegionSearchState = ()=>{
    /**
     * 실행 중인 이전 검색 요청을 논리적으로 무효화한다.
     */
    searchRequestSequence++;

    searchResults.value = [];
    selectedSearchRegion.value = null;

    isSearchLoading.value = false;
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

    searchResults.value = [];

    selectedSido.value = null;
    selectedSigungu.value = null;
    selectedEmd.value = null;
    selectedSearchRegion.value = null;

    regionDetail.value = null;

    /*
     * 실행 중인 요청을 무효화한다.
     */
    detailRequestSequence++;
    searchRequestSequence++;

    isListLoading.value = false;
    isDetailLoading.value = false;
    isSearchLoading.value = false;
  };

  return{
    /**
     * 계층 목록
     */
    sidoRegions,
    sigunguRegions,
    emdRegions,

    /**
     * 지역 검색
     */
    searchResults,
    selectedSearchRegion,

    /**
     * 선택 상태
     */
    selectedSido,
    selectedSigungu,
    selectedEmd,
    selectedRegion,
    

    /*
       * 상세 응답
       */
      regionDetail,

      /*
       * 로딩 상태
       */
      isListLoading,
      isDetailLoading,
      isSearchLoading,

      /*
       * 계층 API와 선택
       */
      getRootRegions,
      selectSido,
      selectSigungu,
      selectEmd,

      /*
       * 검색 API와 선택
       */
      searchRegions,
      selectSearchRegion,
      clearRegionSearchState,

      /*
       * 상세 API
       */
      getRegionDetail,

      /*
       * 전체 초기화
       */
      clearRegionState,
  };

});
