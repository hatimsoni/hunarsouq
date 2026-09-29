import Link from "next/link";
import { notFound } from "next/navigation";
import { getLearnerCourse } from "@/lib/courses";
import { LessonComplete } from "@/components/lesson-complete";
import { Award } from "lucide-react";
export const dynamic="force-dynamic";
export default async function LearnLesson({params}:{params:Promise<{slug:string;lessonId:string}>}){
 const {slug,lessonId}=await params;const data=await getLearnerCourse(slug,lessonId);if(!data?.current)notFound();const lesson=data.current;const done=new Set(data.progress.map(p=>p.lesson_id));const total=data.lessons.length;const percent=total?Math.round(done.size/total*100):0;
 return <main className="min-h-[70vh] bg-[#f3f3ec]"><div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_350px] sm:px-8">
  <article className="rounded-2xl border bg-background p-6 sm:p-9"><Link className="eyebrow" href={`/courses/${data.course.slug}`}>← Course overview</Link><p className="mt-8 text-sm text-muted-foreground">{data.course.title}</p><h1 className="mt-2 text-3xl sm:text-4xl">{lesson.title}</h1><p className="mt-3 text-sm text-muted-foreground">{lesson.duration_minutes?`${lesson.duration_minutes} minutes`:lesson.type}</p>
   {lesson.type==="video"&&lesson.video_url&&<a className="mt-7 inline-flex min-h-12 items-center rounded-md bg-primary px-5 font-medium text-primary-foreground" href={lesson.video_url} target="_blank" rel="noreferrer">Open lesson video ↗</a>}
   {lesson.content&&<div className="mt-8 whitespace-pre-wrap break-words text-sm leading-7">{lesson.content}</div>}
   {lesson.attachment_url&&<a className="mt-6 inline-flex underline underline-offset-4" href={lesson.attachment_url} target="_blank" rel="noreferrer">Open lesson attachment ↗</a>}
   <LessonComplete lessonId={lesson.id} done={done.has(lesson.id)}/>
   {data.certificate&&<Link className="mt-5 inline-flex items-center gap-2 text-primary underline" href={`/verify/${data.certificate.certificate_code}`}><Award size={18}/>View completion certificate</Link>}
  </article>
  <aside className="h-fit rounded-2xl border bg-background p-5"><div className="flex justify-between text-sm"><strong>Your progress</strong><span>{percent}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{width:`${percent}%`}}/></div><p className="mt-2 text-xs text-muted-foreground">{done.size} of {total} lessons completed</p><nav className="mt-6 space-y-5">{data.modules.map((module,i)=><section key={module.id}><h2 className="text-sm font-semibold">{i+1}. {module.title}</h2><ul className="mt-2 space-y-1">{data.lessons.filter(l=>l.module_id===module.id).map(l=><li key={l.id}><Link aria-current={l.id===lesson.id?"page":undefined} className={`block rounded-md px-3 py-2 text-sm ${l.id===lesson.id?"bg-secondary font-semibold":"hover:bg-secondary/60"}`} href={`/learn/${encodeURIComponent(slug)}/${l.id}`}>{done.has(l.id?l.id:"")?"✓ ":""}{l.title}</Link></li>)}</ul></section>)}</nav></aside>
 </div></main>;
}
