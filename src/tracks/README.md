# 곡 모듈 등록 규칙

판 한 장은 파일 하나만 소유합니다. 겉면(비닐의 색 쐐기와 레이블)과
재생 뒤에 펼쳐지는 인터랙션이 같은 파일 안에 함께 있습니다.
새 작업자는 다음 세 단계만 진행하면 됩니다.

1. 이 폴더의 기존 모듈 하나를 복사합니다.
2. 메타데이터, 색, `render()` 구현을 교체합니다.
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

```js
import { POP, TAU } from '../config.js';
import { registerTrack } from './registry.js';

registerTrack({
  id: 'unique-kebab-case-id',
  side: 'C1',                       // 상자에서 유일해야 합니다
  title: 'Visible Title',
  artist: 'Artist Name',
  genre: 'SOME GENRE',
  duration: '3:20',
  bpm: 118,                         // render() 의 beat 와 pulse 를 정합니다
  hint: 'MOVE TO INTERACT',
  wedges: [[10, 90, POP.purple], [200, 260, POP.teal]],
  label: { art: 'sunburst', paper: POP.yellow },
  scene: { ground: POP.yellow, ink: POP.purple },

  render({ context, width, height, time, dt, beat, pulse, pointer }) {
    // time   ms 단위의 절대 시각
    // dt     지난 프레임과의 간격 (ms)
    // beat   재생을 시작한 뒤 흐른 박자 수 (소수)
    // pulse  박자마다 1에서 0으로 떨어지는 값
    // pointer { x, y } 는 0..1, { dx, dy } 는 -1..1, down 은 눌림 여부
    context.fillStyle = POP.purple;
    context.beginPath();
    context.arc(pointer.x * width, pointer.y * height, 40 + pulse * 20, 0, TAU);
    context.fill();
  },
});
```

`registry.js` 는 필수값 누락, 중복 id, 중복 사이드 번호를 시작 시점에
검사합니다. 등록 실수를 실제 곡 코드 가까이에서 바로 찾을 수 있습니다.
