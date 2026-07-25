import type {
  Challenge,
  ChallengeId,
  CreateChallengeInput,
  CreateSubmissionInput,
  CreateCreatorInput,
  Creator,
  CreatorId,
  SessionView,
  MutationOptions,
  OperationAccepted,
  Page,
  PageRequest,
  RewardPayout,
  Submission,
  SubmissionDecisionInput,
  SubmissionId,
  UpdateChallengeInput,
  WorldProofInput,
  WorldRpContextView,
  WorldVerificationView,
} from "../contracts.js";
import type { AuthService } from "../services/auth-service.js";
import type { ChallengeService } from "../services/challenge-service.js";
import type { CreatorService } from "../services/creator-service.js";
import type { RewardService } from "../services/reward-service.js";
import type { SubmissionService } from "../services/submission-service.js";
import type { WorldService } from "../services/world-service.js";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

abstract class ApiServiceContract {
  protected readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  protected notImplemented(): never {
    throw new Error(
      "TODO: connect the typed HTTP transport in the frontend integration stage",
    );
  }

  protected async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: { code?: string; message?: string };
      } | null;
      throw new ApiClientError(
        body?.error?.message ??
          `API request failed with status ${response.status}`,
        response.status,
        body?.error?.code,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}

export class ApiAuthService extends ApiServiceContract implements AuthService {
  requestLoginMessage(
    accountId: Parameters<AuthService["requestLoginMessage"]>[0],
  ) {
    return this.request<
      Awaited<ReturnType<AuthService["requestLoginMessage"]>>
    >("/auth/challenge", {
      method: "POST",
      body: JSON.stringify({ accountId }),
    });
  }

  createSession(input: Parameters<AuthService["createSession"]>[0]) {
    return this.request<SessionView>("/auth/session", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  completeOnboarding(input: Parameters<AuthService["completeOnboarding"]>[0]) {
    return this.request<SessionView>("/auth/onboarding", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getSession(): Promise<SessionView | null> {
    try {
      return await this.request<SessionView>("/auth/me");
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        return null;
      }
      throw error;
    }
  }

  signOut(): Promise<void> {
    return this.request<void>("/auth/session", { method: "DELETE" });
  }
}

export class ApiChallengeService
  extends ApiServiceContract
  implements ChallengeService
{
  listChallenges(
    filters?: Partial<PageRequest> & {
      creatorId?: CreatorId;
      status?: Challenge["status"];
    },
  ): Promise<Page<Challenge>> {
    const query = new URLSearchParams();
    if (filters?.creatorId) query.set("creatorId", filters.creatorId);
    if (filters?.status) query.set("status", filters.status);
    if (filters?.cursor) query.set("cursor", filters.cursor);
    if (filters?.limit) query.set("limit", String(filters.limit));
    const suffix = query.size ? `?${query}` : "";
    return this.request(`/challenges${suffix}`);
  }

  async getChallenge(id: ChallengeId): Promise<Challenge | null> {
    try {
      return await this.request(`/challenges/${id}`);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) return null;
      throw error;
    }
  }

  createChallenge(input: CreateChallengeInput): Promise<Challenge> {
    return this.request("/challenges", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateChallenge(
    id: ChallengeId,
    input: UpdateChallengeInput,
  ): Promise<Challenge> {
    return this.request(`/challenges/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  publishChallenge(id: ChallengeId): Promise<Challenge> {
    return this.request(`/challenges/${id}/publish`, { method: "POST" });
  }

  closeChallenge(id: ChallengeId): Promise<Challenge> {
    return this.request(`/challenges/${id}/close`, { method: "POST" });
  }

  completeChallenge(id: ChallengeId): Promise<Challenge> {
    return this.request(`/challenges/${id}/complete`, { method: "POST" });
  }

  cancelChallenge(id: ChallengeId): Promise<Challenge> {
    return this.request(`/challenges/${id}/cancel`, { method: "POST" });
  }
}

export class ApiSubmissionService
  extends ApiServiceContract
  implements SubmissionService
{
  createSubmission(input: CreateSubmissionInput): Promise<Submission> {
    const { challengeId, ...evidence } = input;
    return this.request(`/challenges/${challengeId}/submissions`, {
      method: "POST",
      body: JSON.stringify(evidence),
    });
  }

  async getSubmission(id: SubmissionId): Promise<Submission | null> {
    try {
      return await this.request(`/submissions/${id}`);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) return null;
      throw error;
    }
  }

  listChallengeSubmissions(
    challengeId: ChallengeId,
    page?: Partial<PageRequest>,
  ): Promise<Page<Submission>> {
    const query = new URLSearchParams();
    if (page?.cursor) query.set("cursor", page.cursor);
    if (page?.limit) query.set("limit", String(page.limit));
    const suffix = query.size ? `?${query}` : "";
    return this.request(`/challenges/${challengeId}/submissions${suffix}`);
  }

  decideSubmission(
    id: SubmissionId,
    input: SubmissionDecisionInput,
  ): Promise<{ submission: Submission; payout: unknown | null }> {
    return this.request(`/submissions/${id}/decision`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
}

export class ApiCreatorService
  extends ApiServiceContract
  implements CreatorService
{
  listCreators(_page?: Partial<PageRequest>): Promise<Page<Creator>> {
    void _page;
    return this.notImplemented();
  }

  getCreator(_id: CreatorId): Promise<Creator | null> {
    void _id;
    return this.notImplemented();
  }

  createCreator(_input: CreateCreatorInput): Promise<Creator> {
    void _input;
    return this.notImplemented();
  }

  updateCreator(
    _id: CreatorId,
    _input: Partial<Pick<Creator, "displayName" | "handle">>,
  ): Promise<Creator> {
    void _id;
    void _input;
    return this.notImplemented();
  }
}

export class ApiRewardService
  extends ApiServiceContract
  implements RewardService
{
  selectWinner(
    submissionId: SubmissionId,
    options: MutationOptions & { expectedVersion: number },
  ): Promise<OperationAccepted> {
    return this.request<{
      payout: { id: string };
    }>(`/submissions/${submissionId}/decision`, {
      method: "POST",
      headers: { "Idempotency-Key": options.idempotencyKey },
      body: JSON.stringify({
        decision: "accept",
        expectedVersion: options.expectedVersion,
      }),
    }).then((result) => ({
      operationId: result.payout.id,
      status: "pending",
    }));
  }

  async getPayout(submissionId: SubmissionId): Promise<RewardPayout | null> {
    try {
      return await this.request(`/submissions/${submissionId}/payout`);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) return null;
      throw error;
    }
  }
}

export class ApiWorldService
  extends ApiServiceContract
  implements WorldService
{
  requestVerification(
    input: {
      hederaAccountId?: string;
    } = {},
  ): Promise<WorldRpContextView> {
    return this.request("/world/rp-context", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  completeVerification(input: WorldProofInput): Promise<WorldVerificationView> {
    return this.request("/world/verify", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  getVerification(): Promise<WorldVerificationView> {
    return this.request("/world/status");
  }
}
