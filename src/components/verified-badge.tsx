import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
export function VerifiedBadge() {
  return (
    <Badge variant="secondary" className="gap-1 bg-[#e8f1e8] text-[#245b42]">
      <BadgeCheck aria-hidden="true" className="size-3.5" />
      Verified
    </Badge>
  );
}
