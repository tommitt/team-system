import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Preview card shown when the site URL is shared (WhatsApp, iMessage, X, Slack…).
// Mirrors the hero: dark radial background, DottComm wordmark, the "estensione di
// Claude" headline with the Claude word in the brand's --claude accent.

export const alt = "DottComm — L’estensione di Claude per i Commercialisti";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [semibold, logo] = await Promise.all([
    readFile(join(process.cwd(), "assets/BricolageGrotesque-600.woff")),
    readFile(join(process.cwd(), "public/logo.svg")),
  ]);
  const logoSrc = `data:image/svg+xml;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "radial-gradient(120% 90% at 50% -10%, #241f3f 0%, #131221 55%, #0f0e1a 100%)",
          fontFamily: "Bricolage",
          color: "#f4f2ff",
        }}
      >
        {/* brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={56} height={56} alt="" />
          <div style={{ display: "flex", fontSize: 34, letterSpacing: "-0.01em" }}>
            <span>Dott</span>
            <span style={{ color: "#8b82ff" }}>Comm</span>
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
            }}
          >
            <span>L’estensione di&nbsp;</span>
            <span style={{ color: "#d97757" }}>Claude</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              lineHeight: 1.04,
              letterSpacing: "-0.02em",
            }}
          >
            per i Commercialisti.
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              maxWidth: 720,
              fontSize: 27,
              lineHeight: 1.45,
              color: "rgba(244, 242, 255, 0.62)",
            }}
          >
            Aggiunge a Claude gli strumenti dello studio: F24, solleciti,
            scadenze, ravvedimenti. Tu controlli, correggi e approvi.
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 24,
            color: "rgba(244, 242, 255, 0.5)",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 10,
              height: 10,
              borderRadius: 10,
              background: "#33e7b0",
            }}
          />
          <span>www.dottcomm.dev</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Bricolage",
          data: semibold,
          weight: 600,
          style: "normal",
        },
      ],
    },
  );
}
