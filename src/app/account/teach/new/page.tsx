import { getHomeData } from "@/lib/home";
import { CourseBuilder } from "@/components/course-builder";
export const dynamic="force-dynamic";
export default async function NewCourse(){const {categories}=await getHomeData();return <CourseBuilder categories={categories}/>}
