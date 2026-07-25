import { redirect } from "next/navigation";

export const metadata = { title: "Creator Studio — STAGE" };

export default function StudioPage() {
  redirect("/studio/challenges");
}
