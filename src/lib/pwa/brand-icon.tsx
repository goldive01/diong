// Shared visual for every generated Diong icon (favicon, apple touch icon,
// PWA manifest icons). Code-generated with next/og's ImageResponse rather
// than a checked-in image asset, so there is no third-party artwork and no
// binary to keep in sync across sizes — one monogram, rendered at whatever
// size each icon route requests. Placeholder only: see docs/PWA_PERFORMANCE.md
// for the production icon set this still needs to be replaced with.

export const DIONG_ICON_BACKGROUND = "#1d2420";
export const DIONG_ICON_FOREGROUND = "#f7f4ee";

export function brandMonogram(fontSize: number) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: DIONG_ICON_BACKGROUND,
        color: DIONG_ICON_FOREGROUND,
        fontSize,
        fontWeight: 700,
        fontFamily: "sans-serif",
      }}
    >
      D
    </div>
  );
}
