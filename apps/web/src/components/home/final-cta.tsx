import { Button } from "../ui/button";

export function FinalCta() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="relative mt-16 overflow-hidden rounded-3xl border-2 border-black p-8 text-center shadow-offset sm:mt-20 sm:p-14"
      style={{
        background:
          "linear-gradient(135deg, var(--color-stage-cyan) 0%, var(--color-stage-lavender) 50%, var(--color-stage-pink) 100%)",
      }}
    >
      <div
        className="bg-scanlines pointer-events-none absolute inset-0 opacity-[0.05]"
        aria-hidden="true"
      />

      <div className="relative z-10">
        <h2
          id="final-cta-heading"
          className="font-display mb-4 text-3xl font-bold text-white sm:text-4xl"
          style={{ textShadow: "2px 2px 0 rgba(0,0,0,0.25)" }}
        >
          Your stage is waiting.
        </h2>
        <p className="mx-auto mb-8 max-w-lg text-lg font-medium text-white/90">
          Whether you&apos;re here to join the community or build one, STAGE has
          a place for you.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button href="/explore" variant="primary" size="lg">
            Explore as a fan
          </Button>
          <Button href="/studio" variant="ghost" size="lg">
            Start as a creator
          </Button>
        </div>
      </div>
    </section>
  );
}
