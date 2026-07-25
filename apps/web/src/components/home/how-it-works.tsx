import { HOW_IT_WORKS_STEPS } from "../../content/homepage";
import { SurfaceCard } from "../ui/surface-card";

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-heading" className="mt-16 sm:mt-20">
      <h2
        id="how-it-works-heading"
        className="font-display mb-6 text-2xl font-bold sm:text-3xl"
      >
        How STAGE Works
      </h2>

      <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {HOW_IT_WORKS_STEPS.map((step, index) => (
          <li key={step.id}>
            <SurfaceCard accent={step.accent} className="h-full p-5">
              <div
                className="font-display mb-4 flex h-10 w-10 items-center justify-center rounded-full border-2 border-black font-bold"
                style={{ background: step.accent }}
                aria-hidden="true"
              >
                {index + 1}
              </div>
              <h3 className="font-display mb-2 text-base font-bold">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-600">
                {step.description}
              </p>
            </SurfaceCard>
          </li>
        ))}
      </ol>
    </section>
  );
}
