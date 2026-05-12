# v34 Google 로그인 + Google Sheets 연동 준비

## 적용 내용
- Google Identity Services 로그인 스크립트 추가
- 타이틀 화면 LOGIN 버튼을 Google 로그인 방식으로 변경
- Google 로그인 성공 시 닉네임 입력 및 사용자 프로필 로컬 저장
- 사용자별 키 설정/BGM/SFX 설정을 Apps Script URL 설정 시 Google Sheets와 동기화
- 사용자 경쟁전 점수를 Apps Script URL 설정 시 Google Sheets에 저장
- Google Sheets 랭킹 1~100위 동기화 준비
- `apps_script/Code.gs` 추가
- `GOOGLE_SHEETS_LOGIN_SETUP.md` 추가

## 설정 필요
`game.js`의 아래 값을 Apps Script 웹 앱 URL로 교체해야 Google Sheets 저장이 활성화됩니다.

```js
const APPS_SCRIPT_WEBAPP_URL = "YOUR_APPS_SCRIPT_WEBAPP_URL";
```

URL을 넣기 전에는 기존처럼 localStorage 저장으로만 동작합니다.
