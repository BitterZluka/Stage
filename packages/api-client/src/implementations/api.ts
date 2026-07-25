import type {
  Challenge,
  ChallengeId,
  CreateChallengeInput,
  CreateCreatorInput,
  Creator,
  CreatorId,
  SessionView,
  MutationOptions,
  OperationAccepted,
  Page,
  PageRequest,
  RewardPayout,
  SubmissionId,
  WorldProofInput,
  WorldRpContextView,
  WorldVerificationView,
} from "../contracts.js";
import type { AuthService } from "../services/auth-service.js";
import type { ChallengeService } from "../services/challenge-service.js";
import type { CreatorService } from "../services/creator-service.js";
import type { RewardService } from "../services/reward-service.js";
import type { WorldService } from "../services/world-service.js";

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

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
  implements ChallengeService {
  listChallenges(
    _filters?: Partial<PageRequest> & {
      creatorId?: CreatorId;
      status?: Challenge["status"];
    },
  ): Promise<Page<Challenge>> {
    void _filters;
    return this.notImplemented();
  }

  getChallenge(_id: ChallengeId): Promise<Challenge | null> {
    void _id;
    return this.notImplemented();
  }

  createChallenge(_input: CreateChallengeInput): Promise<Challenge> {
    void _input;
    return this.notImplemented();
  }

  publishChallenge(_id: ChallengeId): Promise<Challenge> {
    void _id;
    return this.notImplemented();
  }
}

export class ApiCreatorService
  extends ApiServiceContract
  implements CreatorService {
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
  implements RewardService {
  selectWinner(
    _submissionId: SubmissionId,
    _options: MutationOptions,
  ): Promise<OperationAccepted> {
    void _submissionId;
    void _options;
    return this.notImplemented();
  }

  getPayout(_submissionId: SubmissionId): Promise<RewardPayout | null> {
    void _submissionId;
    return this.notImplemented();
  }
}

export class ApiWorldService
  extends ApiServiceContract
  implements WorldService {
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
