"use client";
import { useState } from "react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { Button } from "./ui/button";
export function BusinessGallery({
  id,
  name,
  photos,
}: {
  id: string;
  name: string;
  photos: string[];
}) {
  const [active, setActive] = useState(0);
  return (
    <Dialog.Root>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((_, i) => (
          <Dialog.Trigger key={i} asChild>
            <button
              onClick={() => setActive(i)}
              aria-label={`View ${name} photo ${i + 1}`}
              className="overflow-hidden rounded-xl border"
            >
              <Image
                src={`/media/business/${id}/${i}`}
                alt={`${name}, photo ${i + 1}`}
                width={480}
                height={480}
                unoptimized
                className="aspect-square w-full object-cover"
              />
            </button>
          </Dialog.Trigger>
        ))}
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft")
              setActive((active + photos.length - 1) % photos.length);
            if (e.key === "ArrowRight") setActive((active + 1) % photos.length);
          }}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background p-6"
        >
          <Dialog.Title className="text-2xl">{name}</Dialog.Title>
          <Dialog.Description className="my-3 text-sm">
            Photo {active + 1} of {photos.length}
          </Dialog.Description>
          <Image
            src={`/media/business/${id}/${active}`}
            alt={`${name}, photo ${active + 1}`}
            width={1200}
            height={900}
            unoptimized
            className="max-h-[60dvh] w-full object-contain"
          />
          <div className="mt-4 flex justify-between">
            <Button
              variant="outline"
              onClick={() =>
                setActive((active + photos.length - 1) % photos.length)
              }
            >
              Previous photo
            </Button>
            <Button
              variant="outline"
              onClick={() => setActive((active + 1) % photos.length)}
            >
              Next photo
            </Button>
          </div>
          <Dialog.Close asChild>
            <Button className="mt-3" variant="ghost">
              Close
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
