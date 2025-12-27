import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"]
});

export const metadata: Metadata = {
  title: "PromptArch - AI Prompt Engineering Platform",
  description: "Transform vague ideas into production-ready prompts and PRDs",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

import LocaleProvider from "@/components/LocaleProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={roboto.className}>
        <LocaleProvider>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
