import { ArrowLeft, LogOut, ShieldCheck } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import AppBackground from "../components/AppBackground"
import { useAuth } from "../context/AuthContext"

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#e8ebe5] text-slate-950">
      <AppBackground />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-10 pt-5 sm:px-6 sm:pt-8">
        <header className="overflow-hidden rounded-[32px] border border-white/15 bg-[#071819] px-5 py-5 text-white shadow-[0_24px_60px_rgba(7,24,25,0.28)] sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400 text-[#071819]">
                <ShieldCheck size={23} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300">
                  Skinz Administration
                </p>
                <p className="truncate text-sm font-bold text-white/65">
                  {user?.displayName || user?.name || user?.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/"
                className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-black text-white backdrop-blur-xl transition-colors hover:bg-white/15"
              >
                <ArrowLeft size={18} />
                App
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition-colors hover:bg-white/15"
                aria-label="Abmelden"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="mt-5">{children}</main>
      </div>
    </div>
  )
}
