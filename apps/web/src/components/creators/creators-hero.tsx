export function CreatorsHero() {
  return (
    <section
      className="relative mt-6 overflow-hidden rounded-3xl border-2 border-black p-6 shadow-offset sm:mt-10 sm:p-10"
      style={{
        background:
          "linear-gradient(135deg,#d4f7ff 0%,#ede6ff 45%,#ffe0f2 100%)",
      }}
    >
      <div
        className="bg-pixel-grid pointer-events-none absolute inset-0 opacity-[0.07]"
        aria-hidden="true"
      />
      <div
        className="bg-scanlines pointer-events-none absolute inset-0 opacity-[0.03]"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-2xl">
        <span className="mb-4 inline-block rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-bold tracking-wide uppercase shadow-offset">
          Discover creator communities
        </span>
        <h1 className="font-display mb-4 text-3xl leading-[1.1] font-bold sm:text-4xl lg:text-5xl">
          Find creators{" "}
          <span className="text-holo-gradient">worth following</span>
        </h1>
        <p className="max-w-xl text-base leading-relaxed font-medium text-gray-700 sm:text-lg">
          Discover artists, musicians, bloggers, streamers, and creative
          communities. Join their challenges, earn community credits, and unlock
          exclusive perks.
        </p>
      </div>
    </section>
  );
}
