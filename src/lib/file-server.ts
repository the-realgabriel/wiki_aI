import { getRows } from './rest';

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

export async function fetchDirListing(path: string): Promise<DirListing> {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  const parentPath = normalized || "";
  const params: Record<string, string> = {
    select: "name,type,path",
    order: "type.desc,name.asc",
  };
  if (parentPath) {
    params["parent_path"] = `eq.${parentPath}`;
  } else {
    params["parent_path"] = "is.null";
  }
  const rows = await getRows("wiki_files", params);

  return {
    path: normalized || "/",
    entries: rows.map((r: any) => ({ name: r.name, type: r.type })),
    parentPath: parentPath ? (parentPath.includes("/") ? parentPath.substring(0, parentPath.lastIndexOf("/")) : null) : null,
  };
}

export async function fetchFileContent(path: string): Promise<FileData> {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  const rows = await getRows("wiki_files", {
    path: `eq.${normalized}`,
  });

  if (rows.length === 0) throw new Error(`File not found: ${path}`);

  const file = rows[0];
  const name = normalized.split("/").pop() || normalized;

  return {
    path: normalized,
    name,
    content: file.content || "",
  };
}
