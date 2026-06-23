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

async function apiFetch(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchDirListing(path: string): Promise<DirListing> {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  const parentPath = normalized || "";
  const params = new URLSearchParams();
  if (parentPath) {
    params.set("parent_path", `eq.${parentPath}`);
  } else {
    params.set("parent_path", "is.null");
  }
  const rows = await apiFetch(`/api/files?${params}`);

  return {
    path: normalized || "/",
    entries: rows.map((r: any) => ({ name: r.name, type: r.type })),
    parentPath: parentPath ? (parentPath.includes("/") ? parentPath.substring(0, parentPath.lastIndexOf("/")) : null) : null,
  };
}

export async function fetchFileContent(path: string): Promise<FileData> {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  const data = await apiFetch(`/api/files/content?path=${encodeURIComponent(normalized)}`);
  return {
    path: normalized,
    name: normalized.split("/").pop() || normalized,
    content: data.content || "",
  };
}

export async function fetchAllFiles(): Promise<any[]> {
  return apiFetch("/api/files");
}

export async function deleteFile(path: string): Promise<void> {
  const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Delete failed" }));
    throw new Error(err.error || "Delete failed");
  }
}
