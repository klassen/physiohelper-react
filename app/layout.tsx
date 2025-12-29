import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PhysioHelper - Workout Tracker",
  description: "Track your physiotherapy workouts and progress",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
