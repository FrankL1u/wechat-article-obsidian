import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { publishWechatDraft } from "../src/platform/obsidian/wechat-publish-service";

describe("publishWechatDraft", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as typeof globalThis & { __waoRequestUrl?: unknown }).__waoRequestUrl;
  });

  it("rejects when author or credentials are missing", async () => {
    await expect(
      publishWechatDraft({
        html: "<h1>标题</h1>",
        themeKey: "wechat-tech",
        images: [],
        client: {
          id: "liu",
          author: "",
          industry: "",
          targetAudience: "",
          topics: [],
          blacklist: {
            words: [],
            topics: [],
          },
          wechat: {
            accountName: "主号",
            appid: "",
            secret: "",
          },
        },
      }),
    ).rejects.toThrow("缺少发布配置");
  });

  it("uploads inline and cover images before creating the draft", async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "wao-publish-"));
    const inlinePath = path.join(tempDir, "inline.png");
    const coverPath = path.join(tempDir, "cover.png");
    writeFileSync(inlinePath, Buffer.from("inline"));
    writeFileSync(coverPath, Buffer.from("cover"));

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({ access_token: "token", expires_in: 7200 }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ url: "https://cdn.example.com/inline.png" }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ media_id: "thumb-123" }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ media_id: "draft-456" }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await publishWechatDraft({
      html: '<h1>标题</h1><p>第一段摘要。</p><p><img src="inline-local.png" /></p>',
      title: "标题",
      themeKey: "wechat-tech",
      images: [
        { path: inlinePath, markdownPath: "inline-local.png", kind: "inline" },
        { path: coverPath, markdownPath: "cover-local.png", kind: "cover" },
      ],
      client: {
        id: "liu",
        author: "刘Sir.2035",
        industry: "",
        targetAudience: "",
        topics: [],
        blacklist: {
          words: [],
          topics: [],
        },
        wechat: {
          accountName: "主号",
          appid: "wx123",
          secret: "sec456",
        },
      },
    });

    expect(result.mediaId).toBe("draft-456");
    expect(fetchMock).toHaveBeenCalledTimes(4);

    const draftCall = fetchMock.mock.calls[3];
    const draftBody = JSON.parse(String(draftCall?.[1]?.body));
    expect(draftBody.articles[0].author).toBe("刘Sir.2035");
    expect(draftBody.articles[0].title).toBe("标题");
    expect(draftBody.articles[0].thumb_media_id).toBe("thumb-123");
    expect(draftBody.articles[0].content).toContain("https://cdn.example.com/inline.png");
  });

  it("uses the markdown title and removes preview title and cover image from draft content", async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "wao-publish-clean-"));
    const coverPath = path.join(tempDir, "cover.png");
    writeFileSync(coverPath, Buffer.from("cover"));

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({ access_token: "token", expires_in: 7200 }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ media_id: "thumb-123" }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ media_id: "draft-456" }),
      });

    vi.stubGlobal("fetch", fetchMock);

    await publishWechatDraft({
      html: `
        <body>
          <div class="preview-scroll-root">
            <div class="preview-container">
              <div class="preview-body">
                <section>
                  <p><img src="app://obsidian/cover.png" alt="封面图"></p>
                  <h1>LLM Wiki</h1>
                  <p>正文第一段。</p>
                </section>
              </div>
            </div>
          </div>
        </body>
      `,
      title: "LLM Wiki",
      themeKey: "wechat-tech",
      images: [
        { path: coverPath, htmlSrc: "app://obsidian/cover.png", markdownPath: "cover.png", kind: "cover" },
      ],
      client: {
        id: "liu",
        author: "刘Sir.2035",
        industry: "",
        targetAudience: "",
        topics: [],
        blacklist: {
          words: [],
          topics: [],
        },
        wechat: {
          accountName: "主号",
          appid: "wx123",
          secret: "sec456",
        },
      },
    });

    const draftCall = fetchMock.mock.calls[2];
    const draftBody = JSON.parse(String(draftCall?.[1]?.body));
    expect(draftBody.articles[0].title).toBe("LLM Wiki");
    expect(draftBody.articles[0].content).not.toContain("封面图");
    expect(draftBody.articles[0].content).not.toContain("<h1");
    expect(draftBody.articles[0].content).not.toContain("preview-scroll-root");
    expect(draftBody.articles[0].content).toContain("正文第一段。");
  });

  it("uses Obsidian requestUrl when available", async () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "wao-publish-request-url-"));
    const inlinePath = path.join(tempDir, "inline.png");
    writeFileSync(inlinePath, Buffer.from("inline"));
    const fetchMock = vi.fn();
    const requestUrl = vi.fn(async (request: { url: string }) => {
      if (request.url.includes("/cgi-bin/token")) {
        return { status: 200, headers: {}, arrayBuffer: new ArrayBuffer(0), text: "", json: { access_token: "token" } };
      }
      if (request.url.includes("/cgi-bin/media/uploadimg")) {
        return { status: 200, headers: {}, arrayBuffer: new ArrayBuffer(0), text: "", json: { url: "https://cdn.example.com/inline.png" } };
      }
      if (request.url.includes("/cgi-bin/draft/add")) {
        return { status: 200, headers: {}, arrayBuffer: new ArrayBuffer(0), text: "", json: { media_id: "draft-789" } };
      }
      return { status: 404, headers: {}, arrayBuffer: new ArrayBuffer(0), text: "", json: { errcode: 404, errmsg: "not found" } };
    });
    vi.stubGlobal("fetch", fetchMock);
    (globalThis as typeof globalThis & { __waoRequestUrl?: typeof requestUrl }).__waoRequestUrl = requestUrl;

    const result = await publishWechatDraft({
      html: '<h1>标题</h1><p>第一段摘要。</p><p><img src="inline-local.png" /></p>',
      title: "标题",
      themeKey: "wechat-tech",
      images: [
        { path: inlinePath, markdownPath: "inline-local.png", kind: "inline" },
      ],
      client: {
        id: "liu",
        author: "刘Sir.2035",
        industry: "",
        targetAudience: "",
        topics: [],
        blacklist: {
          words: [],
          topics: [],
        },
        wechat: {
          accountName: "主号",
          appid: "wx123",
          secret: "sec456",
        },
      },
    });

    expect(result.mediaId).toBe("draft-789");
    expect(requestUrl).toHaveBeenCalledTimes(3);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
