import { Check } from "@phosphor-icons/react"
import type { ChangeEvent, CSSProperties, Ref } from "react"
import frameUrl from "../assets/Frame.png"
import { getDisplayBox } from "../lib/crop"
import { getInlineFieldFontSize, getInlineFieldFontWeight } from "../lib/field-text"
import { DEFAULT_INTRODUCTION } from "../lib/introduction"
import type { CardContent, PhotoCrop, ScheduleId } from "../model"
import { SCHEDULES } from "../model"

type InlineCardEditorProps = {
  readonly editorRef: Ref<HTMLElement>
  readonly content: CardContent
  readonly photo: PhotoCrop | null
  readonly onContentChange: (content: CardContent) => void
  readonly onPhotoFile: (file: File) => void
  readonly onCropOpen: () => void
}

export const InlineCardEditor = (props: InlineCardEditorProps) => {
  const display = props.photo ? getDisplayBox(props.photo) : null
  const hasIntroduction = props.content.introduction.trim().length > 0
  const nicknameStyle: CSSProperties & {
    "--field-font-size": string
    "--field-font-weight": string
  } = {
    "--field-font-size": getInlineFieldFontSize(props.content.nickname),
    "--field-font-weight": getInlineFieldFontWeight(props.content.nickname),
  }
  const characterNameStyle: CSSProperties & {
    "--field-font-size": string
    "--field-font-weight": string
  } = {
    "--field-font-size": getInlineFieldFontSize(props.content.characterName),
    "--field-font-weight": getInlineFieldFontWeight(props.content.characterName),
  }

  const selectFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.currentTarget.files?.item(0)
    if (file) props.onPhotoFile(file)
    event.currentTarget.value = ""
  }

  const toggleSchedule = (id: ScheduleId): void => {
    const schedules = props.content.schedules.includes(id)
      ? props.content.schedules.filter((item) => item !== id)
      : [...props.content.schedules, id]
    props.onContentChange({ ...props.content, schedules })
  }

  return (
    <section ref={props.editorRef} className="inline-card" aria-label="자기소개카드 직접 편집 영역">
      <img className="inline-card__frame" src={frameUrl} alt="" aria-hidden />

      <div className="inline-card__photo">
        {props.photo && display ? (
          <>
            <img
              src={props.photo.url}
              alt="선택한 사진"
              draggable={false}
              style={{
                width: `${display.width * 100}%`,
                height: `${display.height * 100}%`,
                left: `${display.left * 100}%`,
                top: `${display.top * 100}%`,
              }}
            />
            <button
              className="inline-card__photo-edit"
              type="button"
              onClick={props.onCropOpen}
              aria-label="사진 위치 다시 맞추기"
            />
          </>
        ) : (
          <label className="inline-card__photo-upload">
            <span className="sr-only">사진 선택하기. JPG, PNG, WebP, GIF, 최대 200MB</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              required
              onChange={selectFile}
            />
          </label>
        )}
      </div>

      <input
        id="nickname"
        className={`inline-field inline-field--nickname${props.content.nickname ? " is-filled" : ""}`}
        aria-label="닉네임"
        style={nicknameStyle}
        value={props.content.nickname}
        maxLength={20}
        required
        onChange={(event) =>
          props.onContentChange({ ...props.content, nickname: event.currentTarget.value })
        }
      />
      <input
        id="character-name"
        className={`inline-field inline-field--character${props.content.characterName ? " is-filled" : ""}`}
        aria-label="캐릭터 이름 (선택)"
        style={characterNameStyle}
        value={props.content.characterName}
        maxLength={20}
        onChange={(event) =>
          props.onContentChange({ ...props.content, characterName: event.currentTarget.value })
        }
      />

      <fieldset className="inline-schedules">
        <legend className="sr-only">참가 일정 (필수, 하나 이상 선택)</legend>
        {SCHEDULES.map((schedule) => {
          const checked = props.content.schedules.includes(schedule.id)
          return (
            <label className="inline-schedule" key={schedule.id}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleSchedule(schedule.id)}
              />
              <span className={checked ? "is-checked" : ""}>
                {checked ? <Check aria-hidden weight="bold" /> : null}
              </span>
              <span className="sr-only">{schedule.label}</span>
            </label>
          )
        })}
      </fieldset>

      <textarea
        id="introduction"
        className={`inline-field inline-field--introduction${hasIntroduction ? " is-filled" : ""}`}
        aria-label="자기소개"
        value={props.content.introduction}
        maxLength={72}
        onChange={(event) =>
          props.onContentChange({ ...props.content, introduction: event.currentTarget.value })
        }
      />
      {!hasIntroduction ? (
        <div
          className="inline-field inline-field--introduction inline-field--introduction-default"
          aria-hidden
        >
          {DEFAULT_INTRODUCTION}
        </div>
      ) : null}
    </section>
  )
}
