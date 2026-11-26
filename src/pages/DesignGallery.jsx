import { useState } from "react"
import { ArrowRight, Trophy } from "lucide-react"
import AppBackground from "../components/AppBackground"
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  EmptyState,
  HoleSketch,
  LeaderboardHeader,
  LeaderboardRow,
  ListRow,
  Pill,
  ScoreBadge,
  ScoreTile,
  ScreenHeader,
  Segmented,
  StatTile,
  Tabs,
  TopBar,
} from "../ui/index.js"
import { formatCents, formatSkinz } from "../utils/format.js"
import { getThemePreference, setThemePreference } from "../utils/theme.js"

const THEME_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "light", label: "Hell" },
  { value: "dark", label: "Dunkel" },
]

const TABS = [
  { value: "home", label: "Home" },
  { value: "standings", label: "Standings" },
  { value: "stats", label: "Stats" },
  { value: "players", label: "Players" },
]

const FILTERS = ["Alle", "Classic", "Professional", "Wolffn"]

const SCORE_SAMPLES = [
  { label: "Albatross", score: 2 },
  { label: "Eagle", score: 3 },
  { label: "Birdie", score: 3 },
  { label: "Par", score: 4 },
  { label: "Bogey", score: 5 },
  { label: "Double Bogey", score: 6 },
  { label: "Triple+", score: 7 },
]

const LEADERS = [
  { position: 1, name: "Max Mustermann", shortName: "MM", thru: "F", toPar: -4, earningsCents: 3600 },
  { position: 2, name: "Erika Beispiel", shortName: "EB", thru: "F", toPar: -1, earningsCents: 1200 },
  { position: "T3", name: "Jonas Fairway", shortName: "JF", thru: 14, toPar: 2, earningsCents: -1200, anonymous: true },
  { position: "T3", name: "Lena Birdie", shortName: "LB", thru: 14, toPar: 2, earningsCents: -3600, highlight: true },
]

