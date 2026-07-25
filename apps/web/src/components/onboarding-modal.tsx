"use client";

import { ApiClientError } from "@creator-platform/api-client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/auth-provider";
import { Button } from "./ui/button";

export function OnboardingModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const {
    session,
    worldVerificationLoading,
    worldVerified,
    worldVerificationDismissed,
    completeOnboarding,
  } = useAuth();
  const [mode, setMode] = useState<"choice" | "creator">("choice");
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open =
    session?.user.onboardingRequired === true &&
    !worldVerificationLoading &&
    (worldVerified || worldVerificationDismissed);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      setMode("choice");
      setHandle("");
      setDisplayName("");
      setError(null);
    }
  }, [open]);

  async function chooseFan() {
    setSubmitting(true);
    setError(null);
    try {
      await completeOnboarding({ intent: "fan" });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not finish onboarding.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function createCreator() {
    setSubmitting(true);
    setError(null);
    try {
      await completeOnboarding({
        intent: "creator",
        handle,
        displayName,
      });
    } catch (cause) {
      setError(
        cause instanceof ApiClientError && cause.code === "HANDLE_TAKEN"
          ? "This creator handle is already taken."
          : cause instanceof Error
            ? cause.message
            : "Could not create the creator profile.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => event.preventDefault()}
      aria-labelledby="onboarding-title"
      className="m-auto w-full max-w-md rounded-3xl border-2 border-black bg-white p-0 shadow-offset backdrop:bg-black/55 backdrop:backdrop-blur-sm"
    >
      <div className="rounded-t-3xl border-b-2 border-black bg-gradient-to-br from-stage-aqua to-stage-lavender p-6">
        <h2 id="onboarding-title" className="font-display text-2xl font-bold">
          Welcome to STAGE
        </h2>
        <p className="mt-2 text-sm text-gray-700">
          Choose how you want to start. You can become a creator later at any
          time.
        </p>
      </div>

      {mode === "choice" ? (
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void chooseFan()}
            className="rounded-2xl border-2 border-black bg-stage-aqua p-5 text-left shadow-offset transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <span className="font-display text-xl font-bold">Fan</span>
            <span className="mt-2 block text-sm">
              Follow creators, join challenges, and earn rewards.
            </span>
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => setMode("creator")}
            className="rounded-2xl border-2 border-black bg-stage-lavender p-5 text-left shadow-offset transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            <span className="font-display text-xl font-bold">Creator</span>
            <span className="mt-2 block text-sm">
              Build a profile, launch challenges, and grow a community.
            </span>
          </button>
          {error && (
            <p role="alert" className="text-sm text-red-700 sm:col-span-2">
              {error}
            </p>
          )}
        </div>
      ) : (
        <form
          className="flex flex-col gap-4 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void createCreator();
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Display name
            <input
              required
              minLength={2}
              maxLength={60}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your creator name"
              className="rounded-xl border-2 border-black px-4 py-3 font-normal"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Handle
            <input
              required
              minLength={3}
              maxLength={30}
              pattern="[a-z0-9][a-z0-9_-]{2,29}"
              value={handle}
              onChange={(event) => setHandle(event.target.value.toLowerCase())}
              placeholder="creator_handle"
              className="rounded-xl border-2 border-black px-4 py-3 font-normal"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              disabled={submitting}
              onClick={() => setMode("choice")}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="holo"
              className="flex-1"
              disabled={submitting}
            >
              {submitting ? "Creating…" : "Create profile"}
            </Button>
          </div>
        </form>
      )}
    </dialog>
  );
}
