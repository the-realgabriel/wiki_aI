import filesystem from "../data/files.json";
import fileContents from "../data/file-contents.json";

export type FileEntry = {
  name: string;
  type: "file" | "dir";
};

export type DirListing = {
  path: string;
  entries: FileEntry[];
  parentPath: string | null;
};

export type FileData = {
  path: string;
  name: string;
  content: string;
};

function simulateLatency(): Promise<void> {
  const delay = 100 + Math.random() * 200;
  return new Promise((r) => setTimeout(r, delay));
}

function normalizePath(path: string): string {
  return path.replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
}

export async function fetchDirListing(path: string): Promise<DirListing> {
  await simulateLatency();

  const normalized = normalizePath(path);
  const key = normalized || "root";
  const dir = (filesystem as Record<string, { type: string; children: FileEntry[] }>)[key];

  if (!dir || dir.type !== "dir") {
    throw new Error(`Directory not found: ${path}`);
  }

  const parentPath = normalized.includes("/")
    ? normalized.substring(0, normalized.lastIndexOf("/")) || null
    : null;

  return {
    path: normalized || "/",
    entries: dir.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    }),
    parentPath,
  };
}

export async function fetchFileContent(path: string): Promise<FileData> {
  await simulateLatency();

  const normalized = normalizePath(path);
  const contents = fileContents as Record<string, string>;
  const content = contents[normalized];

  if (!content) {
    throw new Error(`File not found: ${path}`);
  }

  const name = normalized.split("/").pop() || normalized;

  return {
    path: normalized,
    name,
    content,
  };
}
