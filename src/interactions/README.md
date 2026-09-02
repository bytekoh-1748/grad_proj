# 인터랙션 모듈 등록 규칙

카트리지 하나는 파일 하나만 소유합니다. 새 작업자는 다음 세 단계만
진행하면 됩니다.

1. 이 폴더의 기존 모듈 하나를 복사합니다.
2. 메타데이터, 색상, `render()` 구현을 교체합니다.
3. 선반에 놓일 순서대로 `index.js`에 import 한 줄을 추가합니다.

공용 앱은 카트리지 마크업, 미리보기, LCD, 전체 화면 캔버스, 선반 탐색,
삽입·배출 애니메이션과 포인터 상태를 자동으로 제공합니다. 인터랙션
모듈에서는 DOM에 직접 접근하지 않습니다.

```js
import { INK, PAPER } from '../config.js';
import { registerInteraction } from './registry.js';

registerInteraction({
  id: 'unique-kebab-case-id',
  number: '07',
  title: 'Visible title',
  mode: 'ONE INK',
  hint: 'MOVE TO INTERACT',
  cartridge: { body: INK.cobalt, foreground: PAPER.white },
  screen: { ink: INK.cobalt, paper: PAPER.white },
  previewTime: 0,
  render({ context, width, height, time, color, pointer }) {
    // pointer: { x, y } in 0..1, { dx, dy } in -1..1, and down
    context.fillStyle = color;
    context.fillRect(pointer.x * width, pointer.y * height, 24, 24);
  },
});
```

`registry.js`는 필수값 누락, 중복 id, 중복 카트리지 번호를 시작 시점에
검사합니다. 등록 실수를 실제 인터랙션 코드 가까이에서 바로 찾을 수 있습니다.
