import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Smriti OS — Industrial Memory Operating System";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          background: "linear-gradient(135deg, #070A13 0%, #0c111d 60%, #0d9488 200%)",
          color: "#e6edf6",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, #2dd4bf, #38bdf8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 700,
              color: "#070A13",
            }}
          >
            S
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>
            Smriti<span style={{ color: "#2dd4bf" }}>OS</span>
          </div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.03em", maxWidth: 900 }}>
          Industrial Memory
          <br />
          Operating System
        </div>
        <div style={{ marginTop: 28, fontSize: 26, color: "#9aa7bd", maxWidth: 800, lineHeight: 1.4 }}>
          Fusing P&amp;ID topology with experiential knowledge into a unified graph for heavy industry.
        </div>
        <div style={{ marginTop: 40, display: "flex", gap: 16, fontSize: 18, color: "#5eead4" }}>
          <span>· P&amp;ID Vision</span>
          <span>· Wilson-score Confidence</span>
          <span>· SSE + Telegram Alerts</span>
          <span>· FastMCP</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