const PALETTE = [
  { name: "Page", className: "bg-page" },
  { name: "Karte", className: "bg-card" },
  { name: "Fläche", className: "bg-fill" },
  { name: "Ink", className: "bg-ink" },
  { name: "Fairway", className: "bg-fairway" },
  { name: "Gold", className: "bg-gold" },
]

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-mute">
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function DesignGallery() {
  const [themePreference, setPreference] = useState(getThemePreference)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tab, setTab] = useState("home")
  const [filter, setFilter] = useState("Alle")

  function handleThemeChange(preference) {
    setThemePreference(preference)
    setPreference(preference)
  }

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden pb-[calc(9rem+env(safe-area-inset-bottom))] text-ink">
      <AppBackground />
      <div className="relative mx-auto max-w-md px-5 pt-[calc(1rem+env(safe-area-inset-top))]">
        <TopBar
          right={
            <Segmented
              className="w-52"
              label="Farbmodus"
              options={THEME_OPTIONS}
              value={themePreference}
              onChange={handleThemeChange}
            />
          }
        />

        <Tabs className="mt-4" label="Bereiche" tabs={TABS} value={tab} onChange={setTab} />

        <div className="-mx-5 mt-5 flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((name) => (
            <Chip key={name} selected={filter === name} onClick={() => setFilter(name)}>
              {name}
            </Chip>
          ))}
        </div>

        <ScreenHeader
          className="mt-8"
          eyebrow="Design-System · nur in der Entwicklung"
          title="Skinz im PGA-Stil"
          subtitle="Hell, flach, mit Haarlinien. Glas nur für Navigation und Dialoge."
        />

        <Section title="Live-Karte">
          <Card variant="hero" className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[13px] font-semibold uppercase tracking-[0.04em] text-white/60">
                  Classic · Weiherhof
                </div>
                <div className="mt-3 text-[2.4rem] font-bold leading-none tracking-[-0.045em]">
                  Loch 7
                </div>
              </div>
              <Pill tone="dark" className="bg-white/15 text-white">
                Live
              </Pill>
            </div>
            <div className="mt-6 grid grid-cols-2 items-end gap-3">
              <div>
                <div className="text-[2.1rem] font-bold leading-none tracking-[-0.05em] tabular-nums text-amber-300">
                  {formatSkinz(5)}
                </div>
                <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-white/55">
                  Deine Skinz
                </div>
              </div>
              <div className="text-right">
                <div className="text-[2.1rem] font-bold leading-none tracking-[-0.05em] tabular-nums text-amber-300">
                  {formatCents(1500)}
                </div>
                <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-white/55">
                  Earnings
                </div>
              </div>
            </div>
            <Button variant="glass" size="lg" className="mt-6 w-full justify-between">
              Weiterspielen
              <ArrowRight size={20} aria-hidden="true" />
            </Button>
          </Card>
        </Section>

        <Section title="Liste mit Vorschau">
          <div className="border-t border-line/10">
            <ListRow
              eyebrow="Gestern · Classic"
              title="Weiherhof A-Kurs: 3 Skinz Vorsprung im letzten Loch"
              meta="4 Spieler · 1 € pro Skin"
              thumbnail={<HoleSketch par={4} holeNumber={9} />}
            />
            <ListRow
              eyebrow="Vor 3 Tagen · Wolffn"
              title="Doppeltes Birdie sorgt für den Tagessieg"
              meta="4 Spieler · 2 € pro Skin"
              thumbnail={<HoleSketch par={5} holeNumber={4} />}
            />
          </div>
        </Section>

        <Section title="Loch-Ansicht">
          <Card className="overflow-hidden">
            <div className="h-36 px-2 pt-2">
              <HoleSketch par={4} holeNumber={7} />
            </div>
            <div className="grid grid-cols-3 gap-2 p-3">
              <StatTile label="Par" value="4" className="p-3" />
              <StatTile label="Länge" value="352 m" className="p-3" valueClassName="text-[1.3rem]" />
              <StatTile label="HCP" value="5" className="p-3" />
            </div>
          </Card>
        </Section>

        <Section title="Leaderboard">
          <LeaderboardHeader />
          <div>
            {LEADERS.map((leader) => (
              <LeaderboardRow key={leader.shortName} {...leader} />
            ))}
          </div>
          <p className="mt-3 text-xs font-medium leading-relaxed text-ink-mute">
            Unter Par ist rot wie auf der PGA Tour. Zeile 3 zeigt die anonyme Darstellung mit Kürzel.
          </p>
        </Section>

        <Section title="Ergebnisse in Scorekarten-Notation">
          <Card className="p-5">
            <div className="grid grid-cols-4 gap-x-2 gap-y-5">
              {SCORE_SAMPLES.map(({ label, score }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <ScoreTile score={score} label={label} />
                  <ScoreBadge label={label} className="px-1.5 text-[9px]" />
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-center">
              <ScoreTile score={3} label="Birdie" size="lg" />
            </div>
          </Card>
        </Section>

        <Section title="Buttons und Marken">
          <Card className="space-y-3 p-4">
            <Button variant="primary" size="lg" className="w-full">
              Runde starten
            </Button>
            <Button variant="accent" size="lg" className="w-full">
              Neue Runde
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="glass">Abbrechen</Button>
              <Button variant="danger" onClick={() => setDialogOpen(true)}>
                Dialog
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Pill>Classic</Pill>
              <Pill tone="positive">Aktiv</Pill>
              <Pill tone="warning">Pausiert</Pill>
              <Pill tone="negative">Gesperrt</Pill>
              <Pill tone="dark">Pro</Pill>
            </div>
          </Card>
        </Section>

        <Section title="Farben">
          <div className="grid grid-cols-3 gap-3">
            {PALETTE.map(({ name, className }) => (
              <div key={name} className="surface rounded-2xl p-2">
                <div className={`h-12 rounded-xl border border-line/10 ${className}`} />
                <div className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-mute">
                  {name}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Leerzustand">
          <EmptyState
            icon={Trophy}
            title="Noch keine Runden"
            description="Starte deine erste Runde, dann erscheinen hier Ergebnisse und Statistik."
            action={
              <Button variant="accent" size="lg">
                Runde starten
              </Button>
            }
          />
        </Section>
      </div>

      <ConfirmDialog
        open={dialogOpen}
        tone="danger"
        title="Match wirklich abbrechen?"
        description="Das laufende Match wird beendet und nicht gewertet."
        confirmLabel="Match abbrechen"
        cancelLabel="Weiterspielen"
        onConfirm={() => setDialogOpen(false)}
        onCancel={() => setDialogOpen(false)}
      />
    </div>
  )
}
