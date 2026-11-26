/** Fügt Klassennamen zusammen und ignoriert leere Werte. */
export default function cn(...classes) {
  return classes.filter(Boolean).join(" ")
}
