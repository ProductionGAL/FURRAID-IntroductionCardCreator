import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: "primary" | "secondary" | "ghost"
  readonly children: ReactNode
}

export const Button = ({ variant = "secondary", className = "", ...props }: ButtonProps) => (
  <button className={`button button--${variant} ${className}`.trim()} {...props} />
)

type FieldProps = {
  readonly id: string
  readonly label: string
  readonly value: string
  readonly placeholder: string
  readonly maxLength: number
  readonly multiline?: boolean
  readonly onChange: (value: string) => void
}

export const Field = (props: FieldProps) => {
  const shared: InputHTMLAttributes<HTMLInputElement> = {
    id: props.id,
    value: props.value,
    placeholder: props.placeholder,
    maxLength: props.maxLength,
    onChange: (event) => props.onChange(event.currentTarget.value),
  }

  return (
    <div className="field">
      <div className="field__label-row">
        <label htmlFor={props.id}>{props.label}</label>
        <span title={`${props.maxLength}자 중 ${props.value.length}자 입력`}>
          {props.value.length}/{props.maxLength}
        </span>
      </div>
      {props.multiline ? (
        <textarea
          id={props.id}
          value={props.value}
          placeholder={props.placeholder}
          maxLength={props.maxLength}
          rows={5}
          onChange={(event) => props.onChange(event.currentTarget.value)}
        />
      ) : (
        <input {...shared} />
      )}
    </div>
  )
}
