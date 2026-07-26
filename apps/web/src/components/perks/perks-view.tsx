"use client";

import {
  ApiClaimService,
  ApiClientError,
  type CatalogPerk,
  type PerkPurchaseIntent,
} from "@creator-platform/api-client";
import type {
  HederaAccountId,
  HederaTokenId,
  PerkId,
  PerkPurchaseId,
} from "@creator-platform/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/auth-provider";
import { catalogService, perkAccent } from "../../lib/catalog";
import {
  associateHederaToken,
  spendHederaTokens,
} from "../../lib/hedera-wallet";
import {
  associateMetaMaskToken,
  spendMetaMaskTokens,
} from "../../lib/metamask-wallet";
import { CloseIcon, GiftIcon, VerifiedIcon, ZapIcon } from "../icons";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { SurfaceCard } from "../ui/surface-card";

export function PerksView() {
  const router = useRouter();
  const {
    session,
    loading: authLoading,
    worldVerified,
    worldVerificationLoading,
  } = useAuth();
  const [perks, setPerks] = useState<CatalogPerk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedPerk, setSelectedPerk] = useState<CatalogPerk | null>(null);
  const [requestedPerkHandled, setRequestedPerkHandled] = useState(false);
  const claimService = useMemo(
    () =>
      new ApiClaimService(
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1",
      ),
    [],
  );

  const loadPerks = useCallback(() => {
    setLoading(true);
    setError(false);
    catalogService
      .listPerks()
      .then(({ items }) => {
        const requestedPerkId = new URLSearchParams(window.location.search).get(
          "perk",
        );
        setPerks(
          [...items].sort((left, right) => {
            const requestedDifference =
              Number(right.id === requestedPerkId) -
              Number(left.id === requestedPerkId);
            if (requestedDifference !== 0) return requestedDifference;
            return (
              Number(right.source === "database") -
              Number(left.source === "database")
            );
          }),
        );
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const openPerk = useCallback(
    (perk: CatalogPerk) => {
      const remaining = Math.max(perk.inventory - perk.claimedCount, 0);
      if (
        perk.source !== "database" ||
        perk.status !== "active" ||
        remaining === 0
      ) {
        return;
      }
      if (!session) {
        router.push("/login");
        return;
      }
      if (perk.requiresWorldVerification && !worldVerified) {
        router.push("/eligibility");
        return;
      }
      setSelectedPerk(perk);
    },
    [router, session, worldVerified],
  );

  useEffect(() => {
    loadPerks();
  }, [loadPerks]);

  useEffect(() => {
    if (
      loading ||
      authLoading ||
      worldVerificationLoading ||
      requestedPerkHandled
    ) {
      return;
    }
    const requestedPerkId = new URLSearchParams(window.location.search).get(
      "perk",
    );
    setRequestedPerkHandled(true);
    if (!requestedPerkId || !session) return;
    const requestedPerk = perks.find((perk) => perk.id === requestedPerkId);
    if (requestedPerk) openPerk(requestedPerk);
  }, [
    authLoading,
    loading,
    openPerk,
    perks,
    requestedPerkHandled,
    session,
    worldVerificationLoading,
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 pb-24">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <Badge color="pink">Creator rewards</Badge>
          <h1 className="font-display mt-4 text-4xl font-bold sm:text-6xl">
            Community perks
          </h1>
          <p className="mt-4 max-w-2xl text-gray-600">
            Discover merch, digital drops, and experiences unlocked with creator
            tokens.
          </p>
        </div>
        {session && (
          <Button href="/my-perks" variant="ghost">
            View my purchased perks
          </Button>
        )}
      </div>

      {loading ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-3xl border-2 border-black bg-white/60"
            />
          ))}
        </div>
      ) : error ? (
        <div className="mt-10 rounded-3xl border-2 border-black bg-white p-8 text-center shadow-offset">
          <p className="font-display text-2xl font-bold">
            Perks could not be loaded
          </p>
          <Button className="mt-5" variant="ghost" onClick={loadPerks}>
            Try again
          </Button>
        </div>
      ) : perks.length === 0 ? (
        <div className="mt-10 rounded-3xl border-2 border-dashed border-black p-10 text-center">
          <p className="font-display text-2xl font-bold">No public perks yet</p>
          <p className="mt-2 text-gray-500">
            Creator rewards will appear here when available.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {perks.map((perk) => {
            const remaining = Math.max(perk.inventory - perk.claimedCount, 0);
            const accent = perkAccent(perk);
            const actionable =
              perk.source === "database" &&
              perk.status === "active" &&
              remaining > 0;
            const actionLabel = !session
              ? "Log in to redeem"
              : perk.requiresWorldVerification && !worldVerified
                ? "Verify to redeem"
                : `Redeem for ${perk.tokenThreshold} ${perk.tokenSymbol}`;
            return (
              <SurfaceCard
                key={perk.id}
                accent={accent}
                className={`flex flex-col p-6 ${actionable ? "group cursor-pointer transition-transform hover:-translate-y-1" : ""}`}
              >
                {actionable && (
                  <button
                    type="button"
                    aria-label={`${actionLabel}: ${perk.title}`}
                    className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-black"
                    onClick={() => openPerk(perk)}
                  />
                )}
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-black"
                    style={{
                      background: `linear-gradient(135deg, ${accent}, #fff)`,
                    }}
                  >
                    <GiftIcon size={20} />
                  </span>
                  <Badge color={perk.status === "active" ? "aqua" : "white"}>
                    {perk.source === "database" ? "Live perk" : "Preview"}
                  </Badge>
                </div>
                <p className="mt-5 text-xs font-bold text-gray-500">
                  {perk.creatorName}
                </p>
                <h2 className="font-display mt-1 text-xl font-bold">
                  {perk.title}
                </h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-600">
                  {perk.description}
                </p>
                <div className="mt-6 flex items-center justify-between border-t-2 border-black/10 pt-4">
                  <span className="flex items-center gap-1 text-sm font-bold">
                    <ZapIcon size={14} />
                    {Number(perk.tokenThreshold).toLocaleString()}{" "}
                    {perk.tokenSymbol}
                  </span>
                  <Badge color="lavender">{perk.category}</Badge>
                </div>
                <p className="mt-3 flex items-center gap-1 text-xs text-gray-500">
                  {perk.requiresWorldVerification && <VerifiedIcon size={12} />}
                  {remaining} remaining
                  {perk.requiresWorldVerification ? " · World verified" : ""}
                </p>
                <div className="pointer-events-none mt-5">
                  {perk.source === "demo" ? (
                    <Button variant="ghost" className="w-full" disabled>
                      Preview only
                    </Button>
                  ) : actionable ? (
                    <span
                      aria-hidden="true"
                      className="inline-flex w-full items-center justify-center rounded-xl border-2 border-black bg-gradient-to-br from-stage-cyan via-stage-pink to-stage-lavender px-5 py-2.5 text-sm font-bold shadow-offset transition-transform group-hover:-translate-y-0.5"
                    >
                      {actionLabel}
                    </span>
                  ) : (
                    <Button variant="ghost" className="w-full" disabled>
                      {remaining === 0 ? "Sold out" : "Not available"}
                    </Button>
                  )}
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      )}

      {selectedPerk && session && (
        <PerkPurchaseDialog
          perk={selectedPerk}
          accountIds={session.user.accountIds}
          service={claimService}
          onClose={() => setSelectedPerk(null)}
          onPurchased={() => {
            setPerks((current) =>
              current.map((perk) => {
                if (perk.id !== selectedPerk.id) return perk;
                const claimedCount = perk.claimedCount + 1;
                return {
                  ...perk,
                  claimedCount,
                  status:
                    claimedCount >= perk.inventory ? "exhausted" : perk.status,
                };
              }),
            );
          }}
        />
      )}
    </main>
  );
}

type PurchaseWallet = "metamask" | "hedera";

function objectMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const candidate of [
    record.message,
    record.reason,
    record.shortMessage,
  ]) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return objectMessage(record.data) ?? objectMessage(record.error);
}

function purchaseError(cause: unknown): string {
  if (cause instanceof ApiClientError) return cause.message;
  if (cause instanceof Error && cause.message.trim()) return cause.message;
  if (cause && typeof cause === "object") {
    const code = (cause as Record<string, unknown>).code;
    if (code === 4001 || code === "ACTION_REJECTED") {
      return "The transaction approval was cancelled in your wallet.";
    }
    const message = objectMessage(cause);
    if (message) return message;
    if (typeof code === "string" || typeof code === "number") {
      return `The wallet returned error ${String(code)} without details.`;
    }
  }
  if (typeof cause === "string" && cause.trim()) return cause.trim();
  return "The wallet did not provide an error reason. Check that the correct account and Hedera testnet are selected.";
}

function PerkPurchaseDialog({
  perk,
  accountIds,
  service,
  onClose,
  onPurchased,
}: {
  perk: CatalogPerk;
  accountIds: HederaAccountId[];
  service: ApiClaimService;
  onClose: () => void;
  onPurchased: () => void;
}) {
  const accountId = accountIds.find((candidate) =>
    /^0\.0\.\d+$/.test(candidate),
  );
  const [intent, setIntent] = useState<PerkPurchaseIntent | null>(null);
  const [transactionReference, setTransactionReference] = useState<
    string | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [associationRequired, setAssociationRequired] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function confirm(
    purchase: PerkPurchaseIntent,
    reference: string,
  ): Promise<void> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        await service.confirmPurchase(purchase.id as PerkPurchaseId, {
          transactionReference: reference,
        });
        onPurchased();
        setCompleted(true);
        setNotice(
          `Purchase confirmed on Hedera (${reference}). Your perk claim is ready for the creator to fulfill.`,
        );
        return;
      } catch (cause) {
        if (
          cause instanceof ApiClientError &&
          cause.code === "PAYMENT_NOT_INDEXED" &&
          attempt < 19
        ) {
          await new Promise((resolve) => window.setTimeout(resolve, 1_500));
          continue;
        }
        throw cause;
      }
    }
  }

  async function purchase(wallet: PurchaseWallet) {
    if (!accountId) {
      setError("A canonical Hedera account is required to purchase this perk.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    setAssociationRequired(false);
    let failureStage = "The purchase could not be started.";
    try {
      const purchaseIntent = await service.createPurchaseIntent(
        perk.id as PerkId,
        { accountId },
      );
      setIntent(purchaseIntent);
      if (purchaseIntent.status === "confirmed") {
        setCompleted(true);
        setNotice("You have already purchased this perk.");
        return;
      }
      failureStage = "The wallet transaction failed.";
      setNotice(
        `Approve the ${purchaseIntent.amount} ${perk.tokenSymbol} transfer in your wallet.`,
      );
      const reference =
        wallet === "metamask"
          ? await spendMetaMaskTokens(
              accountId,
              purchaseIntent.tokenId,
              purchaseIntent.destinationAccountId as HederaAccountId,
              purchaseIntent.amount,
            )
          : await spendHederaTokens(
              accountId,
              purchaseIntent.tokenId,
              purchaseIntent.destinationAccountId as HederaAccountId,
              purchaseIntent.amount,
            );
      setTransactionReference(reference);
      setNotice(
        `Payment submitted (${reference}). Waiting for Hedera Mirror Node confirmation…`,
      );
      failureStage = "The payment was submitted but could not be confirmed.";
      await confirm(purchaseIntent, reference);
    } catch (cause) {
      if (
        cause instanceof ApiClientError &&
        cause.code === "TOKEN_NOT_ASSOCIATED"
      ) {
        setAssociationRequired(true);
      }
      setError(`${failureStage} ${purchaseError(cause)}`);
    } finally {
      setBusy(false);
    }
  }

  async function associate(wallet: PurchaseWallet) {
    if (!accountId || !perk.creatorTokenId) return;
    setBusy(true);
    setError(null);
    try {
      if (wallet === "metamask") {
        await associateMetaMaskToken(
          accountId,
          perk.creatorTokenId as HederaTokenId,
        );
      } else {
        await associateHederaToken(
          accountId,
          perk.creatorTokenId as HederaTokenId,
        );
      }
      setAssociationRequired(false);
      setNotice("Token association confirmed. You can purchase the perk now.");
    } catch (cause) {
      setError(purchaseError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function retryConfirmation() {
    if (!intent || !transactionReference) return;
    setBusy(true);
    setError(null);
    try {
      await confirm(intent, transactionReference);
    } catch (cause) {
      setError(purchaseError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="perk-purchase-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-x-hidden overflow-y-auto rounded-3xl border-2 border-black bg-white shadow-offset"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-black bg-gradient-to-r from-stage-cyan to-stage-pink p-5 sm:p-6">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase">
              Hedera token purchase
            </p>
            <h2
              id="perk-purchase-title"
              className="font-display mt-1 text-2xl font-bold"
            >
              {perk.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close purchase"
            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-black bg-white"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="grid min-w-0 gap-4 p-5 sm:p-6">
          <div className="min-w-0 rounded-2xl border-2 border-black bg-stage-yellow/40 p-4">
            <p className="font-display text-3xl font-bold">
              {perk.tokenThreshold} {perk.tokenSymbol}
            </p>
            <p className="mt-1 text-sm text-gray-700">
              These tokens will be transferred from your wallet back to the
              Stage treasury. This is a real Hedera testnet transaction and
              requires your wallet approval.
            </p>
          </div>

          {notice && (
            <p className="min-w-0 rounded-xl border-2 border-black bg-stage-mint p-3 text-sm font-bold [overflow-wrap:anywhere]">
              {notice}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="min-w-0 rounded-xl border-2 border-black bg-stage-pink p-3 text-sm font-bold [overflow-wrap:anywhere]"
            >
              {error}
            </p>
          )}

          {associationRequired && perk.creatorTokenId && (
            <div className="rounded-2xl border-2 border-black p-4">
              <p className="text-sm font-bold">
                Associate {perk.tokenSymbol} before purchasing.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="mint"
                  disabled={busy}
                  onClick={() => void associate("metamask")}
                >
                  Associate with MetaMask
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void associate("hedera")}
                >
                  Use Hedera WalletConnect
                </Button>
              </div>
            </div>
          )}

          {transactionReference && error ? (
            <Button
              variant="holo"
              size="lg"
              disabled={busy}
              onClick={() => void retryConfirmation()}
            >
              {busy ? "Checking…" : "Retry payment confirmation"}
            </Button>
          ) : (
            !completed && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant="holo"
                  size="lg"
                  disabled={busy || associationRequired}
                  onClick={() => void purchase("metamask")}
                >
                  {busy ? "Working…" : "Pay with MetaMask"}
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  disabled={busy || associationRequired}
                  onClick={() => void purchase("hedera")}
                >
                  Pay with Hedera wallet
                </Button>
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}
