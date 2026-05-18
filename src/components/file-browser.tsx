import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDirListing, type DirListing } from "@/lib/file-server";
import { FileIcon, FolderIcon, ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  currentPath: string;
};

export function FileBrowser({ currentPath }: Props) {
  const [listing, setListing] = useState<DirListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchDirListing(currentPath)
      .then(setListing)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [currentPath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading directory...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <Button asChild variant="outline">
          <Link to="/files">Back to root</Link>
        </Button>
      </div>
    );
  }

  if (!listing || listing.entries.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        This directory is empty.
      </div>
    );
  }

  const pathParts = listing.path === "/" ? [] : listing.path.split("/");

  return (
    <div>
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <Link to="/files" className="hover:text-foreground transition-colors">
          Files
        </Link>
        {pathParts.map((part, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="size-3" />
            <Link
              to={`/files/${pathParts.slice(0, i + 1).join("/")}`}
              className="hover:text-foreground transition-colors"
            >
              {part}
            </Link>
          </span>
        ))}
      </nav>

      <div className="rounded-lg border divide-y">
        {listing.parentPath !== null && (
          <Link
            to={`/files/${listing.parentPath}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-sm"
          >
            <ArrowLeft className="size-4 text-muted-foreground" />
            <span className="font-medium">..</span>
          </Link>
        )}
        {listing.entries.map((entry) => (
          <Link
            key={entry.name}
            to={
              entry.type === "dir"
                ? `/files/${listing.path === "/" ? "" : listing.path}/${entry.name}`
                : `/files/${listing.path === "/" ? "" : listing.path}/${entry.name}`
            }
            className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-sm"
          >
            {entry.type === "dir" ? (
              <FolderIcon className="size-4 text-blue-500 shrink-0" />
            ) : (
              <FileIcon className="size-4 text-muted-foreground shrink-0" />
            )}
            <span className={entry.type === "dir" ? "font-medium" : ""}>
              {entry.name}
            </span>
            {entry.type === "dir" && (
              <span className="ml-auto text-xs text-muted-foreground">folder</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
