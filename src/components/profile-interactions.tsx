"use client";
import { useState, useTransition } from "react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { inputClass } from "./form-field";
import { revealContact, reportProfile } from "@/app/hunar/actions";
import { revealBusinessContact } from "@/app/business/actions";

function Modal({
  title,
  description,
  children,
  sheet = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  sheet?: boolean;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
      <Dialog.Content
        className={`fixed z-50 max-h-[90dvh] overflow-y-auto bg-background p-6 shadow-xl ${sheet ? "inset-x-0 bottom-0 rounded-t-2xl sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:max-h-dvh sm:w-[440px] sm:rounded-none" : "left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-xl"}`}
      >
        <Dialog.Title className="pr-10 font-display text-2xl">
          {title}
        </Dialog.Title>
        <Dialog.Description className="my-4 text-sm text-muted-foreground">
          {description}
        </Dialog.Description>
        <Dialog.Close asChild>
          <Button
            variant="ghost"
            className="absolute right-3 top-3"
            aria-label="Close"
          >
            <X />
          </Button>
        </Dialog.Close>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
export function ContactButton({
  id,
  name,
  resource = "profile",
}: {
  id: string;
  name: string;
  resource?: "profile" | "business";
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof revealContact>
  > | null>(null);
  const [pending, start] = useTransition();
  function onOpen(value: boolean) {
    setOpen(value);
    setResult(null);
    if (value)
      start(async () => {
        try {
          setResult(
            await (resource === "business"
              ? revealBusinessContact(id)
              : revealContact(id)),
          );
        } catch {
          setResult({
            error: "Could not load contact options. Please try again.",
          });
        }
      });
  }
  const c = result?.contact;
  const phone = c && /^\+[1-9]\d{7,14}$/.test(c.phone) ? c.phone : null;
  const whatsapp =
    c && /^\+[1-9]\d{7,14}$/.test(c.whatsapp) ? c.whatsapp : null;
  const email =
    c && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email) ? c.email : null;
  return (
    <Dialog.Root open={open} onOpenChange={onOpen}>
      <Dialog.Trigger asChild>
        <Button size="lg">Contact {name.split(" ")[0]}</Button>
      </Dialog.Trigger>
      <Modal
        title={`Connect with ${name}`}
        description="Please respect their availability and contact preferences."
        sheet
      >
        <div aria-live="polite" className="space-y-4">
          {pending && <p>Loading contact options…</p>}
          {result?.error && <p role="alert">{result.error}</p>}
          {c && (
            <>
              {phone && (
                <Button asChild className="w-full">
                  <a href={`tel:${phone}`}>Call {phone}</a>
                </Button>
              )}
              {whatsapp && (
                <Button asChild variant="outline" className="w-full">
                  <a
                    href={`https://wa.me/${whatsapp.slice(1)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Message on WhatsApp
                  </a>
                </Button>
              )}
              {email && (
                <Button asChild variant="outline" className="w-full">
                  <a href={`mailto:${email}`}>Send an email</a>
                </Button>
              )}
              {!phone && !whatsapp && !email && (
                <p>This member hasn’t enabled contact options yet.</p>
              )}
            </>
          )}
        </div>
      </Modal>
    </Dialog.Root>
  );
}
export function ShareProfile() {
  const [message, setMessage] = useState("");
  async function share() {
    const url = window.location.origin + window.location.pathname;
    try {
      if (navigator.share)
        await navigator.share({ title: document.title, url });
      else {
        await navigator.clipboard.writeText(url);
        setMessage("Profile link copied.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setMessage("Copy the address from your browser to share this profile.");
    }
  }
  return (
    <div>
      <Button variant="outline" onClick={share}>
        Share profile
      </Button>
      <p className="mt-2 text-xs" role="status">
        {message}
      </p>
    </div>
  );
}
export function Portfolio({
  id,
  count,
  name,
}: {
  id: string;
  count: number;
  name: string;
}) {
  const [active, setActive] = useState(0);
  return (
    <Dialog.Root>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: count }, (_, index) => (
          <Dialog.Trigger key={index} asChild>
            <button
              className="overflow-hidden rounded-xl border focus-visible:outline-2"
              onClick={() => setActive(index)}
              aria-label={`View portfolio image ${index + 1}`}
            >
              <Image
                src={`/media/member-portfolio/${id}/${index}`}
                alt={`${name}'s work, image ${index + 1}`}
                width={480}
                height={480}
                unoptimized
                className="aspect-square w-full object-cover transition hover:scale-105"
              />
            </button>
          </Dialog.Trigger>
        ))}
      </div>
      <Modal
        title={`${name}'s portfolio`}
        description={`Image ${active + 1} of ${count}`}
      >
        <div
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setActive((active + count - 1) % count);
            if (e.key === "ArrowRight") setActive((active + 1) % count);
          }}
        >
          <Image
            src={`/media/member-portfolio/${id}/${active}`}
            alt={`${name}'s work, image ${active + 1}`}
            width={1200}
            height={900}
            unoptimized
            className="max-h-[55dvh] w-full object-contain"
          />
          <div className="mt-4 flex justify-between">
            <Button
              variant="outline"
              onClick={() => setActive((active + count - 1) % count)}
            >
              Previous image
            </Button>
            <Button
              variant="outline"
              onClick={() => setActive((active + 1) % count)}
            >
              Next image
            </Button>
          </div>
        </div>
      </Modal>
    </Dialog.Root>
  );
}
export function ReportButton({ id }: { id: string }) {
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="ghost">Report this profile</Button>
      </Dialog.Trigger>
      <Modal
        title="Report this profile"
        description="Tell the review team what needs attention. Your report is private; avoid adding sensitive personal details."
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            start(async () => {
              try {
                const result = await reportProfile({
                  id,
                  reason: data.get("reason"),
                  details: data.get("details"),
                });
                setDone(!!result.success);
                setMessage(
                  result.error ??
                    "Thank you. The review team will look into your report.",
                );
              } catch {
                setMessage("Could not submit your report. Please try again.");
              }
            });
          }}
        >
          <label className="block space-y-2">
            Reason
            <select
              name="reason"
              required
              className={inputClass}
              disabled={done}
            >
              <option value="spam">Spam or unwanted promotion</option>
              <option value="misleading">Misleading information</option>
              <option value="inappropriate">Inappropriate content</option>
              <option value="other">Something else</option>
            </select>
          </label>
          <label className="block space-y-2">
            Details
            <textarea
              name="details"
              required
              minLength={10}
              maxLength={2000}
              rows={5}
              className={inputClass}
              disabled={done}
            />
          </label>
          <Button disabled={pending || done}>
            {pending ? "Submitting…" : "Submit report"}
          </Button>
          <p role="status">{message}</p>
        </form>
      </Modal>
    </Dialog.Root>
  );
}
