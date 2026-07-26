import { ChevronRight, Flag, MapPinned, ShieldCheck } from "lucide-react"
import { Link } from "react-router-dom"
import AdminLayout from "./AdminLayout"

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <section className="rounded-[32px] border border-white/70 bg-white/50 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-3xl sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-[#071819] text-emerald-300">
            <ShieldCheck size={24} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              Geschützter Bereich
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl">
              Administration
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              Zentrale Verwaltung für Golfclubs, Plätze und zukünftige administrative Funktionen der Skinz-App.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="px-1 text-sm font-black uppercase tracking-[0.16em] text-slate-500">
          Verwaltung
        </h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Link
            to="/admin/courses"
            className="rounded-[30px] border border-white/75 bg-white/60 p-5 shadow-lg shadow-slate-900/5 backdrop-blur-3xl transition-transform active:scale-[0.985]"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-emerald-100 text-emerald-800">
                  <MapPinned size={23} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-black text-slate-950">
                    Golfclubs & Plätze
                  </h3>
                  <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
                    Golfclubs zentral in Neon verwalten.
                  </p>
                </div>
              </div>
              <ChevronRight className="shrink-0 text-slate-300" size={22} />
            </div>
          </Link>

          <div className="rounded-[30px] border border-dashed border-slate-300/80 bg-white/35 p-5 backdrop-blur-2xl">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-slate-100 text-slate-500">
                <Flag size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-700">
                  Weitere Bereiche
                </h3>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
                  Benutzer, Runden und Audit-Logs folgen später.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AdminLayout>
  )
}
