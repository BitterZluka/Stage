# World Selfie Check Beta testing

This document records developer and user feedback gathered while integrating
World Selfie Check into STAGE. It is a qualitative exploratory report, not a
formal usability study. No participant count, completion rate, or production
availability claim is fabricated.

## Product purpose

STAGE uses Selfie Check to protect scarce creator rewards and token-gated perks
from bots and duplicate identities. It is deliberately separate from wallet
authentication:

```text
wallet ownership -> Stage session -> Selfie Check -> reward/perk eligibility
```

This makes Selfie Check a fairness and abuse-prevention signal rather than a
generic login mechanism.

## Environment

- Application: STAGE local web and API
- World environment: Developer staging
- Client: `@worldcoin/idkit` with `selfieCheckLegacy`
- Server: signed RP context and the World v4 verification endpoint
- Primary flow: desktop browser QR hand-off to World App
- Alternative local flow: explicit `WORLD_PROVIDER=fake`

Fake mode is useful for deterministic UI and backend failure tests, but its
results are never counted as evidence that real Selfie Check works.

## Scenarios exercised

| Scenario | Expected result | Observation |
|---|---|---|
| World is not configured | A clear configuration state without exposing secrets | The UI originally showed configuration messages but did not make the missing RP/action relationship obvious to the developer. |
| Wallet login followed by Selfie Check | Users understand that wallet and human checks are separate | Moving the check immediately after wallet connection made the sequence clearer than a disconnected eligibility page. |
| Desktop QR to mobile World App | The user can complete the mobile step and return to STAGE | The hand-off worked after beta access became available, but access availability itself caused an early testing block. |
| World App reports success | STAGE verifies the proof before showing eligibility | A session reached success in World App but was declined by the website verifier. This exposed the need to distinguish client completion from backend proof acceptance. |
| IDKit widget over a STAGE modal | QR and verification controls remain interactive | The widget initially opened behind the STAGE verification dialog, making the QR unusable. Modal ownership and stacking had to be treated as part of the integration. |
| Cancel and retry | The user returns to an understandable recovery state | The app now maps cancellation, expiry, invalid proof, duplicate, unavailable, and configuration errors to separate states. |
| Replay or cross-user reuse | A proof cannot unlock rewards for another account | The backend binds the signal to the authenticated user and verified Hedera account and enforces an action-scoped replay uniqueness record. |
| Backend is unavailable after the mobile flow | The user sees a retryable failure, not false success | IDKit `onSuccess` is not sufficient: STAGE becomes verified only after `handleVerify` completes successfully against the backend. |

## Developer feedback

### 1. Beta access was difficult to predict

The initial iOS TestFlight link was not accepting new testers. That prevented a
clean end-to-end mobile test even though the Developer Portal application and
web integration were available.

Suggested improvement:

- show beta eligibility and available client/testing paths directly in the
  Developer Portal;
- provide a documented simulator or web credential path for teams waiting for
  mobile beta capacity;
- publish an explicit hackathon-access escalation route.

### 2. Protocol and credential versioning was confusing

The current integration uses a v4 RP context and verifier while the SDK exposes
the beta preset as `selfieCheckLegacy` and requires legacy-proof acceptance.
That combination is valid for this beta flow but is not intuitive from the API
names alone.

Suggested improvement:

- add a compatibility matrix covering IDKit version, preset name, proof
  protocol, RP registration, verifier endpoint, and
  `allow_legacy_proofs`;
- include one complete React plus server example for Selfie Check Beta.

### 3. “World success” and “application success” are different states

The mobile app can complete credential generation while the relying-party
backend rejects the result because of action, signal, RP, expiry, replay, or
configuration issues. A generic “verification declined” message makes the
integration difficult to diagnose.

Suggested improvement:

- return a stable public error code and correlation ID to the RP;
- document which failures happen in IDKit, World App, the World verifier, and
  the application backend;
- show this state split explicitly in the integration guide.

### 4. Modal integration requires more guidance

IDKit is frequently launched from an existing authentication/onboarding modal.
The initial implementation left the World QR behind the parent overlay.

Suggested improvement:

