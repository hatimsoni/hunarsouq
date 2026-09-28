import { cn } from "@/lib/utils";
export function Container({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12",
        className,
      )}
      {...props}
    />
  );
}
export function Section({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return <section className={cn("py-16 md:py-20", className)} {...props} />;
}
