import { cn } from "@/lib/utils";
import { UserCircle } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function Header({ title, subtitle, className }: HeaderProps) {
  return (
    <header
      className={cn(
        "flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-6",
        className
      )}
    >
      <div>
        <h1 className="font-serif text-lg font-semibold text-ink">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {/* User menu placeholder */}
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-muted hover:text-ink"
        aria-label="Benutzermenu"
      >
        <UserCircle className="h-5 w-5" strokeWidth={1.5} />
      </button>
    </header>
  );
}
