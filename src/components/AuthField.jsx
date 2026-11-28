import { AUTH_INPUT_CLASS_NAME } from "./authStyles"

export default function AuthField({ label, hint, ...inputProps }) {
  return (
    <label className="block text-sm font-semibold text-ink">
      {label}
      {hint && <span className="ml-2 text-xs font-medium text-ink-mute">{hint}</span>}
      <input {...inputProps} className={AUTH_INPUT_CLASS_NAME} />
    </label>
  )
}
