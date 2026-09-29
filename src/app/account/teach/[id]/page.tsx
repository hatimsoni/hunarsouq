import { notFound } from "next/navigation";
import { getHomeData } from "@/lib/home";
import { getOwnedCourse } from "@/lib/courses";
import { CourseBuilder } from "@/components/course-builder";
export const dynamic="force-dynamic";
export default async function EditCourse({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();const [data,{categories}]=await Promise.all([getOwnedCourse(id),getHomeData()]);if(!data)notFound();return <CourseBuilder course={data.course} modules={data.modules} lessons={data.lessons} categories={categories}/>}
