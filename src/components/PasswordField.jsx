import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { AUTH_INPUT_CLASS_NAME } from "./authStyles"

export default function PasswordField({ label, ...inputProps }) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <label className="block text-sm font-semibold text-ink">
      {label}
      <div className="relative">
        <input
          {...inputProps}
          type={isVisible ? "text" : "password"}
          className={`${AUTH_INPUT_CLASS_NAME} pr-12`}
        />
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          className="absolute bottom-0 right-0 flex h-12 w-12 items-center justify-center rounded-2xl text-ink-mute"
          aria-label={isVisible ? "Passwort ausblenden" : "Passwort anzeigen"}
        >
          {isVisible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
        </button>
      </div>
    </label>
  )
}