- document portal/z-index and focus-trap expectations;
- provide an example of launching IDKit from an existing modal;
- state which component should own dismissal, focus restoration, and escape
  handling.

### 5. Server-generated context is the correct security boundary

The v4 RP-context design was useful once configured. STAGE can derive the action
and signal on the server, preventing the browser from selecting a different
action or wallet binding.

Positive feedback:

- the signed short-lived RP context provides a clear trust boundary;
- an opaque proof transport keeps World protocol data isolated from product
  code;
- the verifier callback fits a backend-enforced eligibility model.

## User feedback

### 1. The reason for the check must be stated before the QR

“Verify eligibility” alone did not explain why a selfie was relevant to a
creator platform. The current post-login screen says that the check protects
creator rewards from bots and duplicate accounts and that STAGE does not
receive the selfie.

Product response:

- explain the fairness benefit before asking for the check;
- explicitly separate wallet verification from Selfie Check;
- describe the returned result as privacy-preserving eligibility, not identity
  collection.

### 2. The check is easier to understand after wallet connection

A separate eligibility page felt disconnected from login and reward actions.
Placing Selfie Check directly after wallet ownership establishes a two-step
sequence: wallet verified, then real-person eligibility.

Product response:

- preserve the post-wallet order;
- keep backend eligibility enforcement even if the frontend prompt is
  dismissed or interrupted.

### 3. An inaccessible QR is a complete blocker

When the World widget opened behind the STAGE dialog, users had no usable next
action. This is not a cosmetic issue; it produces immediate drop-off.

Product response:

- treat widget visibility and focus as release-blocking;
- test the flow at mobile and desktop breakpoints;
- verify that retry does not create stacked dialogs.

### 4. Mobile success followed by website failure is confusing

The user reasonably interpreted success in World App as success for STAGE. A
later website decline appeared contradictory.

Product response:

- show a distinct “World completed; STAGE is confirming” state;
- do not show the STAGE verified state until backend confirmation;
- provide a safe retry message when proof acceptance fails.

### 5. Recovery copy should identify the next action

Generic failure text did not tell the user whether to retry the selfie, check
configuration, wait for the service, or contact the website owner.

Product response:

- map cancellation, expiry, duplicate, invalid proof, configuration, and
  provider unavailability separately;
- never display raw proof details or server secrets in the error.

## Changes made from feedback

- Moved Selfie Check into the post-wallet login/onboarding sequence.
- Added copy explaining bot prevention, duplicate-account prevention, and
  selfie privacy.
- Kept wallet authentication and World eligibility as separate backend checks.
- Added explicit UI states for context creation, World hand-off, backend
  verification, success, cancellation, invalid proof, replay, expiry,
  configuration, and service unavailability.
- Made backend confirmation mandatory before STAGE marks the user verified.
- Added server-derived action/signal binding and cross-user replay prevention.
- Added an explicit fake provider for repeatable local UI/failure testing, with
  no silent fallback from real mode.

## Remaining tests before final submission

These items should be completed on the final World staging application and
recorded with actual device/browser versions:

- [ ] Desktop Chrome QR to iOS World App.
- [ ] Desktop Chrome QR to Android World App.
- [ ] Mobile deep-link launch and return to STAGE.
- [ ] Camera permission denied, then retried.
- [ ] User cancels before capture.
- [ ] RP context expires before completion.
- [ ] World App succeeds and STAGE backend accepts the proof.
- [ ] World App succeeds but STAGE rejects an intentionally mismatched action or
      signal.
- [ ] The same proof is submitted again by the same Stage user.
- [ ] The same proof is attempted from another Stage user.
- [ ] Network interruption between World completion and backend confirmation.
- [ ] Screen-reader and keyboard behavior for the pre-check and recovery UI.

For each run, record:

| Field | Value |
|---|---|
| Date/time | |
| Device and OS | |
| Browser | |
| World App version | |
| STAGE commit | |
| Result | pass / fail / blocked |
| Time to completion | |
| Drop-off point | |
| User comprehension feedback | |
| Developer/API observation | |
| Follow-up issue | |

Do not attach selfies, proof payloads, replay keys, RP signatures, or other
biometric/protocol material to this report.
