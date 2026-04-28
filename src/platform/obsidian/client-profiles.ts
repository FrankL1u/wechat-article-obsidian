import type { ClientProfile } from "./plugin-settings";

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(normalizeString).filter(Boolean) : [];
}

export function createEmptyClientProfile(id = crypto.randomUUID()): ClientProfile {
  return {
    id,
    author: "",
    industry: "",
    targetAudience: "",
    topics: [],
    blacklist: {
      words: [],
      topics: [],
    },
    wechat: {
      accountName: "",
      appid: "",
      secret: "",
    },
  };
}

export function normalizeClientProfiles(input: unknown[]): ClientProfile[] {
  return input.map((item, index) => {
    const record = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
    const blacklist = typeof record.blacklist === "object" && record.blacklist !== null
      ? (record.blacklist as Record<string, unknown>)
      : {};
    const wechat = typeof record.wechat === "object" && record.wechat !== null
      ? (record.wechat as Record<string, unknown>)
      : {};

    return {
      id: normalizeString(record.id) || `client-${index + 1}`,
      author: normalizeString(record.author),
      industry: normalizeString(record.industry),
      targetAudience: normalizeString(record.targetAudience),
      topics: normalizeStringArray(record.topics),
      blacklist: {
        words: normalizeStringArray(blacklist.words),
        topics: normalizeStringArray(blacklist.topics),
      },
      wechat: {
        accountName: normalizeString(wechat.accountName),
        appid: normalizeString(wechat.appid),
        secret: normalizeString(wechat.secret),
      },
    };
  });
}

export function resolveSelectedClientId(clients: ClientProfile[], lastSelectedClientId: string | null): string | null {
  if (clients.length === 0) return null;
  if (lastSelectedClientId && clients.some((client) => client.id === lastSelectedClientId)) {
    return lastSelectedClientId;
  }
  return clients[0]?.id ?? null;
}
