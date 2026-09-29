"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/form-field";
import { deleteCourseLesson, deleteCourseModule, saveCourse, saveCourseLesson, saveCourseModule } from "@/app/courses/actions";
import type { Category, Course, CourseModule, Lesson } from "@/lib/supabase/database.types";

const initial = { title: "", slug: "", category_id: "", thumbnail: "", short_description: "", description: "", level: "beginner", language: "English", duration_text: "", price: 0 };
export function CourseBuilder({ categories, course, modules, lessons }: { categories: Category[]; course?: Course | null; modules?: CourseModule[]; lessons?: Lesson[] }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [message, setMessage] = useState("");
  const [values, setValues] = useState({ ...initial, ...(course ?? {}), thumbnail: course?.thumbnail ?? "", price: course?.price ?? 0 });
  const set = (key: string, value: string | number) => setValues((old) => ({ ...old, [key]: value }));
  function save(intent: "draft" | "submit") {
    start(async () => {
      const result = await saveCourse(values, intent, course?.id);
      if (result.error) setMessage(result.error);
      else if (result.id) { setMessage(result.message ?? "Saved."); router.push(`/account/courses/${result.id}`); router.refresh(); }
    });
  }
  return <div className="mx-auto max-w-4xl space-y-8">
    <div><p className="eyebrow mb-2">Teach what you know</p><h1 className="text-3xl">{course ? "Course builder" : "Create a course"}</h1><p className="mt-3 text-sm text-muted-foreground">Use plain text for the course outline. Instructors must be verified, and every course is reviewed before publication.</p></div>
    {course?.review_note && <p className="rounded-xl border border-[#e8d19c] bg-[#fcf3dd] p-4 text-sm">Review note: {course.review_note}</p>}
    <section className="space-y-5 rounded-2xl border bg-background p-6">
      <Field id="course-title" label="Course title"><input id="course-title" className={inputClass} maxLength={140} value={values.title} onChange={(e)=>set("title",e.target.value)}/></Field>
      <Field id="course-slug" label="Course URL name"><input id="course-slug" className={inputClass} value={values.slug} onChange={(e)=>set("slug",e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-"))} placeholder="everyday-watercolor"/></Field>
      <Field id="course-category" label="Hunar category"><select id="course-category" className={inputClass} value={values.category_id} onChange={(e)=>set("category_id",e.target.value)}><option value="">Choose category</option>{categories.map((c)=><option value={c.id} key={c.id}>{c.name}</option>)}</select></Field>
      <Field id="course-summary" label="Short description"><textarea id="course-summary" className={inputClass} rows={2} maxLength={240} value={values.short_description} onChange={(e)=>set("short_description",e.target.value)}/></Field>
      <Field id="course-description" label="What learners will learn" hint="Plain text, up to 20,000 characters. Line breaks are preserved."><textarea id="course-description" className={inputClass} rows={7} maxLength={20000} value={values.description} onChange={(e)=>set("description",e.target.value)}/></Field>
      <Field id="course-thumbnail" label="Cover image URL" hint="A publicly viewable HTTPS image URL."><input id="course-thumbnail" type="url" className={inputClass} value={values.thumbnail} onChange={(e)=>set("thumbnail",e.target.value)}/></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="course-level" label="Level"><select id="course-level" className={inputClass} value={values.level} onChange={(e)=>set("level",e.target.value)}>{["beginner","intermediate","advanced"].map(x=><option key={x} value={x}>{x}</option>)}</select></Field>
        <Field id="course-language" label="Language"><input id="course-language" className={inputClass} maxLength={60} value={values.language} onChange={(e)=>set("language",e.target.value)}/></Field>
        <Field id="course-duration" label="Estimated duration"><input id="course-duration" className={inputClass} maxLength={80} value={values.duration_text} onChange={(e)=>set("duration_text",e.target.value)} placeholder="4 hours"/></Field>
        <Field id="course-price" label="Price in INR (0 = free)"><input id="course-price" type="number" min="0" step="1" className={inputClass} value={values.price} onChange={(e)=>set("price",Number(e.target.value))}/></Field>
      </div>
      <div className="flex flex-wrap gap-3"><Button type="button" disabled={pending} variant="outline" onClick={()=>save("draft")}>Save draft</Button><Button type="button" disabled={pending} onClick={()=>save("submit")}>Submit for review</Button></div>
      <p role="status" className="text-sm">{message}</p>
    </section>
    {course && <section className="space-y-5 rounded-2xl border bg-background p-6"><div><h2 className="text-2xl">Course curriculum</h2><p className="mt-2 text-sm text-muted-foreground">Set numeric order values to arrange modules and lessons.</p></div>
      {(modules ?? []).map((module)=><div key={module.id} className="rounded-xl border p-4"><div className="flex justify-between gap-3"><h3 className="font-semibold">{module.sort_order + 1}. {module.title}</h3><Button variant="ghost" type="button" disabled={pending} onClick={()=>start(async()=>{await deleteCourseModule(module.id);router.refresh()})}>Remove module</Button></div>
        {(lessons ?? []).filter(l=>l.module_id===module.id).map(lesson=><div key={lesson.id} className="flex items-center justify-between border-t py-3 text-sm"><span>{lesson.sort_order+1}. {lesson.title} · {lesson.type}{lesson.is_preview?" · preview":""}</span><Button variant="ghost" size="sm" type="button" disabled={pending} onClick={()=>start(async()=>{await deleteCourseLesson(lesson.id);router.refresh()})}>Remove</Button></div>)}
        <LessonForm module={module} order={(lessons ?? []).filter(l=>l.module_id===module.id).length} onSaved={()=>{setMessage("Lesson added.");router.refresh()}} />
      </div>)}
      <ModuleForm courseId={course.id} order={(modules ?? []).length} onSaved={()=>{setMessage("Module added.");router.refresh()}} />
    </section>}
  </div>;
}

function ModuleForm({courseId,order,onSaved}:{courseId:string;order:number;onSaved:()=>void}) {
  const [pending,start]=useTransition(); const [title,setTitle]=useState(""); const [position,setPosition]=useState(order); const [message,setMessage]=useState("");
  return <form className="grid gap-3 sm:grid-cols-[1fr_100px_auto]" onSubmit={(e)=>{e.preventDefault();start(async()=>{const r=await saveCourseModule({course_id:courseId,title,sort_order:position});setMessage(r.error??r.message??"");if(!r.error){setTitle("");setPosition(position+1);onSaved()}})}}>
    <label className="sr-only" htmlFor="new-module">Module title</label><input id="new-module" className={inputClass} value={title} onChange={e=>setTitle(e.target.value)} placeholder="New module title" required/><label className="sr-only" htmlFor="module-order">Module order</label><input id="module-order" type="number" min="0" className={inputClass} value={position} onChange={e=>setPosition(Number(e.target.value))}/>
    <Button disabled={pending}>Add module</Button><p role="status" className="text-sm sm:col-span-3">{message}</p>
  </form>;
}
function LessonForm({module,order,onSaved}:{module:CourseModule;order:number;onSaved:()=>void}) {
  const [pending,start]=useTransition(); const [title,setTitle]=useState(""); const [type,setType]=useState("text"); const [video,setVideo]=useState(""); const [attachment,setAttachment]=useState(""); const [content,setContent]=useState(""); const [preview,setPreview]=useState(false); const [position,setPosition]=useState(order); const [message,setMessage]=useState("");
  return <form className="mt-4 space-y-3 border-t pt-4" onSubmit={(e)=>{e.preventDefault();start(async()=>{const r=await saveCourseLesson({module_id:module.id,title,type,video_url:video,content,attachment_url:attachment,duration_minutes:0,is_preview:preview,sort_order:position});setMessage(r.error??r.message??"");if(!r.error){setTitle("");setVideo("");setAttachment("");setContent("");setPosition(position+1);onSaved()}})}}>
    <h4 className="text-sm font-semibold">Add lesson</h4><input className={inputClass} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Lesson title" required/>
    <div className="grid gap-3 sm:grid-cols-2"><select className={inputClass} value={type} onChange={e=>setType(e.target.value)}><option value="text">Text lesson</option><option value="video">Video</option><option value="pdf">PDF / reading</option></select>
      {type==="video" && <input type="url" className={inputClass} value={video} onChange={e=>setVideo(e.target.value)} placeholder="HTTPS video URL" required/>}</div>
    {type==="pdf"&&<input type="url" className={inputClass} value={attachment} onChange={e=>setAttachment(e.target.value)} placeholder="HTTPS PDF or reading URL"/>}
    <label className="block text-sm">Lesson order<input type="number" min="0" className={`${inputClass} mt-2`} value={position} onChange={e=>setPosition(Number(e.target.value))}/></label>
    <textarea className={inputClass} rows={3} maxLength={30000} value={content} onChange={e=>setContent(e.target.value)} placeholder="Lesson notes (plain text)"/>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={preview} onChange={e=>setPreview(e.target.checked)}/> Free preview after course publication</label>
    <Button variant="outline" disabled={pending}>Add lesson</Button><p role="status" className="text-sm">{message}</p>
  </form>;
}
