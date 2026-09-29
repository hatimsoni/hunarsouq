import { notFound, redirect } from "next/navigation";
import { getLearnerCourse } from "@/lib/courses";
export const dynamic="force-dynamic";
export default async function LearnCourse({params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params;const data=await getLearnerCourse(slug);if(!data)notFound();
 if(data.current)redirect(`/learn/${encodeURIComponent(slug)}/${data.current.id}`);
 return <main className="mx-auto max-w-3xl p-8"><h1 className="text-3xl">{data.course.title}</h1><p className="mt-4">Your instructor is preparing the lessons. Check back soon.</p></main>;
}
