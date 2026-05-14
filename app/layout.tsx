import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import dynamic from "next/dynamic";
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const font = Nunito({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
});

const ExitModal = dynamic(() => 
  import("@/components/modals/exit-modal").then((mod) => ({ default: mod.ExitModal })), 
  { loading: () => null }
);

const HeartsModal = dynamic(() => 
  import("@/components/modals/hearts-modal").then((mod) => ({ default: mod.HeartsModal })), 
  { loading: () => null }
);

const PracticeModal = dynamic(() => 
  import("@/components/modals/practice-modal").then((mod) => ({ default: mod.PracticeModal })), 
  { loading: () => null }
);

export const metadata: Metadata = {
  title: "Lingo",
  description: "Learn languages with fun and engaging lessons.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/" >
      <html lang="en">
        <body className={font.className}>
          <Toaster richColors position="top-right" />
          <ExitModal />
          <HeartsModal />
          <PracticeModal />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
