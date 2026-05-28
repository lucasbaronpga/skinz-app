export default function App() {
  return (
    <div className="min-h-screen bg-emerald-900 text-white">
      <div className="bg-gradient-to-br from-emerald-950 to-green-600 px-6 py-10 shadow-2xl">
        <div className="mx-auto max-w-md">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10 text-3xl">
              ⛳
            </div>

            <div>
              <h1 className="text-3xl font-black">
                Skinz
              </h1>

              <p className="text-sm text-emerald-100">
                Golf Skins Live Scoring
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-white/10 p-5">
            <p className="text-xs uppercase tracking-widest text-emerald-100">
              Aktive Runde
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Erster Golfclub Westpfalz
            </h2>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/10 p-3 text-center">
                <div className="text-2xl font-black">18</div>
                <div className="text-xs">Loch</div>
              </div>

              <div className="rounded-2xl bg-white/10 p-3 text-center">
                <div className="text-2xl font-black">2 €</div>
                <div className="text-xs">Einsatz</div>
              </div>

              <div className="rounded-2xl bg-white/10 p-3 text-center">
                <div className="text-2xl font-black">3</div>
                <div className="text-xs">Spieler</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-5 px-5 py-6">
        <div className="rounded-3xl bg-white p-5 text-slate-900 shadow-xl">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            Spiel-ID
          </p>

          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-3xl font-black">
              SKIN-4F9K
            </h2>

            <button className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
              Teilen
            </button>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Freunde können mit dieser ID der Runde beitreten.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 text-slate-900 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black">
              Spieler im Flight
            </h2>

            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
              LIVE
            </span>
          </div>

          <div className="space-y-3">
            {[
              {
                name: "Lucas",
                score: "Par",
                color: "bg-emerald-500",
              },
              {
                name: "Ben",
                score: "Bogey",
                color: "bg-blue-500",
              },
              {
                name: "Max",
                score: "Birdie",
                color: "bg-amber-400",
              },
            ].map((player) => (
              <div
                key={player.name}
                className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-full ${player.color}`}
                  />

                  <div>
                    <div className="font-bold">
                      {player.name}
                    </div>

                    <div className="text-sm text-slate-500">
                      {player.score}
                    </div>
                  </div>
                </div>

                <button className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white">
                  Score
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-amber-400 p-5 text-amber-950 shadow-2xl">
          <p className="text-xs font-bold uppercase tracking-widest">
            Carryover aktiv
          </p>

          <div className="mt-2 flex items-end justify-between">
            <div>
              <div className="text-5xl font-black">
                12 €
              </div>

              <div className="text-sm font-semibold">
                Aktueller Pot auf Loch 3
              </div>
            </div>

            <div className="rounded-2xl bg-white/40 px-4 py-2 text-sm font-bold">
              Par 3
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <button className="rounded-3xl bg-lime-400 py-5 text-lg font-black text-emerald-950 shadow-xl">
            Neue Runde erstellen
          </button>

          <button className="rounded-3xl bg-white py-5 text-lg font-black text-slate-900 shadow-xl">
            Livescoring öffnen
</button>
        </div>
      </div>
    </div>
  )
}