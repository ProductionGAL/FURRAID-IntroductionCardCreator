import { WarningCircle, XLogoIcon } from "@phosphor-icons/react"
import { useEffect, useRef, useState } from "react"
import frameUrl from "./assets/Frame.png"
import logoUrl from "./assets/furraid2026_left_logo.png"
import downloadIconUrl from "./assets/Icon_Download2.svg"
import { CropDialog } from "./components/CropDialog"
import { InlineCardEditor } from "./components/InlineCardEditor"
import { downloadCardImage, shareCardImage } from "./lib/card-output"
import { createPhotoCrop, isGifFile } from "./lib/image-file"
import { renderCardBlob } from "./lib/render-card-blob"
import type { CardContent, CardValidationIssue, PhotoCrop } from "./model"
import { EMPTY_CONTENT, getCardValidationIssue } from "./model"

const VALIDATION_MESSAGES = {
  photo: "사진을 업로드해 주세요.",
  nickname: "닉네임을 입력해 주세요.",
  schedule: "참가 일정을 최소 하루 이상 선택해 주세요.",
} as const satisfies Record<CardValidationIssue, string>

const VALIDATION_TARGETS = {
  photo: '.inline-card__photo input[type="file"]',
  nickname: "#nickname",
  schedule: ".inline-schedule input",
} as const satisfies Record<CardValidationIssue, string>

type SaveActionProps = {
  readonly disabled: boolean
  readonly onClick: () => void
}

const SaveAction = ({ disabled, onClick }: SaveActionProps) => (
  <button className="save-action" type="button" onClick={onClick} disabled={disabled}>
    <span>이미지 저장</span>
    <small>
      Save Image
      <br />
      カード保存
    </small>
    <span className="save-action__icon" aria-hidden>
      <img src={downloadIconUrl} alt="" width="30" height="30" />
    </span>
  </button>
)

const ShareAction = ({ disabled, onClick }: SaveActionProps) => (
  <button className="save-action share-action" type="button" onClick={onClick} disabled={disabled}>
    <span>X로 공유</span>
    <small>
      Share to X
      <br />
      Xで共有
    </small>
    <span className="save-action__icon" aria-hidden>
      <XLogoIcon weight="regular" />
    </span>
  </button>
)

const PrivacyCopy = ({ className }: { readonly className: string }) => (
  <section className={className} aria-label="개인정보 처리 안내">
    <p>
      <span>첨부한 이미지와 입력한 내용은 서버를 거치지 않고,</span>
      <br />
      <span>사용자의 컴퓨터에서만 처리됩니다.</span>
    </p>
    <p>
      <span>The uploaded image and the information you</span>
      <br />
      <span>enter are processed entirely on your computer</span>
      <br />
      <span>and are never sent through our server.</span>
    </p>
    <p>
      <span>添付した画像および入力内容は、サーバーへ送信され</span>
      <br />
      <span>ず、お使いの端末内でのみ処理されます。</span>
    </p>
  </section>
)

const ErrorToast = ({ message }: { readonly message: string }) => {
  const toastRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const toast = toastRef.current
    if (!toast || typeof toast.showPopover !== "function") return
    if (!toast.matches(":popover-open")) toast.showPopover()
    return () => {
      if (toast.matches(":popover-open")) toast.hidePopover()
    }
  }, [])

  return (
    <div
      ref={toastRef}
      className="upload-error"
      role="alert"
      aria-live="assertive"
      popover="manual"
    >
      <WarningCircle aria-hidden weight="fill" />
      <span>{message}</span>
    </div>
  )
}

const GifExportProgress = ({ progress }: { readonly progress: number }) => {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress / 100)

  return (
    <div
      className="export-progress"
      role="progressbar"
      aria-label="GIF 이미지 생성 진행률"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
    >
      <svg viewBox="0 0 96 96" aria-hidden>
        <title>GIF 이미지 생성 진행률</title>
        <circle className="export-progress__track" cx="48" cy="48" r={radius} />
        <circle
          className="export-progress__value"
          cx="48"
          cy="48"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <strong>{progress}%</strong>
      <span>GIF 생성 중</span>
    </div>
  )
}

