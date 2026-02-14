import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "ProjectPulse",
  description:
    "ProjectPulse helps teams stay organized and deliver projects faster.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-display">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
