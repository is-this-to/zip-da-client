let kakaoMapSdkPromise = null;

export const loadKakaoMapSdk = ()=>{
  if(window.kakao?.maps){
    return Promise.resolve(window.kakao);
  }

  if(kakaoMapSdkPromise){
    return kakaoMapSdkPromise;
  }

  const appKey = import.meta.env.VITE_KAKAO_MAP_APP_KEY;

  if(!appKey){
    return Promise.reject(
      new Error(
        "VITE_KAKAO_MAP_APP_KEY가 설정되지 않았습니다."
      ),
    );
  }

  kakaoMapSdkPromise = new Promise(
    (resolve, reject) =>{
      const existingScript = document.querySelector('script[data-kakao-map-sdk="true"]');

      if(existingScript){
        existingScript.addEventListener("load", ()=>{
            window.kakao.maps.load(()=>{
              resolve(window.kakao);
            });
          },
          { once: true},
        );

        existingScript.addEventListener("error", ()=>{
            reject(
              new Error(
                "카카오 지도 SDK를 불러오지 못했습니다."
              ),
            );
          },
          {once: true}
        );

        return;
      }

      const script = document.createElement("script");

      script.dataset.kakaoMapSdk = "true";
      script.async = true;

      script.src = "https://dapi.kakao.com/v2/maps/sdk.js" + `?appkey=${appKey}&autoload=false`;

      script.onload = ()=>{
        window.kakao.maps.load(()=>{
          resolve(window.kakao);
        });
      };

      script.onerror = ()=>{
        kakaoMapSdkPromise = null;

        reject(
          new Error(
            "카카오 지도 SDK를 불러오지 못했습니다."
          ),
        );
      };

      document.head.appendChild(script);
    },
    
  );

  return kakaoMapSdkPromise;
};