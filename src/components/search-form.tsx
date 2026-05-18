import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Label } from "#components/ui/label";
import { SidebarInput } from "#components/ui/sidebar";
import { SearchIcon } from "lucide-react";

type Props = React.ComponentProps<"form">;

export function SearchForm({ ...props }: Props) {
  const [value, setValue] = useState("");
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  return (
    <form {...props} onSubmit={handleSubmit} role="search">
      <div className="relative">
        <Label htmlFor="search" className="sr-only">
          Search
        </Label>
        <SidebarInput
          id="search"
          placeholder="Type to search..."
          className="h-8 pl-7"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
      </div>
    </form>
  );
}
