import { Flag, LayoutDashboard, LogOut, ShieldCheck, Users } from "lucide-react"
import { NavLink, useNavigate } from "react-router-dom"
import AppBackground from "../components/AppBackground"
import { useAuth } from "../context/AuthContext"

const NAV_ITEMS = [
  { to: "/admin", label: "Übersicht", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Benutzer", icon: Users },
  { to: "/admin/courses", label: "Golfplätze", icon: Flag },
]

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#e8ebe5] pb-12 text-slate-950">
      <AppBackground />
      <header className="relative border-b border-white/60 bg-white/35 backdrop-blur-3xl">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[#071819] text-white"><ShieldCheck size={21} /></div>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Skinz Administration</div>
              <div className="mt-1 truncate text-sm font-black text-slate-950">{user?.displayName || user?.name || user?.email}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => navigate("/")} className="min-h-11 rounded-[18px] border border-white/80 bg-white/70 px-4 text-sm font-black text-slate-600">Zur App</button>
            <button type="button" onClick={handleLogout} className="flex min-h-11 items-center gap-2 rounded-[18px] bg-[#071819] px-4 text-sm font-black text-white"><LogOut size={17} />Abmelden</button>
          </div>
        </div>
        <nav className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-5 pb-4" aria-label="Adminnavigation">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex min-h-11 shrink-0 items-center gap-2 rounded-[18px] px-4 text-sm font-black transition ${isActive ? "bg-emerald-500 text-white shadow-lg shadow-emerald-900/10" : "border border-white/80 bg-white/60 text-slate-600"}`}>
              <Icon size={17} />{label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="relative mx-auto w-full max-w-6xl px-5 pt-6">{children}</main>
    </div>
  )
}
