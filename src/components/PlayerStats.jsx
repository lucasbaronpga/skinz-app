import SeasonChart from "./SeasonChart"
import { Card, StatTile } from "../ui/index.js"
import cn from "../ui/cn.js"
import { getMoneyTextClass } from "../ui/scoreStyles.js"
import { formatCents } from "../utils/format.js"
import { describeBestRound, formatAverageToPar } from "../utils/stats.js"

function Section({ title, children }) {
  return (
    <section className="mt-9">
      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-mute">{title}</h2>
      {children}
    </section>
  )
}

/** Saisonstatistik eines Spielers: Kennzahlen, Verlauf und Scores. */
export default function PlayerStats({ stats }) {
  return (
    <>
      <Section title={`Saison ${stats.season}`}>
        <div className="grid grid-cols-3 gap-2">
          <StatTile
            label="Gewinn"
            value={formatCents(stats.earningsCents, { signed: true })}
            valueClassName={cn("text-[1.3rem]", getMoneyTextClass(stats.earningsCents))}
          />
          <StatTile label="Skinz" value={stats.skinz} />
          <StatTile label="Siege" value={stats.wins} />
          <StatTile label="Runden" value={stats.rounds} />
          <StatTile label="Platz" value={stats.position ?? "–"} />
          <StatTile label="Ø To Par" value={formatAverageToPar(stats.averageToPar18)} valueClassName="text-[1.3rem]" />
        </div>
      </Section>

      <Section title="Saisonverlauf">
        <Card className="p-4">
          <SeasonChart series={stats.series} />
        </Card>
      </Section>

      <Section title="Scores">
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Birdies" value={stats.birdies ?? 0} />
          <StatTile label="Eagles" value={stats.eagles ?? 0} />
          <StatTile label="Beste Runde" value={describeBestRound(stats.bestRound)} valueClassName="text-[1.15rem]" />
        </div>
        <p className="mt-2 text-xs font-medium text-ink-mute">Ø To Par auf 18 Löcher gerechnet, Eagles inklusive Albatross.</p>
      </Section>
    </>
  )
}
