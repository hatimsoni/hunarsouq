"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Menu, X, Flower2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "./layout";

export function Logo() {
  return (
    <Link
      href="/"
      aria-label="Hunar Souq home"
      className="flex items-center gap-2.5"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-primary text-[#f1d494]">
        <Flower2 size={28} strokeWidth={1.4} />
      </span>
      <span className="font-display text-[25px] font-semibold tracking-tight">
        hunar<span className="font-normal">souq</span>
        <span className="text-[#b28b3f]">.</span>
      </span>
    </Link>
  );
}
const nav = [
  ["Hunar", "/hunar"],
  ["Business", "/business"],
  ["Courses", "/courses"],
];
export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="relative z-30 border-b border-border/60 bg-background">
      <Container className="flex h-21 items-center justify-between gap-6">
        <Logo />
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-9 text-sm font-medium md:flex"
        >
          {nav.map(([label, href]) => (
            <Link
              className="transition-colors hover:text-primary/60"
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
          <span className="h-5 border-l" />
          <Link href="/login">Sign in</Link>
          <Button asChild className="h-11 rounded-lg px-5">
            <Link href="/signup">
              Join the community <ArrowUpRight />
            </Link>
          </Button>
        </nav>
        <Button
          variant="ghost"
          size="icon"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen(!open)}
          className="size-11 md:hidden"
        >
          {open ? <X /> : <Menu />}
        </Button>
      </Container>
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile navigation"
          className="border-t bg-background p-5 md:hidden"
        >
          {[
            ...nav,
            ["Sign in", "/login"],
            ["Join the community", "/signup"],
          ].map(([label, href]) => (
            <Link
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 hover:bg-secondary"
              key={href}
              href={href}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
export function Footer() {
  return (
    <footer className="border-t bg-[#f0f1e9] pt-14">
      <Container>
        <div className="grid gap-10 pb-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-64 text-sm leading-7 text-muted-foreground">
              A place for your skill.
              <br />A community for your growth.
            </p>
            <p className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
              Made with <Heart className="size-3 text-primary" /> for people who
              make.
            </p>
          </div>
          {(
            [
              [
                "Browse",
                [
                  ["Find a hunar", "/hunar"],
                  ["Businesses", "/business"],
                  ["Courses", "/courses"],
                ],
              ],
              [
                "Members",
                [
                  ["Join Hunar Souq", "/signup"],
                  ["Sign in", "/login"],
                  ["Community guidelines", "/guidelines"],
                ],
              ],
              [
                "About",
                [
                  ["Our story", "/about"],
                  ["Get in touch", "/contact"],
                  ["FAQs", "/#faq"],
                ],
              ],
              [
                "Legal",
                [
                  ["Privacy policy", "/privacy"],
                  ["Terms of use", "/terms"],
                ],
              ],
            ] as [string, string[][]][]
          ).map(([heading, links]) => (
            <div key={heading}>
              <p className="mb-4 text-sm font-semibold">{heading}</p>
              <ul className="space-y-1">
                {links.map(([label, href]) => (
                  <li key={href}>
                    <Link
                      className="inline-block py-2 text-xs text-muted-foreground hover:text-primary"
                      href={href}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t py-6 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Hunar Souq. All rights reserved.</p>
          <p>Rooted in community. Built on trust.</p>
        </div>
      </Container>
    </footer>
  );
}
