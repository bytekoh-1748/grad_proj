# ROOM — Your own pace

방바닥을 홈 화면으로 쓰는 SVG 공간입니다. 음악·영화·신문 포스터를 선택하면
그 활동의 물건들이 바닥에 펼쳐지고, ‘방으로’를 누르면 다시 포스터로 모입니다.
방의 스타일은 **LP의 성격과 기기의 현재 시각**에 맞춰 Expressive, Liquid, Bauhaus
사이에서 바뀝니다. 사용자는 테마를 고르는 대신 활동을 고릅니다.

## 실행

Node.js 20.19+ 또는 22.12+에서 실행합니다.

```sh
npm install
npm run dev
npm test
npm run build
```

`npm run preview`는 `dist/`의 배포 빌드를 확인합니다. 실제 음원은 아직 미연결이며
음악의 선택·도킹·재생 장면·일시정지·복귀를 구현한 상태입니다.

## 분위기가 정해지는 방식

오전 05–11시 / 낮 11–17시 / 저녁 17–20시 / 밤 20–05시로 나눕니다.
홈에서는 각각 Expressive Citrus / Bauhaus Primary / Expressive Berry / Liquid Blue hour를
사용합니다. 현재 시각은 `Date`로 다시 읽으므로 탭을 오래 닫거나 기기의 시간을 바꿔도
애니메이션 경과 시간과 어긋나지 않습니다. 시간대가 바뀌면 색·표면·패턴을 부드럽게 전환합니다.

음악 공간에서는 선택한 LP의 장르와 그래픽을 바탕으로 미리 정한 아트 디렉션을 적용합니다.
오디오를 분석하거나 BPM만으로 테마를 추측하는 구조는 아닙니다.

| LP | 오전 / 낮 | 저녁 | 밤 |
| --- | --- | --- | --- |
| Midnight Rotation · Night Dub | Liquid Pearl | Liquid Aurora | Liquid Blue hour |
| Eye of the Needle · Acid Pop | Expressive Pool / Citrus | Expressive Berry | Bauhaus Blueprint |
| Twin Profile · Offset Soul | Bauhaus Primary | Bauhaus Vermilion | Liquid Aurora |
| Sun Machine · Funk | Expressive Citrus | Bauhaus Vermilion | Expressive Berry |
| Cut & Paste · Punk | Bauhaus Primary | Bauhaus Vermilion | Bauhaus Blueprint |
| Slow Bloom · Ambient Folk | Liquid Pearl / Expressive Pool | Liquid Aurora | Liquid Blue hour |

영화는 시간에 맞는 Liquid, 신문은 낮·저녁에 Bauhaus, 밤에 Liquid를 사용합니다.
일시정지하거나 스타일이 바뀌어도 선택한 LP와 오브젝트 위치·재생 상태는 유지됩니다.
홈으로 돌아가면 다시 시간대 중심의 분위기로 돌아갑니다.

빛도 같은 시계에 연결됩니다. 창문의 방향·그림자는 낮의 시간에 따라 움직이며
햇빛 세기는 해가 뜨고 지는 시간을 표현하는 곡선으로 변합니다. 밤에는 창문 햇빛을 끕니다.
위치 기반 일출·일몰 계산 대신 디자인을 위한 고정된 하루 리듬을 사용합니다.

## 바닥과 물체

모든 포스터·LP·턴테이블·바닥 디테일은 하나의 바닥 투영을 공유합니다. 벽의 `z=0`과
바닥의 `v=0`도 같은 점으로 투영됩니다. 포스터의 축을 통일하고 모바일에서는
같은 축을 따라 한 열로 크게 펼칩니다.

- 공통: 큰 패널의 이음선, 얇은 밝은 모서리, 벽과 맞닿는 바닥 테두리, 이중 인레이.
- Expressive: 원형 도트 인쇄, 세 겹의 곡선, 색 타일.
- Liquid: 얕게 새긴 호, 가느다란 반사선, 겹쳐지는 빛의 면.
- Bauhaus: 체크 인쇄, 절개한 동심원, 평행선과 기하학적 색면.

도트 하나도 바닥 좌표에 놓습니다. 화면 위에 텍스처를 덮지 않으므로 원근이 움직이면
면·선·패턴도 함께 변합니다. `raisedFloor`로 상판·몸통·LP·톤암의 높이를 나누고,
그 사이의 SVG 옆면과 `shadowFloor`로 두께와 접지를 유지합니다.
CSS `matrix3d`는 벡터를 평면에 투영하는 데 사용하며 WebGL 렌더러는 사용하지 않습니다.

