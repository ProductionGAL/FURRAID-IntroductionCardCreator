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

터미널에 표시되는 주소를 브라우저에서 열면 됩니다.

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
