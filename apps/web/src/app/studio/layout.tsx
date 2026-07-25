import type { ReactNode } from "react";
import { CreatorStudioShell } from "../../components/studio/creator-studio-shell";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <CreatorStudioShell>{children}</CreatorStudioShell>;
}
