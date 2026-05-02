import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#f43f5e",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 124,
          fontWeight: 700,
          letterSpacing: -6,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        L
      </div>
    ),
    { ...size },
  );
}