export const App = () => {
  const [content, setContent] = useState<CardContent>(EMPTY_CONTENT)
  const [photo, setPhoto] = useState<PhotoCrop | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const [gifExportProgress, setGifExportProgress] = useState<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const editorRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const url = photo?.url
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [photo?.url])

  useEffect(() => {
    if (!uploadError) return
    const timeout = window.setTimeout(() => setUploadError(""), 3600)
    return () => window.clearTimeout(timeout)
  }, [uploadError])

  const handlePhotoFile = (file: File): void => {
    setUploadError("")
    void createPhotoCrop(file)
      .then((nextPhoto) => {
        setPhoto(nextPhoto)
        setCropOpen(true)
        if (isGifFile(file)) {
          setUploadError("경고: GIF 저장은 실험중인 기능으로 정상동작하지 않을 수 있습니다.")
        }
      })
      .catch((error: unknown) => {
        setUploadError(error instanceof Error ? error.message : "사진을 불러오지 못했습니다.")
      })
  }

  const validateContent = (): boolean => {
    const issue = getCardValidationIssue(content, photo !== null)
    if (!issue) {
      setUploadError("")
      return true
    }

    setUploadError(VALIDATION_MESSAGES[issue])
    document.querySelector<HTMLInputElement>(VALIDATION_TARGETS[issue])?.focus()
    return false
  }

  const renderCurrentCard = async (
    canvas: HTMLCanvasElement,
    source: HTMLElement,
    currentPhoto: PhotoCrop,
  ): Promise<Blob> => {
    const isGif = isGifFile(currentPhoto.file)
    if (isGif) setGifExportProgress(0)
    try {
      return await renderCardBlob({
        canvas,
        frameUrl,
        photo: currentPhoto,
        source,
        ...(isGif ? { onProgress: setGifExportProgress } : {}),
      })
    } finally {
      if (isGif) setGifExportProgress(null)
    }
  }

  const exportCard = async (): Promise<void> => {
    if (isExporting || !validateContent()) return
    if (!photo) return
    const canvas = canvasRef.current
    const source = editorRef.current
    if (!canvas || !source) return
    setIsExporting(true)
    try {
      downloadCardImage(await renderCurrentCard(canvas, source, photo))
    } catch {
      setUploadError("이미지를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.")
    } finally {
      setIsExporting(false)
    }
  }

  const shareCurrentCard = async (): Promise<void> => {
    if (isExporting || !validateContent()) return
    if (!photo) return
    const canvas = canvasRef.current
    const source = editorRef.current
    if (!canvas || !source) return
    setIsExporting(true)
    try {
      const blob = await renderCurrentCard(canvas, source, photo)
      const result = await shareCardImage({ blob, content })
      if (result === "unavailable") {
        setUploadError(
          "이 브라우저에서는 이미지 공유를 지원하지 않습니다. 이미지 저장을 이용해 주세요.",
        )
      }
    } catch (error: unknown) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setUploadError("카드를 공유하지 못했습니다. 잠시 후 다시 시도해 주세요.")
      }
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="poster-app">
      <aside className="intro-panel">
        <div className="intro-panel__brand">
          <img src={logoUrl} alt="FUR:RAID 2026 FIELDTRIP" width="693" height="499" />
          <h1>
            <span className="desktop-title">자기소개 카드 메이커</span>
            <span className="mobile-title">자기소개 카드</span>
          </h1>
          <p>
            Self Introduction Card Generator
            <br />
            自己紹介カードメーカー
          </p>
        </div>
        <div className="desktop-save">
          <SaveAction disabled={isExporting} onClick={() => void exportCard()} />
        </div>
        <PrivacyCopy className="privacy-copy privacy-copy--desktop" />
      </aside>

      <main className="editor-stage">
        <InlineCardEditor
          editorRef={editorRef}
          content={content}
          photo={photo}
          onContentChange={setContent}
          onPhotoFile={handlePhotoFile}
          onCropOpen={() => setCropOpen(true)}
        />
      </main>

      <section className="mobile-save" aria-label="카드 저장 및 공유">
        <SaveAction disabled={isExporting} onClick={() => void exportCard()} />
        <ShareAction disabled={isExporting} onClick={() => void shareCurrentCard()} />
      </section>
      <PrivacyCopy className="privacy-copy privacy-copy--mobile" />

      {uploadError ? <ErrorToast key={uploadError} message={uploadError} /> : null}
      {gifExportProgress === null ? null : <GifExportProgress progress={gifExportProgress} />}

      <CropDialog
        open={cropOpen}
        photo={photo}
        onChange={setPhoto}
        onDone={() => setCropOpen(false)}
        onClose={() => setCropOpen(false)}
        onPhotoFile={handlePhotoFile}
      />
      <canvas ref={canvasRef} className="export-canvas" aria-hidden />
    </div>
  )
}
