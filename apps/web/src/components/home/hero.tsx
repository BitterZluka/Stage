import Image from "next/image";
import { Button } from "../ui/button";
import { SurfaceCard } from "../ui/surface-card";

export function Hero() {
  return (
    <section
      className="relative mt-6 overflow-hidden rounded-3xl border-2 border-black shadow-offset sm:mt-10"
      style={{
        background:
          "linear-gradient(135deg,#d4f7ff 0%,#ede6ff 45%,#ffe0f2 100%)",
      }}
    >
      <div className="bg-pixel-grid pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden="true" />
      <div className="bg-scanlines pointer-events-none absolute inset-0 opacity-[0.03]" aria-hidden="true" />

      <div className="relative z-10 grid grid-cols-1 gap-10 p-6 sm:p-10 lg:grid-cols-2 lg:items-center lg:p-14">
        <div>
          <h1 className="font-display mb-6 text-4xl leading-[1.1] font-bold sm:text-5xl lg:text-[56px]">
            Your community
            <span className="text-holo-gradient block">deserves a stage.</span>
          </h1>
          <p className="mb-8 max-w-md text-lg leading-relaxed font-medium text-gray-700">
            Join creator challenges, share what you make, earn community
            credits, and unlock exclusive rewards.
          </p>
        </div>

        <div className="flex items-center justify-center">
            <Image
              src="/brand/IMG_1538.png"
              alt="STAGE mascot: a hand-drawn black-and-white rabbit with one ear up, next to a speech bubble reading STAGE"
              width={1782}
              height={1231}
              className="h-auto w-[700px] max-w-none scale-[1.35] -translate-x-7 rounded-2xl"
              priority
              sizes="(min-width: 1024px) 384px, 80vw"
            />
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 gap-6 p-6 pt-0 sm:p-10 sm:pt-0 md:grid-cols-2 lg:p-14 lg:pt-0">
        <SurfaceCard accent="var(--color-stage-cyan)" className="p-6 sm:p-7">
          <h3 className="font-display mb-2 text-xl font-bold">
            I&apos;m here to participate
          </h3>
          <p className="mb-6 text-sm leading-relaxed text-gray-600">
            Discover creators, join challenges, submit your work, earn
            credits, and unlock exclusive perks.
          </p>
          <Button href="/explore" variant="cyan" size="md">
            Explore as a fan
          </Button>
        </SurfaceCard>

        <SurfaceCard accent="var(--color-stage-lavender)" className="p-6 sm:p-7">
          <h3 className="font-display mb-2 text-xl font-bold">
            I&apos;m a creator
          </h3>
          <p className="mb-6 text-sm leading-relaxed text-gray-600">
            Launch challenges, reward your community, publish perks, and
            manage submissions.
          </p>
          <Button href="/studio" variant="lavender" size="md">
            Start as a creator
          </Button>
        </SurfaceCard>
      </div>
    </section>
  );
}
