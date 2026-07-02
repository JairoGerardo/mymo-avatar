import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Mymo Avatar — Next.js",
  description: "Mymo Avatar SDK demo with Next.js App Router",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
