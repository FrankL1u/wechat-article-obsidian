const EMBEDDED_AUTHOR_ASSET_SVGS: Record<string, string> = {
  "tip-notebook-cover.png": [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">',
    '<rect width="1200" height="630" fill="#f6f2ff"/>',
    '<rect x="120" y="90" width="420" height="450" rx="28" fill="#ffffff" stroke="#8b5cf6" stroke-width="18"/>',
    '<path d="M190 190h280M190 260h230M190 330h260M190 400h190" stroke="#4338ca" stroke-width="26" stroke-linecap="round"/>',
    '<circle cx="800" cy="245" r="96" fill="#8b5cf6"/>',
    '<path d="M690 390c55-76 165-76 220 0" fill="none" stroke="#4338ca" stroke-width="34" stroke-linecap="round"/>',
    '<text x="670" y="500" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="56" font-weight="700" fill="#312e81">Author note</text>',
    '</svg>',
  ].join(""),
  "扫码_搜索联合传播样式-标准色版.png": [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900">',
    '<rect width="900" height="900" fill="#ffffff"/>',
    '<rect x="105" y="105" width="690" height="690" rx="36" fill="#f8fafc" stroke="#8b5cf6" stroke-width="20"/>',
    '<rect x="165" y="165" width="150" height="150" fill="#111827"/>',
    '<rect x="585" y="165" width="150" height="150" fill="#111827"/>',
    '<rect x="165" y="585" width="150" height="150" fill="#111827"/>',
    '<rect x="375" y="180" width="60" height="60" fill="#111827"/>',
    '<rect x="465" y="270" width="60" height="60" fill="#111827"/>',
    '<rect x="375" y="390" width="150" height="60" fill="#111827"/>',
    '<rect x="555" y="435" width="60" height="150" fill="#111827"/>',
    '<rect x="360" y="555" width="60" height="60" fill="#111827"/>',
    '<rect x="465" y="660" width="270" height="60" fill="#111827"/>',
    '<text x="450" y="840" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="48" font-weight="700" fill="#312e81">Scan to connect</text>',
    '</svg>',
  ].join(""),
};

function toSvgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function resolveEmbeddedAuthorAsset(target: string): string | null {
  const normalized = target.trim().split("/").pop() ?? target.trim();
  const svg = EMBEDDED_AUTHOR_ASSET_SVGS[normalized];
  return svg ? toSvgDataUri(svg) : null;
}
