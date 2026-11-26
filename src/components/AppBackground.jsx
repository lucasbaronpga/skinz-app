/**
 * Fairway-Hintergrund: Lichtstimmung, Mähstreifen und feine Höhenlinien.
 * Die Farben kommen aus den Design-Tokens (src/index.css) und folgen
 * automatisch dem Hell- oder Dunkelmodus.
 */
export default function AppBackground() {
  return (
    <div aria-hidden="true" className="skinz-bg">
      <div className="skinz-bg__stripes" />
      <div className="skinz-bg__contours" />
    </div>
  )
}
