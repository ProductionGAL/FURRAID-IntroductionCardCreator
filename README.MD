# FUR:RAID 2026 자기소개카드 메이커

FUR:RAID 2026 자기소개카드를 브라우저에서 바로 편집하고 PNG 이미지로 저장할 수 있는 프론트엔드 전용 웹 애플리케이션입니다.

사진과 입력 내용은 서버로 전송되거나 저장되지 않습니다. 모든 작업은 현재 브라우저 안에서만 처리되며, 페이지를 새로고침하면 입력 내용이 초기화됩니다.

## 주요 기능

- 실제 카드 프레임 위에서 사진과 텍스트를 직접 편집
- JPG, PNG, WebP 이미지 업로드
- 업로드한 사진의 위치와 확대 비율 조절
- 가로·세로 각각 최소 500px 이미지 검증
- 이미지 파일 최대 200MB 지원
- 닉네임과 캐릭터 이름 최대 20자 입력 및 길이에 따른 자동 글자 축소
- 자기소개 최대 120자 입력
- 참가 일정 선택
- 화면 미리보기와 동일한 고해상도 PNG 저장
- 데스크톱과 모바일 환경 지원
- 서버, 쿠키, 로컬 스토리지, 데이터베이스를 사용하지 않는 일회성 편집

## 출력 규격

- 최종 이미지: `1380 × 2167px`
- 편집 영역: 프레임 왼쪽 `1200 × 2167px`
- 오른쪽 `180px` 영역은 편집 화면에서 숨겨지고 저장할 때 원본 프레임 그대로 결합됩니다.

프레임 원본은 `src/assets/Frame.png`입니다. 프레임을 교체하면 입력 필드와 일정 선택 영역의 위치도 새 프레임에 맞게 조정해야 합니다.

## 기술 구성

- React 19
- TypeScript
- Vite
- Bun
- `html-to-image`
- Phosphor Icons
- Wanted Sans Variable

Wanted Sans 폰트 파일과 라이선스는 `public/fonts/`에 포함되어 있습니다.

## 시작하기

필요 환경:

- [Bun](https://bun.sh/) 1.3 이상

의존성을 설치합니다.

```bash
bun install
```

개발 서버를 실행합니다.

```bash
bun run dev
```

터미널에 표시되는 로컬 주소를 브라우저에서 열면 됩니다.

## 빌드 및 미리보기

프로덕션 빌드를 생성합니다.

```bash
bun run build
```

빌드 결과를 로컬에서 확인합니다.

```bash
bun run preview
```

생성된 `dist/` 폴더는 정적 호스팅 서비스에 그대로 배포할 수 있습니다. 별도의 백엔드 서버는 필요하지 않습니다.

## 검사 명령

```bash
# Biome와 TypeScript 검사
bun run check

# 단위 테스트
bun test

# 코드 포맷 정리
bun run format
```

미리보기와 저장 이미지의 렌더링 일치 여부를 확인하려면 먼저 `4173` 포트에서 프리뷰 서버를 실행합니다.

```bash
bun run build
bun run preview -- --host 127.0.0.1
```

다른 터미널에서 다음 명령을 실행합니다.

```bash
bun run qa:parity
```

전체 브라우저 편집 흐름을 확인할 수도 있습니다.

```bash
bun run scripts/browser-qa.mts
```

QA 과정에서 생성되는 결과 파일은 `.omo/`에 저장되며 Git에는 포함되지 않습니다.

## 프로젝트 구조

```text
.
├── public/
│   ├── fonts/                  # Wanted Sans 폰트와 라이선스
│   ├── icon.svg
│   └── robots.txt
├── scripts/
│   ├── browser-qa.mts          # 데스크톱·모바일 전체 흐름 검증
│   ├── lighthouse-qa.mts       # Lighthouse 검사
│   └── preview-export-parity.mts
├── src/
│   ├── assets/                 # 카드 프레임과 브랜드 로고
│   ├── components/             # 카드 에디터와 크롭 UI
│   ├── lib/                    # 이미지 처리, 렌더링, 텍스트 계산
│   ├── App.tsx
│   ├── main.tsx
│   ├── model.ts
│   └── styles.css
├── DESIGN.md                   # UI와 출력물의 디자인 규칙
├── index.html
├── package.json
└── vite.config.ts
```

## 개인정보 처리 원칙

이 프로젝트에는 데이터를 수집하거나 저장하는 백엔드가 없습니다.

- 첨부한 이미지는 사용자의 브라우저 메모리에서만 처리됩니다.
- 입력한 닉네임, 캐릭터 이름, 일정, 자기소개는 서버로 전송되지 않습니다.
- 쿠키, `localStorage`, `sessionStorage`에 편집 내용을 저장하지 않습니다.
- 새로고침하거나 탭을 닫으면 편집 내용이 사라집니다.
- PNG 저장도 브라우저 안에서 처리됩니다.

개발 과정에서 외부 전송 기능을 추가할 경우 이 원칙과 화면의 개인정보 안내 문구를 반드시 함께 검토해야 합니다.

## 주요 자산

- `src/assets/Frame.png`: 자기소개카드 원본 프레임
- `src/assets/furraid2026_left_logo.png`: 왼쪽 소개 영역 로고
- `public/fonts/WantedSansVariable.woff2`: Wanted Sans Variable 웹폰트
- `public/fonts/WANTED-SANS-OFL.txt`: 폰트 라이선스

