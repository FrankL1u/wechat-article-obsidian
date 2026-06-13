import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import * as cheerio from "cheerio/slim";
import { isText, type AnyNode, type Element } from "domhandler";
import type { ClientProfile } from "./plugin-settings";
import { getObsidianRequestUrl, type ObsidianRequestUrl } from "./request-url-registry";

const CHEERIO_OPTIONS = { xml: { decodeEntities: false, xmlMode: false } } as const;

interface PublishImageInput {
  path: string;
  htmlSrc?: string;
  markdownPath?: string;
  kind: "cover" | "inline";
}

interface PublishWechatDraftInput {
  html: string;
  title?: string;
  themeKey: string;
  images: PublishImageInput[];
  client: ClientProfile;
}

interface PublishWechatDraftResult {
  mediaId: string;
}

function getRequestUrlImpl(): ObsidianRequestUrl | undefined {
  return getObsidianRequestUrl();
}

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}

async function requestJson(url: string, init: {
  method?: string;
  headers?: Record<string, string>;
  contentType?: string;
  body?: string | ArrayBuffer;
} = {}): Promise<Record<string, unknown>> {
  const requestUrlImpl = getRequestUrlImpl();
  if (!requestUrlImpl) {
    throw new Error("Obsidian requestUrl is not available");
  }

  const result = await requestUrlImpl({
    url,
    method: init.method,
    headers: init.headers,
    contentType: init.contentType ?? init.headers?.["Content-Type"] ?? init.headers?.["content-type"],
    body: init.body,
    throw: false,
  });
  return result.json as Record<string, unknown>;
}

function stringifyWechatValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "unknown";
}

function buildWechatError(scope: string, data: Record<string, unknown>): Error {
  return new Error(`WeChat ${scope} error: errcode=${stringifyWechatValue(data.errcode)}, errmsg=${stringifyWechatValue(data.errmsg)}`);
}

export async function publishWechatDraft(input: PublishWechatDraftInput): Promise<PublishWechatDraftResult> {
  const { client } = input;
  if (!client.author || !client.wechat.appid || !client.wechat.secret) {
    throw new Error("缺少发布配置：author / appid / secret");
  }

  const accessToken = await getAccessToken(client.wechat.appid, client.wechat.secret);
  const html = await replaceInlineImageSources(input.html, input.images.filter((image) => image.kind === "inline"), accessToken);
  const coverImage = input.images.find((image) => image.kind === "cover");
  const thumbMediaId = coverImage ? await uploadThumb(accessToken, coverImage.path) : undefined;

  return createDraft({
    accessToken,
    title: input.title?.trim() || extractTitleFromHtml(html),
    digest: extractDigestFromHtml(html),
    html,
    coverImage,
    thumbMediaId,
    author: client.author,
  });
}

async function replaceInlineImageSources(html: string, images: PublishImageInput[], accessToken: string): Promise<string> {
  let nextHtml = html;

  for (const image of images) {
    const targetSrc = image.htmlSrc || image.markdownPath;
    if (!targetSrc) continue;
    const wechatUrl = await uploadImage(accessToken, image.path);
    nextHtml = nextHtml.replaceAll(targetSrc, wechatUrl);
  }

  return nextHtml;
}

async function getAccessToken(appid: string, secret: string): Promise<string> {
  const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
  url.searchParams.set("grant_type", "client_credential");
  url.searchParams.set("appid", appid);
  url.searchParams.set("secret", secret);

  const data = await requestJson(url.toString());

  if (typeof data.access_token !== "string") {
    throw buildWechatError("API", data);
  }

  return data.access_token;
}

async function uploadImage(accessToken: string, imagePath: string): Promise<string> {
  const data = await uploadMultipart(`https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${accessToken}`, imagePath);

  if (typeof data.url !== "string") {
    throw buildWechatError("upload_image", data);
  }

  return data.url;
}

async function uploadThumb(accessToken: string, imagePath: string): Promise<string> {
  const data = await uploadMultipart(`https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${accessToken}&type=thumb`, imagePath);

  if (typeof data.media_id !== "string") {
    throw buildWechatError("upload_thumb", data);
  }

  return data.media_id;
}

