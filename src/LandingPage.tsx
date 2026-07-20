import type { ReactNode } from "react"
import selfDesignFrameUrl from "./assets/Frame_SelfDesign.png"
import logoUrl from "./assets/furraid2026_left_logo.png"
import downloadIconUrl from "./assets/Icon_Download.svg"
import inputFormIconUrl from "./assets/Icon_InputForm.svg"

type LandingActionProps = {
  readonly href: string
  readonly title: string
  readonly english: string
  readonly japanese: string
  readonly description: ReactNode
  readonly iconSrc: string
  readonly iconWidth: number
  readonly iconHeight: number
  readonly download?: string
}

const LandingAction = (props: LandingActionProps) => (
  <a className="landing-action" href={props.href} download={props.download}>
    <span className="landing-action__content">
      <strong>{props.title}</strong>
      <small>
        {props.english}
        <br />
        {props.japanese}
      </small>
      <span className="landing-action__description">{props.description}</span>
    </span>
    <span className="landing-action__icon" aria-hidden>
      <img src={props.iconSrc} alt="" width={props.iconWidth} height={props.iconHeight} />
    </span>
  </a>
)

export const LandingPage = () => (
  <main className="landing-page">
    <header className="landing-brand">
      <div className="landing-brand__inner">
        <img src={logoUrl} alt="FUR:RAID 2026 FIELDTRIP" width="693" height="499" />
        <h1>자기소개 카드</h1>
        <p>
          Self Introduction Card Generator
          <br />
          自己紹介カードメーカー
        </p>
      </div>
    </header>

    <nav className="landing-actions" aria-label="자기소개 카드 만들기 방법">
      <LandingAction
        href={selfDesignFrameUrl}
        download="FURRAID-2026-self-introduction-card.png"
        title="원본파일 다운로드 받기"
        english="Download Editable Original File"
        japanese="自由に編集できる元本ファイルダウンロード"
        description={
          <>
            편집 프로그램을 사용하여 자신이 원하는대로 꾸밀 수 있는
            <br />
            원본 파일을 받아서 자기소개 카드를 마음껏 꾸며보세요!
          </>
        }
        iconSrc={downloadIconUrl}
        iconWidth={107}
        iconHeight={70}
      />
      <LandingAction
        href={`${import.meta.env.BASE_URL}editor/`}
        title="사이트에서 간단하게 편집하기"
        english="Edit on the Website"
        japanese="ウェブ上のカードメーカーで編集"
        description={
          <>
            ‘자기소개 카드 메이커’로 이미지, 텍스트를 쉽게 편집할 수 있어요.
            <br />
            편집이 어렵거나 빠르게 만들고싶은 분들은 사이트에서 만들어보세요!
          </>
        }
        iconSrc={inputFormIconUrl}
        iconWidth={106}
        iconHeight={80}
      />
    </nav>
  </main>
)
