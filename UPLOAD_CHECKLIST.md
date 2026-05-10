# GitHub 업로드 체크리스트

## 올릴 것

- index.html
- style.css
- game.js
- assets 폴더
- README_설치방법.md
- UPLOAD_CHECKLIST.md
- .gitignore
- .nojekyll

## 올리지 말 것

- zip 파일
- exe 파일
- Python 파일
- dist 폴더
- build 폴더
- 원본 대용량 이미지
- 원본 wav/flac 음원
- 기존 Pygame 프로젝트 전체

## 정상 구조

```text
Donggops-online/
├─ index.html
├─ style.css
├─ game.js
├─ assets/
│  ├─ images/
│  └─ audio/
```

`index.html`이 저장소 첫 화면에 바로 보여야 합니다.


## 추가 패치 v4
- 별풍선 발동 조건: 660CPM 이상 5초 유지
- 별풍선 키: F → B
- B(별풍선) 활성 시 10초 동안 자동 +500CPM 보너스 적용
- 0% 게이지에서는 색상 막대가 보이지 않도록 수정
- 메뉴에 브라우저 전체화면(F11) 버튼 추가


## v6 추가 패치
- 별풍선 발동 이펙트 강화
- SPACE 연타 속도에 따른 3프레임 전환 가속
- 최종 결과 화면 열 정렬 개선
- 게임 설명 박스 확대
- 5스테이지 3회 실패 시 초기화면 자동 복귀


## v7 추가 패치
- BGM 음소거 버튼 추가
- 설정 > 키 설정 변경 메뉴 추가
- 승리/패배 결과 화면에 캐릭터별 WebP 이미지 추가


## v8 추가 패치
- 설정 박스/버튼 배치 수정
- 승리/패배 결과 이미지가 잘리지 않게 수정
- game_win.mp3 / game_lose.mp3 / byulpoong.mp3 효과음 적용


## v9 추가 패치
- 동꼽유지시간 문구를 별풍리액션텐션으로 변경
- CPM/텐션 게이지 디자인 개선
- 5스테이지 클리어 후 최종결과 ENTER 시 초기화면 복귀
- 자동사냥 종료 2초 전 coin_came_out_of_keyboard.mp3 재생
