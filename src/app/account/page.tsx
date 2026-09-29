import Image from "next/image";
import Link from "next/link";
import { UserRound, ArrowRight, PencilLine, ShieldCheck } from "lucide-react";
import { getOwnProfile, mediaPreviews } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/verified-badge";
import type { Profile } from "@/lib/supabase/database.types";
import {getOwnItems} from '@/lib/businesses';
import {WorkManager} from '@/components/work-manager';
const statuses: Record<Profile["status"], { label: string; copy: string }> = {
  suspended: {
    label: "Suspended",
    copy: "Your profile is hidden and editing is paused. Please read the review note below. An administrator must restore the profile before you can make changes.",
  },
  draft: {
    label: "Draft",
    copy: "Your story is taking shape. Finish your profile and send it to our team for review.",
  },
  pending: {
    label: "Pending review",
    copy: "Your profile has been submitted. Our team will review your details before your profile can be listed.",
  },
  approved: {
    label: "Approved",
    copy: "Your profile has passed community review. Changes will return it to pending review and remove it from public listings until it is approved again.",
  },
  rejected: {
    label: "Not approved",
    copy: "Please review the note below, update your details, and submit your profile again.",
  },
  changes_requested: {
    label: "Changes requested",
    copy: "Our team needs a little more information. Follow the note below and submit your updated profile.",
  },
};
export default async function Account() {
  const profile = await getOwnProfile();
  const previews = await mediaPreviews(profile);
  const status = statuses[profile.status];
  const items=await getOwnItems();
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-9">
        <p className="eyebrow mb-3">A place to grow</p>
        <h1 className="text-3xl sm:text-4xl">
          Welcome
          {profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Your skills, your story, your next chapter.
        </p>
      </div>
      <section className="rounded-2xl border bg-background p-6 sm:p-9">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary">
            {profile.photo_url && previews[profile.photo_url] ? (
              <Image
                src={previews[profile.photo_url]}
                alt="Your profile photo"
                width={80}
                height={80}
                unoptimized
                className="size-20 object-cover"
              />
            ) : (
              <UserRound size={32} strokeWidth={1.3} />
            )}
          </div>
          <div>
            <h2 className="text-2xl">
              {profile.full_name || "Your Hunar profile"}
            </h2>
            {profile.username && (
              <p className="mt-1 text-sm text-muted-foreground">
                @{profile.username}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <Badge variant="secondary">{status.label}</Badge>
              {profile.is_verified && <VerifiedBadge />}
            </div>
          </div>
        </div>
        <p className="mt-7 max-w-2xl text-sm leading-7 text-muted-foreground">
          {status.copy}
        </p>
        {profile.rejection_note && (
          <div className="mt-5 rounded-xl border border-[#e8d19c] bg-[#fcf3dd] p-5">
            <h3 className="font-sans text-sm font-semibold">
              A note from the review team
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
              {profile.rejection_note}
            </p>
          </div>
        )}
        {profile.status !== "suspended" && (
          <Button asChild className="mt-7 h-12">
            <Link href="/account/submit">
              <PencilLine />
              {profile.status === "draft"
                ? "Complete your profile"
                : "Edit your profile"}
              <ArrowRight />
            </Link>
          </Button>
        )}
        {profile.role === "admin" && profile.status !== "suspended" && (
          <Button asChild variant="outline" className="mt-7 h-12 sm:ml-3">
            <Link href="/admin">
              Community administration
              <ArrowRight />
            </Link>
          </Button>
        )}
      </section>
      <div className="mt-6 flex items-start gap-3 rounded-xl border p-5 text-sm leading-6 text-muted-foreground">
        <ShieldCheck className="mt-1 size-5 shrink-0 text-primary" />
        <p>
          Your contact details are fetched only when a visitor opens Contact.
          Only approved profiles appear in the public directory.
        </p>
      </div>
      <section className="mt-8 rounded-2xl border bg-background p-6">
        <h2 className="text-2xl">Keep learning</h2>
        <p className="mt-2 text-sm text-muted-foreground">Your course enrollments and lesson progress live in one place.</p>
        <Button asChild className="mt-4"><Link href="/account/courses">My courses <ArrowRight/></Link></Button>
        {profile.role === "instructor" && profile.status === "approved" && profile.is_verified && (
          <Button asChild variant="outline" className="ml-2 mt-4"><Link href="/account/teach">Teach a course <ArrowRight/></Link></Button>
        )}
      </section>
      <WorkManager {...items} suspended={profile.status==='suspended'}/>
    </div>
  );
}
