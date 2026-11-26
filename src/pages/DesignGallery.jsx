import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, Flag, Trophy } from "lucide-react"
import AppBackground from "../components/AppBackground"
import {
  Button,
  ConfirmDialog,
  EmptyState,
  GlassCard,
  HoleSketch,
  LeaderboardHeader,
  LeaderboardRow,
  Pill,
  ScoreBadge,
  ScoreTile,
  ScreenHeader,
  Segmented,
  StatTile,
} from "../ui/index.js"
import { formatCents, formatSkinz } from "../utils/format.js"
import { getThemePreference, setThemePreference } from "../utils/theme.js"

const THEME_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "light", label: "Hell" },
  { value: "dark", label: "Dunkel" },
]

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
  { name: "Ink", className: "bg-ink" },
  { name: "Fairway", className: "bg-fairway" },
  { name: "Fairway Deep", className: "bg-fairway-deep" },
  { name: "Sand", className: "bg-sand" },
  { name: "Gold", className: "bg-gold" },
]

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 px-1 text-[11px] font-black uppercase tracking-[0.26em] text-ink-mute">
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function DesignGallery() {
  const [themePreference, setPreference] = useState(getThemePreference)
  const [dialogOpen, setDialogOpen] = useState(false)

  function handleThemeChange(preference) {
    setThemePreference(preference)
    setPreference(preference)
  }

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden pb-[calc(10.5rem+env(safe-area-inset-bottom))] text-ink">
      <AppBackground />
      <div className="relative mx-auto max-w-md px-5 pt-10">
        <ScreenHeader
          eyebrow="Design-System"
          title="Skinz Look"
          subtitle="Liquid Glass mit dezentem Golf-Look. Nur in der Entwicklung sichtbar."
        />

        <Segmented
          className="mt-6"
          label="Farbmodus"
          options={THEME_OPTIONS}
          value={themePreference}
          onChange={handleThemeChange}
        />

        <Section title="Hero-Karte">
          <GlassCard variant="hero" className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-200/85">
                  Classic · Live
                </div>
                <div className="mt-5 text-[2.9rem] font-black uppercase leading-none tracking-[-0.045em]">
                  Loch 7
                </div>
              </div>
              <Pill tone="dark">Live</Pill>
            </div>
            <div className="mt-6 grid grid-cols-2 items-end gap-3">
              <div>
                <div className="text-[2.4rem] font-black leading-none tracking-[-0.07em] text-amber-300">
                  {formatSkinz(5)}
                </div>
                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Deine Skinz
                </div>
              </div>
              <div className="text-right">
                <div className="text-[2.4rem] font-black leading-none tracking-[-0.07em] text-amber-300">
                  {formatCents(1500)}
                </div>
                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Earnings
                </div>
              </div>
            </div>
            <Button variant="primary" size="lg" className="mt-6 w-full justify-between">
              Weiterspielen
              <ArrowRight size={20} aria-hidden="true" />
            </Button>
          </GlassCard>
        </Section>

        <Section title="Loch-Ansicht">
          <GlassCard className="overflow-hidden">
            <div className="h-36 px-2 pt-2">
              <HoleSketch par={4} holeNumber={7} />
            </div>
            <div className="grid grid-cols-3 gap-2 p-4 pt-1 text-center">
              <StatTile label="Par" value="4" className="p-3" />
              <StatTile label="Länge" value="352 m" className="p-3" valueClassName="text-[1.3rem]" />
              <StatTile label="HCP" value="5" className="p-3" />
            </div>
          </GlassCard>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[3, 4, 5].map((par) => (
              <GlassCard key={par} className="rounded-[24px] p-2">
                <div className="h-20">
                  <HoleSketch par={par} holeNumber={par} />
                </div>
                <div className="pb-1 text-center text-[10px] font-black uppercase tracking-[0.2em] text-ink-mute">
                  Par {par}
                </div>
              </GlassCard>
            ))}
          </div>
        </Section>

        <Section title="Leaderboard (PGA-Stil)">
          <LeaderboardHeader />
          <div className="space-y-2">
            {LEADERS.map((leader) => (
              <LeaderboardRow key={leader.shortName} {...leader} />
            ))}
          </div>
          <p className="mt-3 px-1 text-xs font-bold leading-relaxed text-ink-mute">
            Unter Par ist rot wie auf der PGA Tour und passt zum Birdie-Rot. Zeile 3 zeigt die
            anonyme Darstellung mit Kürzel.
          </p>
        </Section>

        <Section title="Ergebnisse">
          <GlassCard className="p-4">
            <div className="flex flex-wrap gap-3">
              {SCORE_SAMPLES.map(({ label, score }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <ScoreTile score={score} label={label} />
                  <ScoreBadge label={label} />
                </div>
              ))}
            </div>
          </GlassCard>
        </Section>

        <Section title="Buttons und Pillen">
          <GlassCard className="space-y-3 p-4">
            <Button variant="primary" size="lg" className="w-full">
              Runde starten
            </Button>
            <Button variant="accent" size="lg" className="w-full">
              <Flag size={20} aria-hidden="true" />
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
          </GlassCard>
        </Section>

        <Section title="Farben">
          <div className="grid grid-cols-3 gap-3">
            {PALETTE.map(({ name, className }) => (
              <div key={name} className="glass rounded-[22px] p-2">
                <div className={`h-12 rounded-[16px] ${className}`} />
                <div className="mt-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-ink-mute">
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

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-10 text-center text-xs font-bold text-ink-mute"
        >
          Alle Bausteine liegen in <code>src/ui</code>, die Farben in <code>src/index.css</code>.
        </motion.p>
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
