"use client";

import type { CatalogCreatorProfile } from "@creator-platform/api-client";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { DiscoverCreator } from "../../content/creators";
import {
  catalogService,
  mapCatalogChallenge,
  mapCatalogCreator,
  perkAccent,
} from "../../lib/catalog";
import { ChallengeCard } from "../challenges/challenge-card";
import {
  CheckIcon,
  FlameIcon,
  GiftIcon,
  StarIcon,
  UsersIcon,
  ZapIcon,
} from "../icons";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { SurfaceCard } from "../ui/surface-card";
import { CreatorCategoryBadge } from "./creator-category-badge";
import { CreatorVerifiedBadge } from "./creator-verified-badge";
import { FollowButton } from "./follow-button";
import { formatFollowerCount } from "./format";

export function CreatorProfileView({ creatorSlug }: { creatorSlug: string }) {
  const [profile, setProfile] = useState<CatalogCreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadProfile = useCallback(() => {
    setLoading(true);
    setError(null);
    catalogService
      .getCreator(creatorSlug)
      .then((result) => {
        setProfile(result);
        if (!result)
          setError("This profile may have moved or is not public yet.");
      })
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not load this creator.",
        ),
      )
      .finally(() => setLoading(false));
  }, [creatorSlug]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12">
        <div className="h-96 animate-pulse rounded-3xl border-2 border-black bg-white/60" />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-4xl font-bold">Creator not found</h1>
        <p className="mt-3 text-gray-600">{error}</p>
        <Button onClick={loadProfile} variant="primary" className="mt-7">
          Try again
        </Button>
        <Button href="/creators" variant="ghost" className="mt-7">
          Browse creators
        </Button>
      </main>
    );
  }

  const creator = mapCatalogCreator(profile.creator);
  const challenges = profile.challenges.map(mapCatalogChallenge);
  const perks = profile.perks;

  async function shareProfile() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:py-12">
      <Button href="/creators" variant="ghost" size="sm">
        ← All creators
      </Button>

      <ProfileHero
        creator={creator}
        following={following}
        copied={copied}
        onFollow={() => setFollowing((value) => !value)}
        onShare={() => void shareProfile()}
      />

      <nav
        aria-label="Creator profile sections"
        className="mt-8 flex gap-2 overflow-x-auto border-b-2 border-black pb-3"
      >
        {[
          ["challenges", "Challenges"],
          ["perks", "Perks"],
          ["about", "About"],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="shrink-0 rounded-xl border-2 border-black bg-white px-5 py-2 text-sm font-bold hover:bg-black hover:text-white"
          >
            {label}
          </a>
        ))}
      </nav>

      <section id="challenges" className="scroll-mt-24 pt-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <Badge color="cyan">Join the community</Badge>
            <h2 className="font-display mt-3 text-3xl font-bold">
              Active challenges
            </h2>
          </div>
          <Button href="/challenges" variant="ghost" size="sm">
            Explore all
          </Button>
        </div>

        {challenges.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {challenges.slice(0, 3).map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        ) : (
          <SurfaceCard className="p-8 text-center">
            <p className="font-bold">No active challenges right now.</p>
            <p className="mt-1 text-sm text-gray-500">
              Follow {creator.displayName} to catch the next one.
            </p>
          </SurfaceCard>
        )}
      </section>

      <section id="perks" className="scroll-mt-24 pt-14">
        <div className="mb-6">
          <Badge color="pink">Token gated</Badge>
          <h2 className="font-display mt-3 text-3xl font-bold">
            Community perks
          </h2>
          <p className="mt-2 max-w-2xl text-gray-600">
            Hold {creator.tokenSymbol} tokens to unlock experiences from{" "}
            {creator.displayName}.
          </p>
        </div>

        {perks.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-3">
            {perks.slice(0, 3).map((perk, index) => {
              const color = perkAccent(perk);
              return (
                <SurfaceCard
                  key={perk.id}
                  accent={color}
                  className="flex flex-col p-5"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-black"
                    style={{
                      background: `linear-gradient(135deg, ${color}, #fff)`,
                    }}
                  >
                    <GiftIcon size={20} />
                  </div>
                  <p className="mt-4 text-xs font-bold tracking-widest text-gray-500 uppercase">
                    Perk {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="font-display mt-1 text-lg font-bold">
                    {perk.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">
                    {perk.description}
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t-2 border-black/10 pt-4">
                    <span className="flex items-center gap-1 text-sm font-bold">
                      <ZapIcon size={14} />{" "}
                      {Number(perk.tokenThreshold).toLocaleString()}{" "}
                      {perk.tokenSymbol}
                    </span>
                    <Badge color={perk.status === "active" ? "aqua" : "white"}>
                      {perk.status}
                    </Badge>
                  </div>
                </SurfaceCard>
              );
            })}
          </div>
        ) : (
          <SurfaceCard className="p-8 text-center">
            <p className="font-bold">No public perks right now.</p>
          </SurfaceCard>
        )}
      </section>

      <section
        id="about"
        className="grid scroll-mt-24 gap-8 pt-14 lg:grid-cols-[1fr_360px]"
      >
        <SurfaceCard className="p-6 sm:p-8">
          <Badge color="lavender">About</Badge>
          <h2 className="font-display mt-3 text-3xl font-bold">
            Meet {creator.displayName}
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-gray-600">
            {creator.bio}
          </p>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-600">
            Join the community to take part in creative challenges, collect
            rewards, and unlock experiences available directly from the creator.
          </p>

          <dl className="mt-8 grid gap-4 border-t-2 border-black/10 pt-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold tracking-wide text-gray-500 uppercase">
                Category
              </dt>
              <dd className="mt-1 font-bold">{creator.category}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold tracking-wide text-gray-500 uppercase">
                Member since
              </dt>
              <dd className="mt-1 font-bold">
                {new Intl.DateTimeFormat("en", {
                  month: "long",
                  year: "numeric",
                }).format(new Date(creator.createdAt))}
              </dd>
            </div>
          </dl>
        </SurfaceCard>

        <SurfaceCard accent={creator.accent} className="p-6">
          <p className="text-xs font-bold tracking-widest text-gray-500 uppercase">
            Creator token
          </p>
          <div className="mt-4 flex items-center gap-4">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-black font-bold"
              style={{ background: creator.accent }}
            >
              {creator.tokenSymbol.slice(0, 2)}
            </span>
            <div>
              <p className="font-display text-xl font-bold">
                {creator.tokenName}
              </p>
              <p className="text-sm font-bold text-gray-500">
                {creator.tokenSymbol}
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-gray-600">
            Earn tokens from challenges and use your balance to qualify for
            creator perks.
          </p>
          <Button href="/challenges" variant="holo" className="mt-6 w-full">
            Start earning
          </Button>
        </SurfaceCard>
      </section>
    </main>
  );
}

