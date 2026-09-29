import Link from "next/link";
import Image from "next/image";
import type { PublicCourse } from "@/lib/supabase/database.types";
export function CourseCard({course,category}:{course:PublicCourse;category:string}) {
  return <article className="overflow-hidden rounded-2xl border bg-background">
    <Link href={`/courses/${course.slug}`} className="block min-h-40 bg-[#e7eadf]" aria-label={`View ${course.title}`}>
      {course.thumbnail?<Image src={course.thumbnail} alt="" width={600} height={320} unoptimized className="h-48 w-full object-cover"/>:<div className="flex h-48 items-center justify-center font-display text-5xl text-primary/55">H</div>}
    </Link>
    <div className="p-5"><p className="text-xs font-medium text-primary">{category} · {course.level}</p><h2 className="mt-2 text-2xl"><Link href={`/courses/${course.slug}`}>{course.title}</Link></h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{course.short_description}</p><p className="mt-4 text-sm">By <Link className="underline underline-offset-4" href={`/${course.instructor_username}`}>{course.instructor_name}</Link> · {course.language}</p><div className="mt-4 flex items-center justify-between border-t pt-4 text-sm"><span>{course.price===0?"Free":`₹${course.price.toLocaleString("en-IN")}`}</span><span>{course.average_rating?`★ ${course.average_rating} · ${course.review_count}`:"New course"}</span></div></div>
  </article>;
}
