export interface RequestUrlResponseLike {
  status: number;
  headers: Record<string, string>;
  arrayBuffer: ArrayBuffer;
  json: unknown;
  text: string;
}

export type ObsidianRequestUrl = (request: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  contentType?: string;
  body?: string | ArrayBuffer;
  throw?: boolean;
}) => Promise<RequestUrlResponseLike>;

let requestUrlImpl: ObsidianRequestUrl | undefined;

export function setObsidianRequestUrl(nextRequestUrl: ObsidianRequestUrl): void {
  requestUrlImpl = nextRequestUrl;
}

export function clearObsidianRequestUrl(): void {
  requestUrlImpl = undefined;
}

export function getObsidianRequestUrl(): ObsidianRequestUrl | undefined {
  return requestUrlImpl;
}
