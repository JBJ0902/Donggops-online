# 동꼽즈 Google 로그인 + Google Sheets 랭킹 설정

## 1. Google Cloud OAuth Client ID
현재 게임 코드에는 아래 Client ID가 들어가 있습니다.

```text
1005600552830-ffbq5n0nsucf35lrllqkvpel13fth8nd.apps.googleusercontent.com
```

Google Cloud > Google 인증 플랫폼 > 클라이언트에서 Authorized JavaScript origins에 아래 주소를 넣어주세요.

```text
https://donggops.cloud-ip.cc
https://jbj0902.github.io
```

로컬 파일 `file:///C:/.../index.html`에서는 Google 로그인 테스트가 제한될 수 있습니다. GitHub Pages 또는 등록된 HTTPS 도메인에서 테스트하는 것이 안전합니다.

## 2. Google Sheet 만들기
1. Google Drive에서 새 Google 스프레드시트를 만듭니다.
2. 이름 예시: `donggops_game_db`
3. 스프레드시트에서 `확장 프로그램 > Apps Script`를 엽니다.
4. `apps_script/Code.gs` 내용을 붙여넣고 저장합니다.
5. Apps Script 편집기에서 `setupDonggopsSheets` 함수를 한 번 실행합니다.
   - 최초 실행 시 권한 승인 필요.
   - `users`, `user_settings`, `competition_scores` 시트가 생성됩니다.

## 3. Apps Script 웹 앱 배포
1. Apps Script 우측 상단 `배포 > 새 배포`
2. 유형: `웹 앱`
3. 실행 권한: `나`
4. 액세스 권한: `모든 사용자`
5. 배포 후 `/exec`로 끝나는 Web App URL을 복사합니다.

## 4. game.js에 URL 넣기
`game.js` 상단에서 아래 줄을 찾습니다.

```js
const APPS_SCRIPT_WEBAPP_URL = "YOUR_APPS_SCRIPT_WEBAPP_URL";
```

복사한 Apps Script Web App URL로 교체합니다.

```js
const APPS_SCRIPT_WEBAPP_URL = "https://script.google.com/macros/s/....../exec";
```

이후 GitHub에 `game.js`, `index.html`, `style.css`, `apps_script/Code.gs`, `GOOGLE_SHEETS_LOGIN_SETUP.md`를 올리면 됩니다.

## 5. 동작 방식
- Google 로그인 성공 시 브라우저에 로컬 프로필을 만들고 Apps Script에 로그인 기록을 동기화합니다.
- 사용자별 키 설정, BGM/SFX 볼륨 설정은 로컬 저장 + Google Sheets 동기화됩니다.
- 사용자 경쟁전 최종 결과는 Google Sheets의 `competition_scores`에 저장되고 1~100위 랭킹으로 표시됩니다.
- Apps Script URL을 아직 넣지 않은 상태에서는 기존처럼 브라우저 로컬 저장만 작동합니다.

## 개인정보 최소화 안내
- v49부터 Google 로그인 시 이메일, 실명, 프로필 사진은 Google Sheets에 저장하지 않습니다.
- `users` 시트의 `google_email_unused`, `google_name_unused`, `picture_unused` 열은 기존 배포본과의 호환성을 위한 빈 칸입니다.
- 랭킹과 기록 구분에는 Google 고유 식별값, 닉네임, 게임 기록, 키/볼륨 설정만 사용합니다.
- 로그인 팝업에서 개인정보 및 이용 책임 안내에 동의해야 Google 로그인 버튼이 활성화됩니다.

## 6. 나중에 Supabase로 이전
각 시트가 Supabase 테이블로 옮기기 쉬운 형태입니다.
- `users` -> `users`
- `user_settings` -> `user_settings`
- `competition_scores` -> `competition_scores`

Google Sheets에서 CSV로 다운로드한 뒤 Supabase Table Editor 또는 SQL import로 이전할 수 있습니다.
