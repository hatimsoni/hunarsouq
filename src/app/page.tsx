import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ShieldCheck,
  Sprout,
  LockKeyhole,
  MoveUpRight,
  Sparkles,
  UserRoundPlus,
  PencilRuler,
  CheckCheck,
  Store,
  Users,
  Flower2,
} from "lucide-react";
import { Container, Section } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { CategoryBrowser } from "@/components/category-browser";
import { FAQ } from "@/components/faq";
import { getHomeData } from "@/lib/home";
import { RecentMembers } from "@/components/recent-members";

const promises = [
  {
    icon: ShieldCheck,
    title: "People, not algorithms",
    copy: "Every profile is reviewed by a real person before it joins the community.",
  },
  {
    icon: Sprout,
    title: "Your talent belongs here",
    copy: "No listing fees. No gatekeeping. Just a place to share what you do well.",
  },
  {
    icon: LockKeyhole,
    title: "Open doors. Private details.",
    copy: "You choose how people reach you. Your number stays off public pages.",
  },
];
const steps = [
  {
    icon: UserRoundPlus,
    title: "Join the community",
    copy: "Make yourself at home. Create your free Hunar Souq account.",
  },
  {
    icon: PencilRuler,
    title: "Add your work",
    copy: "Share your skills, your story, and the work you’re proud of.",
  },
  {
    icon: CheckCheck,
    title: "Get verified",
    copy: "Our team personally reviews your profile with care.",
  },
  {
    icon: Store,
    title: "Find your people",
    copy: "Get listed and connect with people who need your hunar.",
  },
];
export default async function Home() {
  const data = await getHomeData();
  return (
    <>
      <section className="hero-paper overflow-hidden">
        <Container className="grid items-center gap-12 py-14 lg:min-h-[620px] lg:grid-cols-[1.12fr_1fr] lg:gap-16 lg:py-16">
          <div className="relative z-10">
            <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d6dfcc] bg-[#ecf0e1] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
              <span className="size-1.5 rounded-full bg-primary" />
              Local talent. Lasting connections.
            </p>
            <h1 className="max-w-xl text-[3rem] leading-[1.13] tracking-[-0.045em] sm:text-[4rem] xl:text-[4.5rem]">
              Good people.
              <br />
              Beautiful <span className="italic text-[#377553]">skills.</span>
              <br />
              Endless possibilities.
            </h1>
            <p className="mt-6 max-w-[410px] text-[15px] leading-7 text-muted-foreground">
              Discover the talent around you. Share the skill within you. A
              trusted community where every hunar finds its place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="h-12 rounded-lg px-6">
                <Link href="/signup">
                  Join Hunar Souq <ArrowUpRight />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 border-primary/25 bg-transparent px-6"
              >
                <Link href="#skills">
                  Browse Hunar <ArrowRight />
                </Link>
              </Button>
            </div>
            <div className="mt-7 flex items-center gap-2.5 text-xs text-muted-foreground">
              <ShieldCheck size={20} className="shrink-0 text-primary" />
              <span>
                <strong className="font-semibold text-foreground">
                  {data.verifiedMembers === null
                    ? "A community taking shape"
                    : `${data.verifiedMembers.toLocaleString()} verified members`}
                </strong>{" "}
                · Growing together.
              </span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[470px] px-4 pb-8 pt-3 lg:pl-2 lg:pr-4">
            <div className="absolute inset-x-0 bottom-12 top-0 rotate-[5deg] rounded-t-full rounded-b-2xl border border-[#c4b890]" />
            <div className="craft-frame relative h-[380px] overflow-hidden sm:h-[460px]">
              <Image
                src="/craft-studio.jpg"
                alt="An artisan shaping a clay pot by hand on a pottery wheel"
                fill
                priority
                sizes="(max-width: 1024px) 90vw, 470px"
                className="object-cover object-[42%_center]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#152e25]/80 via-transparent to-transparent" />
              <div className="absolute bottom-16 left-7 text-white">
                <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/75">
                  The heart of Hunar Souq
                </p>
                <p className="font-display text-2xl leading-snug">
                  Behind every skill,
                  <br />
                  there’s a human story.
                </p>
              </div>
            </div>
            <div className="absolute -right-1 top-14 flex size-24 -rotate-12 flex-col items-center justify-center rounded-full border-[5px] border-[#f5f1df] bg-[#e8be62] text-center text-[#244737] shadow-sm">
              <Flower2 size={25} strokeWidth={1.2} />
              <span className="mt-1 text-[8px] font-bold uppercase leading-3 tracking-widest">
                Made of
                <br />
                possibilities
              </span>
            </div>
            <div className="absolute bottom-0 left-0 flex items-center gap-3 rounded-xl border border-white bg-[#fffef9] px-5 py-4 shadow-lg shadow-black/5">
              <span className="flex size-10 items-center justify-center rounded-full bg-[#eaf0e3]">
                <BadgeCheck size={24} className="text-primary" />
              </span>
              <div>
                <p className="text-sm font-semibold">
                  Real people. Real skills.
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Human review. Community trust.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>
      <div className="border-y bg-[#eeefe5]">
        <Container className="flex flex-wrap items-center justify-center gap-x-14 gap-y-3 py-5 text-xs text-[#526751]">
          {[
            { icon: ShieldCheck, text: "Human-reviewed profiles" },
            { icon: Sprout, text: "Free to join & list" },
            { icon: LockKeyhole, text: "Your privacy comes first" },
          ].map(({ icon: Icon, text }) => (
            <p key={text} className="flex items-center gap-2">
              <Icon size={17} strokeWidth={1.5} />
              {text}
            </p>
          ))}
        </Container>
      </div>
      <Section id="skills">
        <Container>
          <CategoryBrowser
            categories={data.categories}
            memberCounts={data.memberCounts}
          />
          {data.source === "unavailable" && (
            <p
              role="status"
              className="mt-4 text-center text-xs text-muted-foreground"
            >
              Showing our launch categories while the directory reconnects.
            </p>
          )}
        </Container>
      </Section>
      <Section className="border-y bg-[#f1f2ea]" id="how-it-works">
        <Container>
          <div className="text-center">
            <p className="eyebrow mb-3">Your skill deserves to be seen</p>
            <h2 className="section-title">A little step. A new beginning.</h2>
            <p className="mt-4 text-sm text-muted-foreground">
              From “I can do this” to “Here’s who can help.”
            </p>
          </div>
          <div className="mt-12 grid gap-9 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, copy }, i) => (
              <div key={title} className="relative">
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-full border border-[#d4decd] bg-background">
                    <Icon size={20} strokeWidth={1.5} />
                  </span>
                  <span className="text-[10px] font-medium tracking-widest text-muted-foreground">
                    STEP 0{i + 1}
                  </span>
                  {i < 3 && (
                    <ArrowRight className="ml-auto hidden size-5 text-[#c5cebd]" />
                  )}
                </div>
                <h3 className="text-xl">{title}</h3>
                <p className="mt-3 max-w-60 text-sm leading-6 text-muted-foreground">
                  {copy}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>
      <Section>
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <p className="eyebrow mb-3">Built on trust, from day one</p>
            <h2 className="section-title">
              A marketplace with
              <br />a little more heart.
            </h2>
            <Link
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium"
              href="/about"
            >
              Get to know us <MoveUpRight size={15} />
            </Link>
          </div>
          <div className="grid gap-7 sm:grid-cols-3">
            {promises.map(({ icon: Icon, title, copy }) => (
              <div key={title}>
                <Icon
                  className="mb-5 size-6 text-[#779065]"
                  strokeWidth={1.5}
                />
                <h3 className="font-sans text-sm font-semibold leading-6">
                  {title}
                </h3>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {copy}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>
      <Container>
        <div className="grid grid-cols-2 gap-y-7 rounded-2xl bg-[#eaeedf] px-5 py-9 md:grid-cols-4">
          {[
            [
              data.verifiedMembers === null
                ? "—"
                : data.verifiedMembers.toLocaleString(),
              "Verified members",
            ],
            [
              data.verifiedBusinesses === null
                ? "—"
                : data.verifiedBusinesses.toLocaleString(),
              "Local businesses",
            ],
            [String(data.categories.length), "Ways to share your hunar"],
            [
              data.verifiedCourses === null
                ? "—"
                : data.verifiedCourses.toLocaleString(),
              "Courses to grow with",
            ],
          ].map(([number, label], i) => (
            <div
              key={label}
              className={`text-center ${i ? "md:border-l md:border-[#d0d9c5]" : ""}`}
            >
              <p
                className="font-display text-4xl"
              >
                {number}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          {data.source === "supabase"
            ? "Only approved and published community listings are counted."
            : "Our community is getting ready to open. Live member counts are not connected yet."}
        </p>
      </Container>
      <Section>
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="eyebrow mb-3">New faces. Fresh possibilities.</p>
              <h2 className="section-title">Meet your community.</h2>
            </div>
            <Link
              href="/hunar"
              className="flex items-center gap-2 text-sm font-medium"
            >
              Explore all hunar <ArrowRight size={16} />
            </Link>
          </div>
          {data.recentMembers.length ? (
            <RecentMembers
              members={data.recentMembers}
              categories={data.categories}
            />
          ) : (
            <div className="mt-8 flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed bg-white px-6 py-10 text-center sm:flex-row sm:text-left">
              <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-secondary">
                <Users size={28} strokeWidth={1.4} />
              </span>
              <div>
                <h3 className="text-xl">The first chapter starts with you.</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Our latest approved members will appear here. Bring your hunar
                  to the community.
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                className="h-11 shrink-0 sm:ml-auto"
              >
                <Link href="/signup">
                  Be part of it <ArrowUpRight />
                </Link>
              </Button>
            </div>
          )}
        </Container>
      </Section>
      <Section id="faq" className="border-t pt-10">
        <Container className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="eyebrow mb-3">A little clarity</p>
            <h2 className="section-title">
              Good questions.
              <br />
              Honest answers.
            </h2>
            <p className="mt-5 text-sm text-muted-foreground">
              Something else on your mind?
            </p>
            <Link
              href="/contact"
              className="mt-2 inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4"
            >
              Let’s talk <ArrowUpRight size={14} />
            </Link>
          </div>
          <FAQ />
        </Container>
      </Section>
      <Container className="pb-20">
        <section className="relative overflow-hidden rounded-2xl bg-[#194f41] px-6 py-14 text-center text-white">
          <Flower2
            aria-hidden="true"
            strokeWidth={0.35}
            className="absolute -left-20 -top-10 size-80 text-white/10"
          />
          <Sparkles
            className="mx-auto mb-5 size-6 text-[#e8c675]"
            strokeWidth={1.3}
          />
          <h2 className="relative font-display text-3xl sm:text-[2.6rem]">
            You have a hunar.
            <br className="sm:hidden" /> Let the world find it.
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg text-sm leading-6 text-white/75">
            A skill you’ve honed. A passion you’ve nurtured.
            <br />
            There’s someone out there looking for exactly what you do.
          </p>
          <Button
            asChild
            className="relative mt-7 h-12 bg-[#e9c777] px-7 text-[#254638] hover:bg-[#f1d58e]"
          >
            <Link href="/signup">
              Find your place in Hunar Souq <ArrowUpRight />
            </Link>
          </Button>
          <p className="mt-4 text-[11px] text-white/65">
            Free to join. Made for everyone.
          </p>
        </section>
      </Container>
    </>
  );
}
