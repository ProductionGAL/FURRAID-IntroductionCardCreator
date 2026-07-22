# FUR:RAID 2026 자기소개카드 메이커

FUR:RAID 2026 참가자용 자기소개카드를 간편하게 만드는 웹 도구입니다.

카드 위에서 사진과 문구를 바로 수정하고, 완성된 카드는 PNG 이미지로 저장할 수 있습니다. 별도의 회원가입이나 서버 저장 기능은 없습니다.

## 할 수 있는 것

- 사진 업로드 및 정사각형 크롭
- 닉네임, 캐릭터 이름, 자기소개 입력
- 참가 일정 선택
- 모바일과 PC에서 바로 편집
- 완성된 카드 PNG 저장

사진은 가로와 세로가 각각 500px 이상이어야 하며, JPG·PNG·WebP 형식을 지원합니다. 파일 용량 제한은 200MB입니다.

## 로컬에서 실행하기

[Bun](https://bun.sh/)이 필요합니다.

```bash
bun install
bun run dev
```

터미널에 표시되는 `Local` 주소를 이 컴퓨터에서 열면 됩니다. 같은 내부망에 연결된
휴대폰이나 다른 컴퓨터에서는 `Network` 주소의 `/editor/` 경로로 접속합니다.

예: `http://192.168.0.103:5173/editor/`

운영체제 방화벽에서 Bun 또는 Node의 네트워크 연결 허용을 요청하면 내부망 연결을
허용해야 합니다. 이 설정은 인터넷에 배포하는 용도가 아니라 개발 중인 로컬 서버를
같은 네트워크 안에서 확인하기 위한 용도입니다.

내부망의 `http://192.168.x.x` 주소에서는 브라우저 보안 정책상 네이티브 공유 기능을
사용할 수 없습니다. 모바일 공유 기능은 HTTPS가 적용된 배포 주소에서 확인해야 합니다.

프로덕션 빌드는 아래 명령으로 만들 수 있습니다.

```bash
bun run build
```

빌드 결과는 `dist/` 폴더에 생성됩니다.

## 개발 명령

```bash
bun run check   # 코드 및 타입 검사
bun test        # 단위 테스트
bun run format  # 코드 포맷 정리
```

미리보기와 저장 결과가 같은지 확인하려면 프리뷰 서버를 실행한 뒤 별도 터미널에서 QA 명령을 사용합니다.

```bash
bun run build
bun run preview -- --host 127.0.0.1
```

```bash
bun run qa:parity
```

## 프로젝트 구조

```text
src/
├── assets/       프레임과 로고
├── components/   카드 편집기와 이미지 크롭 UI
├── lib/          이미지 처리와 렌더링 로직
├── App.tsx
└── styles.css

public/fonts/     Wanted Sans 웹폰트와 라이선스
scripts/          브라우저 및 렌더링 QA 스크립트
```

카드 원본은 `src/assets/Frame.png`입니다. 최종 저장 크기는 `1380 × 2167px`이며, 편집 화면에서 보이지 않는 오른쪽 영역도 저장할 때 원본 프레임과 함께 포함됩니다.

## 개인정보 관련

업로드한 사진과 입력 내용은 브라우저 안에서만 처리됩니다. 서버 전송, 쿠키, 로컬 스토리지 저장을 하지 않기 때문에 새로고침하거나 탭을 닫으면 작업 내용이 사라집니다.

Wanted Sans의 라이선스는 `public/fonts/WANTED-SANS-OFL.txt`에서 확인할 수 있습니다.

## 저작권 및 라이선스

© 2026 FUR:RAID Comm. All rights reserved.

Developed by Logmong.

FUR:RAID Comm.가 권리를 보유한 프로젝트 자체 제작 부분은 별도의 서면 허가 없이 복제, 수정, 2차 활용 또는 재배포할 수 없습니다. 사이트에서 만든 자기소개 카드를 개인적인 행사 참여 안내 용도로 저장하고 공유하는 것은 가능합니다.

React, Wanted Sans 등 외부 요소에는 각각의 오픈소스 라이선스가 그대로 적용됩니다. 전체 범위는 [`LICENSE.md`](LICENSE.md), 외부 요소별 고지는 [`public/THIRD_PARTY_NOTICES.txt`](public/THIRD_PARTY_NOTICES.txt)에서 확인할 수 있습니다.
