"use client";

import {
  IDKitRequestWidget,
  selfieCheckLegacy,
  type IDKitResult,
} from "@worldcoin/idkit";
import type { SelfieCheckRequestConfig } from "@stage/world/client";

export function SelfieCheckModal({
  request,
  open,
  onOpenChange,
  onVerify,
  onSuccess,
  onError,
}: {
  request: SelfieCheckRequestConfig;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (proof: IDKitResult) => Promise<void>;
  onSuccess: () => void;
  onError: (code: string) => void;
}) {
  return (
    <IDKitRequestWidget
      open={open}
      onOpenChange={onOpenChange}
      app_id={request.app_id}
      action={request.action}
      rp_context={request.rp_context}
      allow_legacy_proofs={request.allow_legacy_proofs}
      require_user_presence={request.require_user_presence}
      environment={request.environment}
      preset={selfieCheckLegacy({ signal: request.preset.signal })}
      handleVerify={onVerify}
      onSuccess={onSuccess}
      onError={(code) => onError(code)}
    />
  );
}
