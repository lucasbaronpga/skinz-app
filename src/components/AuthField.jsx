import { AUTH_INPUT_CLASS_NAME } from "./authStyles"

export default function AuthField({ label, hint, ...inputProps }) {
  return (
    <label className="block text-sm font-black text-slate-800">
      {label}
      {hint && <span className="ml-2 text-xs font-bold text-slate-400">{hint}</span>}
      <input {...inputProps} className={AUTH_INPUT_CLASS_NAME} />
    </label>
  )
}
