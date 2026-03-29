
import Image from "next/image";
import {
  ClerkLoaded,
  ClerkLoading,
  Show,
  SignUpButton,
  SignInButton,
} from "@clerk/nextjs";
import { Loader } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function Home() {
  return (
    <div className="max-w-247 mx-auto flex-1 w-full flex flex-col lg:flex-row items-center justify-center p-4 gap-2">
      <div className="relative w-60 h-60 lg:w-106 lg:h-106 mb-8 lg:mb-0">
        <Image src="/hero.svg" alt="Hero" fill />
      </div>
      <div className="flex flex-col items-center gap-y-8">
        <h1 className="text-xl lg:text-3xl font-bold text-neutral-600 max-w-120 text-center">
          Learn, practice, and master new languages with Lingo.
        </h1>
        <div className="flex flex-col items-center gap-y-3 max-w-82.5 w-full">
          <ClerkLoading>
            <Loader className="h-5 w-5 text-muted-foreground animate-spin"></Loader>
          </ClerkLoading>
          <ClerkLoaded>
            <Show when='signed-in'>
              <Button size="lg" variant="secondary" className="w-full" asChild>
                <Link href="/learn">
                Continue Learning
                </Link>
              </Button>
            </Show>
            <Show when='signed-out'>
              <SignUpButton
                mode="modal"
                fallbackRedirectUrl="/learn"
              >
                <Button size="lg" variant="secondary" className="w-full">
                  Get Started
                </Button>
              </SignUpButton>
              <SignInButton
                mode="modal"
                fallbackRedirectUrl="/learn"
              >
                <Button size="lg" variant="primaryOutline" className="w-full">
                  I already have an account
                </Button>
              </SignInButton>
            </Show>
            <Button>
              <Link href="/admin">Admin Panel</Link>
            </Button>
          </ClerkLoaded>
        </div>
      </div>
    </div>
  )
}

