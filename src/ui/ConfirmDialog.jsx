import { useEffect, useId } from "react"
import { AnimatePresence, motion } from "framer-motion"
import Button from "./Button.jsx"

/**
 * Eigener Bestätigungsdialog im App-Stil, ersetzt window.confirm.
 * Bei `loading` sind Schließen und Bestätigen gesperrt.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Bestätigen",
  cancelLabel = "Abbrechen",
  tone = "default",
  loading = false,
  onConfirm,
  onCancel,
}) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return undefined

    function handleKeyDown(event) {
      if (event.key === "Escape" && !loading) onCancel()
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, loading, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[130] flex items-end justify-center bg-black/40 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-10 backdrop-blur-md sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !loading) onCancel()
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="glass-strong w-full max-w-sm rounded-[24px] p-6"
          >
            <h2 id={titleId} className="text-[1.5rem] font-bold leading-tight tracking-[-0.035em] text-ink">
              {title}
            </h2>
            {description && (
              <p className="mt-2 text-[15px] font-medium leading-relaxed text-ink-soft">{description}</p>
            )}
            <div className="mt-6 grid gap-2">
              <Button
                variant={tone === "danger" ? "danger" : "primary"}
                size="lg"
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? "Bitte warten …" : confirmLabel}
              </Button>
              <Button variant="glass" onClick={onCancel} disabled={loading}>
                {cancelLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
