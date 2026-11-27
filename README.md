# WebGL 3D 지구 지형

WebGL2로 구 메시를 생성하고 NOAA ETOPO 2022 전 지구 고도 데이터로 지형을 표현한 과제 프로젝트입니다. 지구 회전, 이동하는 방향광, 고도 배율 및 마우스 시점 조작을 지원합니다.

## 실행

보안 정책 때문에 HTML 파일을 직접 여는 대신 로컬 웹 서버로 실행합니다.

```bash
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000`을 엽니다.

## 파일

- `index.html`: 화면과 조작 요소
- `style.css`: 화면 배치
- `etopo-data.js`: 브라우저 실행용 1도 간격 ETOPO 고도 배열
- `data/etopo2022_1deg.csv`: NOAA ERDDAP에서 추출한 원본 고도값
- `app.js`: 구 메시 생성, WebGL 셰이더, 조명과 애니메이션

## 구현 요약

위도 `lat`, 경도 `lon`을 라디안으로 변환한 뒤 다음 식으로 단위 구의 정점을 계산합니다.

```text
x = cos(lat) sin(lon)
y = sin(lat)
z = cos(lat) cos(lon)
```

NOAA ETOPO 2022 60 arc-second Ice Surface 자료를 ERDDAP에서 위도와 경도 방향으로 각각 60칸씩 건너뛰어 1도 간격으로 추출했습니다. 각 격자의 단위는 미터이며, 구 메시의 위도와 경도 사이에 있는 값은 쌍선형 보간으로 계산합니다. 육지 고도는 에베레스트산 높이 8,849 m를 기준으로 정규화하고 해저 깊이도 별도 비율로 정규화한 뒤 `p' = normalize(p) * (1 + height * scale)`로 정점을 이동시킵니다.

## 참고

- NOAA ETOPO 2022: https://www.ncei.noaa.gov/products/etopo-global-relief-model
- 사용한 ERDDAP 자료: https://oceanwatch.pifsc.noaa.gov/erddap/griddap/ETOPO_2022_v1_60s.html
- MDN WebGL lighting: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Lighting_in_WebGL

## AI 도구 사용

과제 구조 검토, WebGL 셰이더 오류 점검, 보고서 문장 정리에 AI 도구를 사용했습니다. 생성된 내용을 그대로 제출하지 않고 실행 결과와 코드의 위도 경도 변환, 고도 변위, 법선 기반 조명 계산을 직접 확인해야 합니다.