function ProfileHero({
  creator,
  following,
  copied,
  onFollow,
  onShare,
}: {
  creator: DiscoverCreator;
  following: boolean;
  copied: boolean;
  onFollow: () => void;
  onShare: () => void;
}) {
  return (
    <section
      className="relative mt-6 overflow-hidden rounded-3xl border-2 border-black shadow-offset"
      style={{
        background: `linear-gradient(135deg, ${creator.accent}, #ffffff 72%)`,
      }}
    >
      <div
        className="bg-pixel-grid pointer-events-none absolute inset-0 opacity-[0.06]"
        aria-hidden="true"
      />
      <div className="relative px-6 pt-12 pb-8 sm:px-10 sm:pt-16">
        <div className="flex flex-col gap-6 md:flex-row md:items-end">
          <span className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-2 border-black bg-white font-display text-3xl font-bold shadow-offset sm:h-36 sm:w-36 sm:text-4xl">
            {creator.avatarInitials}
          </span>

          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <CreatorCategoryBadge category={creator.category} />
              {creator.verified && <CreatorVerifiedBadge />}
              {creator.trending && (
                <Badge color="yellow">
                  <FlameIcon size={12} /> Trending
                </Badge>
              )}
            </div>
            <h1 className="font-display text-4xl leading-tight font-bold sm:text-6xl">
              {creator.displayName}
            </h1>
            <p className="mt-1 font-bold text-black/55">{creator.username}</p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-black/70">
              {creator.bio}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-3">
            <FollowButton
              displayName={creator.displayName}
              following={following}
              onToggle={onFollow}
              size="md"
            />
            <Button variant="ghost" onClick={onShare}>
              {copied ? (
                <>
                  <CheckIcon size={14} /> Copied
                </>
              ) : (
                "Share"
              )}
            </Button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 border-t-2 border-black/15 pt-6 sm:grid-cols-4">
          <ProfileStat
            icon={<UsersIcon size={17} />}
            value={formatFollowerCount(
              creator.followersCount + (following ? 1 : 0),
            )}
            label="Followers"
          />
          <ProfileStat
            icon={<FlameIcon size={17} />}
            value={String(creator.activeChallengesCount)}
            label="Challenges"
          />
          <ProfileStat
            icon={<GiftIcon size={17} />}
            value={String(creator.perksCount)}
            label="Perks"
          />
          <ProfileStat
            icon={<StarIcon size={17} />}
            value={creator.tokenSymbol}
            label="Creator token"
          />
        </div>
      </div>
    </section>
  );
}

function ProfileStat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-black bg-white/75 p-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-display text-xl font-bold">{value}</span>
      </div>
      <p className="mt-1 text-xs font-bold text-gray-500">{label}</p>
    </div>
  );
}