async function buildImageMultipart(imagePath: string): Promise<{ body: Buffer; contentType: string }> {
  const buffer = await readFile(imagePath);
  const ext = basename(imagePath).split(".").pop()?.toLowerCase() || "jpg";
  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
  };
  const boundary = `----wao-wechat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const header = Buffer.from(
    `--${boundary}\r\n`
    + `Content-Disposition: form-data; name="media"; filename="${basename(imagePath)}"\r\n`
    + `Content-Type: ${mimeMap[ext] || "image/jpeg"}\r\n\r\n`,
    "utf8",
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  return {
    body: Buffer.concat([header, buffer, footer]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function uploadMultipart(url: string, imagePath: string): Promise<Record<string, unknown>> {
  const { body, contentType } = await buildImageMultipart(imagePath);
  return requestJson(url, {
    method: "POST",
    headers: { "Content-Type": contentType },
    contentType,
    body: bufferToArrayBuffer(body),
  });
}

async function createDraft(input: {
  accessToken: string;
  title: string;
  digest: string;
  html: string;
  coverImage?: PublishImageInput;
  thumbMediaId?: string;
  author: string;
}): Promise<PublishWechatDraftResult> {
  const contentHtml = extractDraftContentHtml(input.html, input.coverImage);
  const article: Record<string, unknown> = {
    title: input.title,
    author: input.author,
    digest: input.digest,
    content: contentHtml,
    show_cover_pic: 0,
  };

  if (input.thumbMediaId) {
    article.thumb_media_id = input.thumbMediaId;
  }

  const data = await requestJson(`https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${input.accessToken}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify({ articles: [article] }),
  });
  const errcode = typeof data.errcode === "number" ? data.errcode : 0;

  if (errcode !== 0) {
    throw buildWechatError("create_draft", data);
  }
  if (typeof data.media_id !== "string") {
    throw new Error(`WeChat create_draft error: missing media_id in response: ${JSON.stringify(data)}`);
  }

  return { mediaId: data.media_id };
}

function extractTitleFromHtml(html: string): string {
  const $ = cheerio.load(html, CHEERIO_OPTIONS, false);
  return $("h1").first().text().trim() || "未命名文章";
}

function extractDigestFromHtml(html: string): string {
  const $ = cheerio.load(html, CHEERIO_OPTIONS, false);
  return $("p")
    .toArray()
    .map((element) => $(element).text().trim())
    .find(Boolean) || "";
}

function normalizeSrc(value: string | undefined): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value.trim());
  } catch {
    return value.trim();
  }
}

function removeElementOrImageOnlyParent($: cheerio.CheerioAPI, image: Element): void {
  const parent = $(image).parent();
  const meaningfulChildren = parent
    .contents()
    .toArray()
    .filter((child) => !isText(child) || $(child).text().trim());

  if (parent.length && parent[0]?.tagName === "p" && meaningfulChildren.length === 1) {
    parent.remove();
    return;
  }

  $(image).remove();
}

function removeCoverImageFromDraft($: cheerio.CheerioAPI, root: cheerio.Cheerio<AnyNode>, coverImage?: PublishImageInput): void {
  if (!coverImage) return;

  const candidates = [
    normalizeSrc(coverImage.htmlSrc),
    normalizeSrc(coverImage.markdownPath),
  ].filter(Boolean);
  if (!candidates.length) return;

  root.find("img").each((_, element) => {
    const src = normalizeSrc($(element).attr("src"));
    if (!src) return;
    if (candidates.some((candidate) => src === candidate || src.endsWith(candidate))) {
      removeElementOrImageOnlyParent($, element);
    }
  });
}

function extractDraftContentHtml(html: string, coverImage?: PublishImageInput): string {
  const $ = cheerio.load(html, CHEERIO_OPTIONS, false);
  let root: cheerio.Cheerio<AnyNode> = $(".preview-body > section").first();
  if (!root.length) {
    root = $("body").first();
  }
  if (!root.length) {
    root = $.root();
  }

  root.find("h1").remove();
  removeCoverImageFromDraft($, root, coverImage);

  return root.html()?.trim() || html;
}
