# PATCH NOTE v54 - 6스테이지 전용 BGM 추가

## 수정 내용
- 업로드된 `stage6_bgm.mp3` 파일을 `assets/audio/stage6_bgm.mp3`로 추가했습니다.
- `game.js`의 `audioFiles`에 `stage6` BGM 항목을 등록했습니다.
- 6스테이지 진입 시 전용 BGM이 재생되도록 BGM 선택 로직을 수정했습니다.
- 7~10스테이지는 전용 BGM 파일이 추가되기 전까지 기존처럼 stage5 BGM을 재사용합니다.

## 적용 위치
- assets/audio/stage6_bgm.mp3
- game.js
