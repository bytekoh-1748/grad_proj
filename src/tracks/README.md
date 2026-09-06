# 곡 모듈 등록 규칙

판 한 장은 파일 하나만 소유합니다. 겉면(비닐의 색 쐐기와 레이블)과
재생 뒤에 펼쳐지는 인터랙션이 같은 파일 안에 함께 있습니다.
새 작업자는 다음 세 단계만 진행하면 됩니다.

1. 이 폴더의 기존 모듈 하나를 복사합니다.
2. 메타데이터, `palette`, `render()` 구현을 교체합니다.
   - `palette` 는 LP마다 소유하는 색입니다. `name`, `wash`, `ground`, `ink`,
     `paper`, `primary`, `primaryDeep`, `secondary`, `secondaryDeep`, `accent`,
     `accentDeep`, `soft` 를 정의합니다. `wash` 는 방의 종이색, `ground` 는
     재생 장면의 바탕색입니다. 같은 팔레트가 레이블과 기계, 배경에 이어집니다.
   - `wedges` 는 비닐 위의 색 쐐기입니다. `[시작각, 끝각, 색]` 이며
     0도가 12시, 시계 방향입니다. 레이블 바깥부터 가장자리까지 뻗습니다.
   - `label.art` 는 `src/label-art.js` 에 등록된 그림의 이름입니다.
     새 그림이 필요하면 그 파일에 함수 하나를 더합니다.
   - `scene.ground` 는 인터랙션 화면의 바닥색입니다. 앱이 먼저 칠하고
     `render()` 를 부릅니다. `scene.ink` 는 HUD 의 박자 표시등 색입니다.
3. 상자에 놓일 순서대로 `index.js` 에 import 한 줄을 추가합니다.

공용 앱은 판의 도안, 상자 탐색, 무대로 날아가는 비행, 대각선 타이포,
플래터 도킹, 톤암, 회전, 화면 전환과 포인터 상태를 자동으로 제공합니다.
곡 모듈에서는 DOM 에 직접 접근하지 않습니다.

현재 `context`는 `src/svg-context.js`의 SVG 출력 컨텍스트입니다. 기존의
`beginPath`, `moveTo`, `lineTo`, `quadraticCurveTo`, `arc`, `ellipse`, `rect`,
`fill`, `stroke`, `fillRect`, `save`/`restore`, `translate`/`rotate`/`scale`,
`clip` 명령을 사용하면 실제 SVG path로 그려집니다. 미리 작성한 경로는
`Path2D` 대신 SVG `d` 문자열을 `fill(d)` 또는 `stroke(d)`에 전달합니다.
그림은 방의 벽 구도에 배치되며, 포인터 좌표는 SVG 변형 행렬의 역변환으로 구합니다.

```js
import { TAU } from '../config.js';
import { registerTrack } from './registry.js';

const P = Object.freeze({
  name: 'POP PRESSING', wash: '#FFC20E', ground: '#8B22F0',
  ink: '#0D0D0D', paper: '#FFFFFF', primary: '#8B22F0', primaryDeep: '#5E10AE',
  secondary: '#12A98B', secondaryDeep: '#0B7A63', accent: '#FFC20E',
  accentDeep: '#F0A400', soft: '#F2A2AC',
});

registerTrack({
  palette: P,
  id: 'unique-kebab-case-id',
  side: 'C1',                       // 상자에서 유일해야 합니다
  title: 'Visible Title',
  artist: 'Artist Name',
  genre: 'SOME GENRE',
  duration: '3:20',
  bpm: 118,                         // render() 의 beat 와 pulse 를 정합니다
  hint: 'MOVE TO INTERACT',
  wedges: [[10, 90, P.primary], [200, 260, P.secondary]],
  label: { art: 'sunburst', paper: P.accent },
  scene: { ground: P.ground, ink: P.primary },

  render({ context, width, height, time, dt, beat, pulse, pointer }) {
    // time   재생 시작 뒤 흐른 시각 (ms)
    // dt     지난 프레임과의 간격 (ms)
    // beat   재생을 시작한 뒤 흐른 박자 수 (소수)
    // pulse  박자마다 1에서 0으로 떨어지는 값
    // pointer { x, y } 는 0..1, { dx, dy } 는 -1..1, down 은 눌림 여부
    context.fillStyle = P.primary;
    context.beginPath();
    context.arc(pointer.x * width, pointer.y * height, 40 + pulse * 20, 0, TAU);
    context.fill();
  },
});
```

`registry.js` 는 필수값 누락, 중복 id, 중복 사이드 번호를 시작 시점에
검사합니다. 등록 실수를 실제 곡 코드 가까이에서 바로 찾을 수 있습니다.

LP 선택 시 방의 색이 천천히 섞입니다. 도킹 후 톤암이 내려오고 곡의 장면이 나타나며,
약 4초 후 벽 구도로 선과 면이 이어져 변합니다. 직접 구도를 바꾸거나 드래그하면
자동 전환을 취소합니다. 일시정지는 장면 시간을 멈추고 톤암 끝을 올립니다.
정지나 새 LP 선택은 진행 중인 비행을 취소하고 현재 자리에서 새 목적지로 이어집니다.
움직임 줄이기 설정에서는 전환을 즉시 마치고 자동 회전과 박자 효과를 멈춥니다.

디자인 원칙: 그라데이션·블러·종이 질감 없이 선명한 단색 면과 검정 윤곽을
사용합니다. 색의 공간적 번짐 없이 색상과 장면의 시간적 전환만 부드럽게 합니다.
