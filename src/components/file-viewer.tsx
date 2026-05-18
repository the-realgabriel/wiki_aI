import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchFileContent, type FileData } from "@/lib/file-server";
import Markdown from "react-markdown";
import { ArrowLeft, Loader2, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SummaryButton } from "@/components/summary-button";
import { ChatPanel } from "@/components/chat-panel";

type Props = {
  filePath: string;
};

export function FileViewer({ filePath }: Props) {
  const [file, setFile] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchFileContent(filePath)
      .then(setFile)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filePath]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading file...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <FileIcon className="size-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-red-500 mb-1">{error}</p>
        <p className="text-sm text-muted-foreground mb-4">The file may have been moved or deleted.</p>
        <Button asChild variant="outline">
          <Link to="/files">Back to Files</Link>
        </Button>
      </div>
    );
  }

  if (!file) return null;

  const dirPath = file.path.includes("/")
    ? "/" + file.path.substring(0, file.path.lastIndexOf("/"))
    : "/files";

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to={dirPath}>
          <ArrowLeft className="mr-1 size-4" />
          Back
        </Link>
      </Button>

      <div className="mb-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {file.name.endsWith(".md") ? "Markdown" : "File"}
        </span>
      </div>
      <h1 className="text-3xl font-bold mb-6">{file.name}</h1>

      <SummaryButton content={file.content} />

      <div className="prose prose-sm max-w-none">
        <Markdown>{file.content}</Markdown>
      </div>

      <ChatPanel pageContent={file.content} />
    </div>
  );
}
