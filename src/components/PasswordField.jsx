import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { AUTH_INPUT_CLASS_NAME } from "./authStyles"

export default function PasswordField({ label, ...inputProps }) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <label className="block text-sm font-black text-slate-800">
      {label}
      <div className="relative">
        <input
          {...inputProps}
          type={isVisible ? "text" : "password"}
          className={`${AUTH_INPUT_CLASS_NAME} pr-14`}
        />
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          className="absolute bottom-0 right-1 flex h-14 w-12 items-center justify-center rounded-[18px] text-slate-500"
          aria-label={isVisible ? "Passwort ausblenden" : "Passwort anzeigen"}
        >
          {isVisible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </label>
  )
}
