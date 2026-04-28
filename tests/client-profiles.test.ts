import { describe, expect, it } from "vitest";
import { normalizeClientProfiles, resolveSelectedClientId } from "../src/platform/obsidian/client-profiles";

describe("client profiles", () => {
  it("normalizes persisted client profile records", () => {
    const normalized = normalizeClientProfiles([
      {
        id: "liu",
        author: "刘Sir.2035",
        industry: "AI",
        targetAudience: "开发者",
        topics: ["AI 编程工具"],
        blacklist: {
          words: ["空话"],
          topics: ["纯资讯搬运"],
        },
        wechat: {
          accountName: "主号",
          appid: "wx123",
          secret: "sec",
        },
      },
    ]);

    expect(normalized[0]?.wechat.accountName).toBe("主号");
    expect(normalized[0]?.blacklist.words).toEqual(["空话"]);
  });

  it("falls back to the first client when the remembered selection is missing", () => {
    const normalized = normalizeClientProfiles([
      {
        id: "liu",
        author: "刘Sir.2035",
        wechat: {
          accountName: "主号",
          appid: "wx123",
          secret: "sec",
        },
      },
      {
        id: "yeban",
        author: "夜半",
        wechat: {
          accountName: "副号",
          appid: "wx456",
          secret: "sec2",
        },
      },
    ]);

    expect(resolveSelectedClientId(normalized, "missing")).toBe("liu");
  });
});
