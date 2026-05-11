# v21 인트로 스토리 화면 추가

## 수정 내용
- 초기화면 이전에 인트로 화면을 추가했습니다.
- `dongggop_intro_1.webp`부터 `dongggop_intro_6.webp`까지 ENTER / SPACE / 마우스 클릭으로 순서대로 진행됩니다.
- 장면 전환마다 하얀 플래시 전환과 가벼운 별/버블 VFX가 표시됩니다.
- 인트로 동안 `donggopp_killkill_1.mp3`가 반복 재생됩니다.
- 우측 하단에 SKIP 버튼을 추가했습니다.
- SKIP 위에 인트로 BGM 볼륨 조절 UI를 추가했습니다.
- 인트로 화면에서는 기존 MENU 버튼을 숨겨 SKIP 버튼과 겹치지 않도록 했습니다.

## GitHub 업로드 참고
- `game.js` 교체
- `assets/images/dongggop_intro_1.webp` ~ `dongggop_intro_6.webp` 추가
- `assets/images/volume_icon.png` 추가
- `assets/audio/donggopp_killkill_1.mp3` 추가
