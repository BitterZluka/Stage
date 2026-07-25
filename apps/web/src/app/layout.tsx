import type { ReactNode } from "react";
import { Righteous } from "next/font/google";
import { AuthProvider } from "../auth/auth-provider";
import { OnboardingModal } from "../components/onboarding-modal";
import { SiteHeader } from "../components/site-header";
import { PostLoginWorldModal } from "../components/world/post-login-world-modal";
import "./globals.css";

const righteous = Righteous({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-righteous",
});

export const metadata = {
  title: "STAGE — Your community deserves a stage.",
  description:
    "Join creator challenges, share what you make, earn community credits, and unlock exclusive rewards.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={righteous.variable}>
      <body>
        <AuthProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:border-2 focus:border-black focus:bg-white focus:px-4 focus:py-2 focus:font-bold"
          >
            Skip to content
          </a>
          <SiteHeader />
          <PostLoginWorldModal />
          <OnboardingModal />
          <main id="main-content">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