## 조작과 활동

- 왼쪽 위 ‘방으로’ / `Esc`: 홈 복귀. 열린 패널이나 기사 창은 먼저 닫힙니다.
- 오른쪽 위 ‘공간 조절’: 구도·확대, Liquid의 ‘투명도 줄이기’.
- 음악의 `1`–`4`: 사선 / 넓게 / 반대편 / 벽 쪽. `S`: 정지. 방향키: 이전·다음 LP.
- 배경에 초점이 있으면 Space: 재생. 배경 드래그: 원근 조절. 휠: 확대·축소.
- 영화: 자체 SVG 모션 스터디 또는 기기의 영상 파일 재생. 파일은 업로드하지 않습니다.
- 신문: 직접 작성한 샘플 기사 세 편과 읽기 창. 실시간 뉴스 연결은 없습니다.

활동 전환은 중간에도 되돌릴 수 있고, 숨은 활동은 입력과 초점을 받지 않습니다.
움직임 줄이기 설정에서는 구도·착지·스타일 전환을 즉시 끝내고 LP 회전과 자동 영상
애니메이션을 생략합니다. Liquid의 불투명 표면 선택은 기기에 저장합니다.
높은 대비 설정과 블러 미지원 브라우저에서도 불투명 표면을 사용합니다.

## 로컬 디버그

`npm run dev`의 **루프백 주소 + `?debug=1`**에서만 스타일 패널을 엽니다.

```text
http://127.0.0.1:5173/?debug=1
http://127.0.0.1:5173/?debug=1&hour=23
http://127.0.0.1:5173/?debug=1&edition=bauhaus&palette=2&hour=18
```

- ‘자동’: LP·시간 규칙으로 복귀. 스타일 버튼·팔레트는 일시적인 수동 오버라이드.
- ‘시간 시뮬레이션’: 0–24시 가상 시계. ‘현재 시각’은 기기 시계로 복귀.
- 수동 테마와 가상 시각은 디버그 URL에만 보관하며 일반 사용자 설정으로 저장하지 않습니다.
- 개발 서버라도 일반 주소에는 패널이 없습니다. LAN·외부 호스트에서도 열리지 않습니다.
- 배포 빌드는 디버그 모듈을 제외합니다. `?debug=1`로 열어도 패널과 오버라이드는 적용되지 않습니다.
- 이전 `edition` / `palette` 주소나 저장된 스타일은 일반 화면을 고정시키지 않습니다.

## 코드와 검증

| 파일 | 역할 |
| --- | --- |
| `src/room-mood.js` | 시간대·LP별 분위기, 실제 시각, 햇빛 강도, 디버그 진입 조건 |
| `src/design-data.js` | 세 스타일과 아홉 팔레트, 재질 수치와 색상 보간 |
| `src/design-studio.js` | 자동 분위기 반영, 색·재질 전환, 접근성 설정 |
| `src/design-debug.js` | 개발 환경에서만 불러오는 스타일·시간 검사 패널 |
| `src/design-art.js`, `src/floor-surface.js` | 포스터 그림, 바닥 그래픽과 실제 바닥 투영 |
| `src/floor-home.js`, `src/activity-motion.js` | 활동별 오브젝트, 포커스, 중단 가능한 전환 |
| `src/floor-scene.js`, `src/vector-room.js` | 공통 원근·빛·높이·그림자와 SVG 갱신 |
| `src/tracks/*.js`, `src/svg-context.js` | 등록한 LP의 SVG 재생 장면 |

`npm test`는 시간대 경계·24시간 LP 매핑·로컬 디버그 조건·바닥 패턴의
투영 범위·공통 바닥·전환 연속성·전체 등록 SVG 장면·9개 팔레트 색상 토큰의 대비를 확인합니다.
반투명 표면의 실제 대비는 배경에 따라서 달라지므로 브라우저 시각 검수도 병행합니다.

