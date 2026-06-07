export default function AppBackground() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_8%,rgba(255,255,255,0.96),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(16,185,129,0.20),transparent_32%),radial-gradient(circle_at_48%_82%,rgba(234,179,8,0.16),transparent_36%)]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-white/[0.18] shadow-[inset_0_1px_1px_rgba(255,255,255,0.75)] backdrop-blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.42),rgba(255,255,255,0.08)_45%,rgba(255,255,255,0.24))]"
      />
    </>
  )
}