import { cn } from "@/lib/utils";
export const inputClass =
  "min-h-12 w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60";
export function Field({
  label,
  id,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && (
        <p
          id={`${id}-hint`}
          className="text-xs leading-5 text-muted-foreground"
        >
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
