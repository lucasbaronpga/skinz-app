import { useEffect, useState } from "react"
import QRCode from "qrcode"

/** QR-Code des Einladungslinks. Wird lokal im Browser erzeugt. */
export default function InviteQrCode({ url }) {
  const [image, setImage] = useState({ url: "", src: "" })

  useEffect(() => {
    let isCancelled = false

    QRCode.toDataURL(url, {
      margin: 1,
      width: 480,
      errorCorrectionLevel: "M",
      color: { dark: "#0a0a0a", light: "#ffffff" },
    })
      .then((src) => {
        if (!isCancelled) setImage({ url, src })
      })
      .catch((error) => console.error("QR code failed.", error))

    return () => {
      isCancelled = true
    }
  }, [url])

  const isReady = image.url === url && image.src

  return (
    <div className="mx-auto w-full max-w-[15rem] rounded-2xl bg-white p-3 shadow-[var(--shadow-chip)]">
      {isReady ? (
        <img src={image.src} alt="QR-Code zum Beitreten" className="aspect-square w-full" />
      ) : (
        <div className="aspect-square w-full animate-pulse rounded-xl bg-slate-100" />
      )}
    </div>
  )
}
