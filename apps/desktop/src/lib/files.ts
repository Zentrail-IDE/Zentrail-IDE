/** Map a filename to a Monaco language id, falling back to plaintext. */
export function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    json: "json",
    css: "css",
    scss: "scss",
    less: "less",
    html: "html",
    htm: "html",
    md: "markdown",
    markdown: "markdown",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    c: "c",
    h: "c",
    cpp: "cpp",
    cc: "cpp",
    cs: "csharp",
    rb: "ruby",
    php: "php",
    xml: "xml",
    yml: "yaml",
    yaml: "yaml",
    toml: "toml",
    ini: "ini",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    sql: "sql",
    txt: "plaintext",
  };
  return map[ext] ?? "plaintext";
}

/** Human-readable byte size. */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Join a parent workspace-relative directory with a child entry name. */
export function joinRel(dir: string, name: string): string {
  if (!dir) return name;
  return `${dir}/${name}`;
}
