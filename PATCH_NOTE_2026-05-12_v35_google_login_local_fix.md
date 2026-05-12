# v35 Google 로그인 로컬 실행 오류/닫기 버튼 보강

## 수정 내용
- `file://` 로 직접 실행할 때 Google OAuth 요청을 보내지 않도록 차단했습니다.
- 로컬 파일 실행 시 안내 문구를 표시하고 닫기 버튼은 정상 동작하게 했습니다.
- Google 로그인 모달의 z-index/pointer 이벤트를 강화하여 닫기 버튼 클릭이 캔버스 입력에 가로막히지 않게 했습니다.
- GitHub Pages/HTTPS 도메인 또는 `localhost` 환경에서만 Google 로그인 버튼이 렌더링됩니다.

## 테스트 방법
- 실제 테스트: `https://donggops.cloud-ip.cc` 또는 GitHub Pages 배포 URL에서 실행
- 로컬 테스트: Google Cloud OAuth Client의 Authorized JavaScript origins에 `http://localhost:8000` 등록 후 `LOCAL_TEST_START.bat`로 실행
