import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen, Search } from "lucide-react";
import { Container, Section } from "@/components/layout";
import { CourseCard } from "@/components/course-card";
import { getHomeData } from "@/lib/home";
import { listPublicCourses } from "@/lib/courses";
export const metadata: Metadata = { title: "Learn a new hunar", description: "Practical courses taught by verified Hunar Souq instructors." };
export const dynamic = "force-dynamic";
export default async function CoursesPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const params=await searchParams; const one=(x:string|string[]|undefined)=>Array.isArray(x)?x[0]:x;
  const filters={q:one(params.q),category:one(params.category),level:one(params.level),price:one(params.price),language:one(params.language),instructor:one(params.instructor)};
  const [{categories},courses]=await Promise.all([getHomeData(),listPublicCourses(filters)]);
  const categoryNames=new Map(categories.map(c=>[c.id,c.name]));
  return <Section className="min-h-[65vh] bg-[#f3f3ec]"><Container>
    <div className="max-w-3xl"><p className="eyebrow mb-3">Learn from people who do</p><h1 className="text-4xl sm:text-5xl">A little guidance. A new possibility.</h1><p className="mt-4 text-muted-foreground">Explore community courses by verified instructors. Every course is reviewed before it is published.</p></div>
    <form className="my-8 grid gap-3 rounded-2xl border bg-background p-4 sm:grid-cols-2 lg:grid-cols-6" action="/courses">
      <label className="relative lg:col-span-2"><span className="sr-only">Search courses</span><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><input name="q" defaultValue={filters.q} className="h-11 w-full rounded-md border bg-background pl-10 pr-3 text-sm" placeholder="Search courses"/></label>
      <select className="h-11 rounded-md border bg-background px-3 text-sm" name="category" defaultValue={filters.category??""}><option value="">Every hunar</option>{categories.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select>
      <select className="h-11 rounded-md border bg-background px-3 text-sm" name="level" defaultValue={filters.level??""}><option value="">Every level</option>{["beginner","intermediate","advanced"].map(v=><option key={v}>{v}</option>)}</select>
      <select className="h-11 rounded-md border bg-background px-3 text-sm" name="price" defaultValue={filters.price??""}><option value="">Any price</option><option value="free">Free</option><option value="paid">Paid</option></select>
      <input className="h-11 rounded-md border bg-background px-3 text-sm" name="language" defaultValue={filters.language} placeholder="Language" maxLength={60}/>
      {filters.instructor&&<input type="hidden" name="instructor" value={filters.instructor}/>}
      <button className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground lg:col-span-6">Find a course</button>
    </form>
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{courses.map(course=><CourseCard key={course.id} course={course} category={categoryNames.get(course.category_id)??"Hunar"}/>)}</div>
    {courses.length===0&&<div className="rounded-2xl border bg-background px-6 py-14 text-center"><BookOpen className="mx-auto size-9 text-primary"/><h2 className="mt-4 text-2xl">Courses are taking shape</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">No published courses match these filters yet. Approved instructors can share practical lessons here soon.</p><Link href="/account" className="mt-5 inline-flex min-h-11 items-center font-medium text-primary">Teach a course</Link></div>}
  </Container></Section>;
}