디자인 참고: [Material 3 Expressive](https://design.google/library/expressive-material-design-google-research),
[Apple HIG — Materials](https://developer.apple.com/design/human-interface-guidelines/materials),
[Bauhaus-Archiv](https://www.bauhaus.de/en/sammlung/highlights/204_unterricht/444),
[Getty — Form and Color](https://www.getty.edu/research/exhibitions_events/exhibitions/bauhaus/new_artist/form_color/interactive/).
Liquid는 웹의 블러·SVG 반사로 재해석한 디자인입니다.


## 콘텐츠 추가와 모듈 경계

콘텐츠를 추가할 때 화면 렌더러나 재생 상태 코드를 수정할 필요가 없습니다.

| 추가할 콘텐츠 | 수정할 곳 | 표시 방식 |
| --- | --- | --- |
| LP | `src/tracks/새-곡.js` 작성 후 `src/tracks/index.js`에 import | 선택한 1장과 선반 최대 5장을 표시. 이전·다음으로 전체 목록 탐색 |
| 신문 | `src/content/journal.js`의 발행 정보와 `articles` | 한 페이지에 최대 3편, 이전·다음 페이지와 기사 읽기 창 |
| 영상 | `src/content/films.js`에 `id`, `title`, `src`, 선택적 `poster` 추가 | 상영 목록에서 선택하고 기본 영상 컨트롤로 재생 |

LP의 `id`와 `side`는 각각 고유해야 하며, `duration`은 `3:20`처럼 `분:초`로 씁니다.
등록 시 검증한 재생 시간을 한 번 계산합니다. 새 LP 그림은 처음 화면에 표시될 때 만들고
재사용합니다. 곡별 `moods`를 지정하면 공용 분위기 매핑을 수정하지 않고도 시간대별
스타일을 정할 수 있습니다. 자세한 계약과 예시는 [곡 등록 규칙](src/tracks/README.md)을 참고하세요.

기사의 형식은 다음과 같습니다. 제목·소개·본문은 HTML이 아닌 일반 텍스트로 처리하며,
본문의 빈 줄은 문단을 나눕니다. 기사 수가 늘어나도 신문 자체 크기는 유지합니다.

```js
{ id: 'a-new-day', title: '새로운 하루', tag: 'LIFE · 04',
  intro: '한 줄 소개.', text: '첫 번째 문단.\n\n두 번째 문단.' }
```

영상 파일을 `public/videos/short-film.mp4`에 두었다면 다음 항목을 추가합니다.

```js
{ id: 'short-film', title: '오늘의 단편', src: '/videos/short-film.mp4' }
```

`src`는 브라우저가 재생할 수 있는 영상 파일 URL입니다. YouTube 같은 웹페이지 URL을
넣는 방식은 지원하지 않습니다. 실제 디코딩 가능 여부는 브라우저와 파일 코덱에 따릅니다.
‘내 영상 열기’는 여러 파일을 선택해 현재 세션의 상영 목록에 추가합니다. 파일을 업로드하거나
새로고침 후 보관하지 않습니다. 다른 영상으로 바꾸면 이전 Object URL을 해제하며,
원본 데모로 돌아오기와 파일 오류 후 다른 영상 선택도 지원합니다.

| 모듈 | 책임 |
| --- | --- |
| `script.js` | 앱 초기화, 입력 연결, 종료 처리 |
| `src/frame-loop.js` | 하나의 프레임 루프, 백그라운드 탭 정지·복귀 |
| `src/activities/music-player.js` | 곡 선택·도킹·일시정지·복귀와 오래된 비동기 작업 무효화 |
| `src/activities/cinema-player.js` | 영상 목록, 기본 video 이벤트, 파일 URL 수명 관리 |
| `src/activities/journal-reader.js` | 기사 페이지와 읽기 창 |
| `src/content/*.js` | 신문·영상 데이터, 목록 검증과 페이지 계산 |
| `src/activity-markup.js` | 활동별 정적 화면 골격 |
| `src/record-layout.js` | 콘텐츠 수와 독립적인 LP 선반 배치 |
| `src/render-state.js` | 보간 종료와 변경 감지 |

렌더링은 방의 투영·빛·물체·LP 회전을 구분해 변경된 부분을 갱신합니다.
보간의 마지막 좌표도 SVG에 반영하고, 같은 SVG 경로와 클립은 다시 쓰지 않습니다.
정지한 장면의 재계산을 건너뛰며, 움직이는 LP 그래픽은 최대 초당 30회 갱신합니다.
비행과 톤암 대기는 같은 프레임 시간으로 진행해 숨긴 탭에서 복귀할 때 시간이 튀지 않습니다.

추가 회귀 검사는 마지막 보간 프레임, 1·6·7·100장 LP 배치, 20편 기사 페이지,
연속 선택과 도킹 중 홈 복귀, 영상 교체·오류·URL 해제, 동일 SVG 프레임의 DOM 쓰기
생략을 확인합니다. 실제 브라우저에서도 음악·신문·영상 활동 전환을 확인합니다.
