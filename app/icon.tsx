import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: -1,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        L
      </div>
    ),
    { ...size },
  );
}
