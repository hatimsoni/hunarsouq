import Image from "next/image";
import Link from "next/link";
import { UserRound, MapPin } from "lucide-react";
import { VerifiedBadge } from "./verified-badge";
import type { RecentMember } from "@/lib/home-schema";
import type { Category } from "@/lib/supabase/database.types";
export function RecentMembers({
  members,
  categories,
}: {
  members: RecentMember[];
  categories: Category[];
}) {
  return (
    <div
      aria-label="Recently approved members"
      tabIndex={0}
      className="mt-8 flex snap-x gap-4 overflow-x-auto pb-4"
    >
      {members.map((member) => (
        <article
          key={member.id}
          className="w-64 shrink-0 snap-start rounded-xl border bg-white p-6"
        >
          <div className="mb-5 flex size-16 items-center justify-center overflow-hidden rounded-full bg-secondary">
            {member.has_photo ? (
              <Image
                src={`/media/member-avatar/${member.id}`}
                alt={`${member.full_name}'s profile photo`}
                width={64}
                height={64}
                unoptimized
                className="size-16 object-cover"
              />
            ) : (
              <UserRound className="size-7" strokeWidth={1.3} />
            )}
          </div>
          <h3 className="text-xl">
            <Link href={`/${member.username}`} className="hover:underline">
              {member.full_name}
            </Link>
          </h3>
          <div className="mt-2">
            <VerifiedBadge />
          </div>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            {categories.find((category) => category.id === member.category_id)
              ?.name ?? "Community member"}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin size={13} />
            {member.city}
          </p>
        </article>
      ))}
    </div>
  );
}
