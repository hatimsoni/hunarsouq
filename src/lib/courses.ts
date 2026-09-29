import "server-only";
import { createClient } from "@/lib/supabase/server";
import { publicClient } from "@/lib/directory";
import type { Course, CourseModule, Lesson, PublicCourse, PublicCourseReview } from "@/lib/supabase/database.types";

export type CourseFilters = { q?: string; category?: string; level?: string; price?: string; language?: string; instructor?: string };
export async function listPublicCourses(filters: CourseFilters = {}) {
  const db = publicClient();
  if (!db) return [] as PublicCourse[];
  let query = db.from("public_courses").select("*").order("created_at", { ascending: false }).limit(60);
  if (filters.category) query = query.eq("category_id", filters.category);
  if (filters.instructor && /^[0-9a-f-]{36}$/i.test(filters.instructor)) query = query.eq("instructor_id", filters.instructor);
  if (["beginner", "intermediate", "advanced"].includes(filters.level ?? "")) query = query.eq("level", filters.level as PublicCourse["level"]);
  if (filters.price === "free") query = query.eq("price", 0);
  if (filters.price === "paid") query = query.gt("price", 0);
  if (filters.language) query = query.ilike("language", filters.language.slice(0, 60));
  if (filters.q) query = query.or(`title.ilike.%${filters.q.slice(0, 80).replace(/[%(),]/g, " ")}%,short_description.ilike.%${filters.q.slice(0, 80).replace(/[%(),]/g, " ")}%`);
  const { data, error } = await query;
  if (error) return [] as PublicCourse[];
  return (data ?? []) as PublicCourse[];
}

export async function getPublicCourse(slug: string) {
  const db = publicClient();
  if (!db) return null;
  const { data: course } = await db.from("public_courses").select("*").eq("slug", slug).maybeSingle();
  if (!course) return null;
  const { data: modules } = await db.from("course_modules").select("*").eq("course_id", course.id).order("sort_order");
  const moduleRows = (modules ?? []) as CourseModule[];
  const lessons: Lesson[] = [];
  for (const courseModule of moduleRows) {
    const { data } = await db.from("lessons").select("*").eq("module_id", courseModule.id).order("sort_order");
    lessons.push(...((data ?? []) as Lesson[]));
  }
  const { data: reviews } = await db.from("public_course_reviews").select("*").eq("course_id", course.id).order("created_at", { ascending: false }).limit(30);
  return { course: course as PublicCourse, modules: moduleRows, lessons, reviews: (reviews ?? []) as PublicCourseReview[] };
}

export async function getInstructorCourses() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [] as Course[];
  const { data } = await supabase.from("courses").select("*").eq("instructor_id", user.id).order("updated_at", { ascending: false });
  return (data ?? []) as Course[];
}

export async function getOwnedCourse(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const { data: modules } = await supabase.from("course_modules").select("*").eq("course_id", id).order("sort_order");
  const moduleRows = (modules ?? []) as CourseModule[];
  const lessons: Lesson[] = [];
  for (const courseModule of moduleRows) {
    const { data: rows } = await supabase.from("lessons").select("*").eq("module_id", courseModule.id).order("sort_order");
    lessons.push(...((rows ?? []) as Lesson[]));
  }
  return { course: data as Course, modules: moduleRows, lessons };
}

export async function getLearnerCourse(slug: string, lessonId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: course } = await supabase.from("courses").select("*").eq("slug", slug).maybeSingle();
  if (!course) return null;
  const { data: enrollment } = await supabase.from("enrollments").select("*").eq("user_id", user.id).eq("course_id", course.id).maybeSingle();
  if (!enrollment) return null;
  const { data: modules } = await supabase.from("course_modules").select("*").eq("course_id", course.id).order("sort_order");
  const moduleRows = (modules ?? []) as CourseModule[];
  const lessons: Lesson[] = [];
  for (const courseModule of moduleRows) {
    const { data: rows } = await supabase.from("lessons").select("*").eq("module_id", courseModule.id).order("sort_order");
    lessons.push(...((rows ?? []) as Lesson[]));
  }
  const { data: progress } = await supabase.from("lesson_progress").select("*").eq("user_id", user.id);
  const { data: certificate } = await supabase.from("certificates").select("*").eq("user_id", user.id).eq("course_id", course.id).maybeSingle();
  const progressRows = progress ?? [];
  const current = lessonId
    ? lessons.find((lesson) => lesson.id === lessonId)
    : lessons.find((lesson) => !progressRows.some((item) => item.lesson_id === lesson.id)) ?? lessons.at(-1);
  return { course: course as Course, enrollment, modules: moduleRows, lessons, progress: progressRows, certificate, current: current ?? null };
}

export async function getMyEnrollments() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: enrollments } = await supabase.from("enrollments").select("*").eq("user_id", user.id).order("enrolled_at", { ascending: false });
  const rows = enrollments ?? [];
  const output = [];
  for (const enrollment of rows) {
    const { data: course } = await supabase.from("courses").select("id,title,slug,thumbnail,short_description,status").eq("id", enrollment.course_id).maybeSingle();
    if (course) {
      const moduleIds = (await supabase.from("course_modules").select("id").eq("course_id", course.id)).data?.map((m) => m.id) ?? [];
      const lessonIds = moduleIds.length ? (await supabase.from("lessons").select("id").in("module_id", moduleIds)).data?.map((l) => l.id) ?? [] : [];
      const count = lessonIds.length;
      const { count: completed } = lessonIds.length ? await supabase.from("lesson_progress").select("lesson_id", { count: "exact", head: true }).eq("user_id", user.id).in("lesson_id", lessonIds) : { count: 0 };
      output.push({ enrollment, course, total: count ?? 0, completed: completed ?? 0 });
    }
  }
  return output;
}
