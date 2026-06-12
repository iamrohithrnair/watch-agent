import "./styles.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "WatchAgent",
  description: "M5Stack Stopwatch voice agent"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
