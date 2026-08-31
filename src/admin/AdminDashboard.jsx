import { ArrowRight, Flag, ShieldCheck, Users } from "lucide-react"
import { Link } from "react-router-dom"
import AdminLayout from "./AdminLayout"

const AREAS = [
  { to: "/admin/users", title: "Benutzer", text: "Registrierungen prüfen, freigeben, sperren und reaktivieren.", icon: Users, accent: "bg-emerald-500 text-white" },
  { to: "/admin/courses", title: "Golfclubs & Plätze", text: "Golfclubs, Plätze sowie Par- und Handicap-Daten zentral pflegen.", icon: Flag, accent: "bg-[#071819] text-white" },
]

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <section className="overflow-hidden rounded-[34px] border border-white/20 bg-[#071819] p-6 text-white shadow-[0_24px_62px_rgba(7,24,25,0.32)] sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Geschützter Bereich</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">Administration</h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-300">Benutzer und Golfplatzdaten kompakt, sicher und zentral verwalten.</p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-white/10"><ShieldCheck size={27} /></div>
        </div>
      </section>
      <section className="mt-5 grid gap-4 md:grid-cols-2">
        {AREAS.map(({ to, title, text, icon: Icon, accent }) => (
          <Link key={to} to={to} className="group rounded-[30px] border border-white/70 bg-white/55 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-3xl transition active:scale-[0.99] sm:p-6">
            <div className={`flex h-12 w-12 items-center justify-center rounded-[19px] ${accent}`}><Icon size={22} /></div>
            <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-slate-950">{title}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{text}</p>
            <div className="mt-5 flex items-center justify-between rounded-[18px] bg-white/70 px-4 py-3 text-sm font-black text-slate-700">Öffnen <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" /></div>
          </Link>
        ))}
      </section>
    </AdminLayout>
  )
}
