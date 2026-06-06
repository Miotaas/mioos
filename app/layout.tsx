import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MioOS — Personal AI Operating System",
  description: "Your personal AI command center",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-void text-text-primary antialiased overflow-hidden h-screen">
        {children}
      </body>
    </html>
  );
}
