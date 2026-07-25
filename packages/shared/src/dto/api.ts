import type { ApplicationError } from "../errors/application-error.js";

export interface PageRequest {
  cursor?: string;
  limit: number;
}

export interface PageInfo {
  nextCursor?: string;
  hasNextPage: boolean;
}

export interface Page<T> {
  items: T[];
  pageInfo: PageInfo;
}

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApplicationError };
