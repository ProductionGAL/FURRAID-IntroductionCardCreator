import { UploadSimple, X } from "@phosphor-icons/react"
import { useEffect, useRef } from "react"
import type { PhotoCrop } from "../model"
import { CropEditor } from "./CropEditor"

type CropDialogProps = {
  readonly open: boolean
  readonly photo: PhotoCrop | null
  readonly onChange: (photo: PhotoCrop) => void
  readonly onDone: () => void
  readonly onClose: () => void
  readonly onPhotoFile: (file: File) => void
}

export const CropDialog = (props: CropDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (props.open && !dialog.open) {
      dialog.showModal()
      dialog.focus({ preventScroll: true })
    }
    if (!props.open && dialog.open) dialog.close()
  }, [props.open])

  return (
    <dialog
      ref={dialogRef}
      className="crop-dialog"
      tabIndex={-1}
      aria-labelledby="crop-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        props.onClose()
      }}
    >
      <div className="crop-dialog__header">
        <div>
          <span>1:1 PHOTO CROP</span>
          <h2 id="crop-dialog-title">사진 위치 맞추기</h2>
        </div>
        <button type="button" onClick={props.onClose} aria-label="사진 편집 닫기">
          <X aria-hidden size={22} />
        </button>
      </div>
      {props.photo ? (
        <CropEditor photo={props.photo} onChange={props.onChange} onDone={props.onDone} />
      ) : null}
      <label className="crop-dialog__replace">
        <UploadSimple aria-hidden size={18} />
        다른 사진 선택
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => {
            const file = event.currentTarget.files?.item(0)
            if (file) props.onPhotoFile(file)
            event.currentTarget.value = ""
          }}
        />
      </label>
    </dialog>
  )
}
