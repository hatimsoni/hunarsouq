"use server";
import { revalidatePath, updateTag } from "next/cache";
import { randomUUID } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";
import { courseSchema, lessonSchema, moduleSchema } from "@/lib/course-validation";

export type CourseActionResult = { error?: string; message?: string; id?: string; order?: { id: string; amount: number; currency: string }; certificate?: string | null };
function refreshCourses(slug?: string) {
  updateTag("home");
  revalidatePath("/"); revalidatePath("/courses"); revalidatePath("/account", "layout");
  revalidatePath("/admin", "layout");
  if (slug) revalidatePath(`/courses/${slug}`);
}
function serviceClient() {
  const env = getSupabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !key) return null;
  return createSupabaseClient<Database>(env.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function requireInstructor() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("role,status,is_verified").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "instructor" || profile.status !== "approved" || !profile.is_verified)
    return { error: "Only approved, verified instructors can create courses." } as const;
  return { supabase, user } as const;
}

export async function saveCourse(input: unknown, intent: "draft" | "submit", id?: string): Promise<CourseActionResult> {
  const auth = await requireInstructor();
  if ("error" in auth) return { error: auth.error };
  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the course details." };
  const v = parsed.data;
  const row = { ...v, thumbnail: v.thumbnail || null, status: intent === "submit" ? "pending" as const : "draft" as const };
  const query = id
    ? auth.supabase.from("courses").update(row).eq("id", id).eq("instructor_id", auth.user.id)
    : auth.supabase.from("courses").insert({ ...row, instructor_id: auth.user.id });
  const { data, error } = await query.select("id,slug").maybeSingle();
  if (error) return { error: error.code === "23505" ? "That course URL is already used." : "Course could not be saved. Check your instructor access and fields." };
  if (!data) return { error: "The course changed or is no longer editable." };
  refreshCourses(data.slug);
  return { id: data.id, message: intent === "submit" ? "Submitted for human review." : "Draft saved." };
}

export async function saveCourseModule(input: unknown): Promise<CourseActionResult> {
  const auth = await requireInstructor(); if ("error" in auth) return { error: auth.error };
  const parsed = moduleSchema.safeParse(input); if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { error, data } = await auth.supabase.from("course_modules").insert(parsed.data).select("id").maybeSingle();
  if (error || !data) return { error: "Could not add this module. Use a different order number." };
  refreshCourses(); return { id: data.id, message: "Module added." };
}

export async function saveCourseLesson(input: unknown): Promise<CourseActionResult> {
  const auth = await requireInstructor(); if ("error" in auth) return { error: auth.error };
  const parsed = lessonSchema.safeParse(input); if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const v = parsed.data;
  const { error, data } = await auth.supabase.from("lessons").insert({ ...v, video_url: v.video_url || null, attachment_url: v.attachment_url || null }).select("id").maybeSingle();
  if (error || !data) return { error: "Could not add this lesson. Check its fields and order number." };
  refreshCourses(); return { id: data.id, message: "Lesson added." };
}

export async function deleteCourseModule(id: string): Promise<CourseActionResult> {
  const auth = await requireInstructor(); if ("error" in auth) return { error: auth.error };
  const { error } = await auth.supabase.from("course_modules").delete().eq("id", id);
  if (error) return { error: "Could not remove this module." };
  refreshCourses(); return { message: "Module removed." };
}

export async function deleteCourseLesson(id: string): Promise<CourseActionResult> {
  const auth = await requireInstructor(); if ("error" in auth) return { error: auth.error };
  const { error } = await auth.supabase.from("lessons").delete().eq("id", id);
  if (error) return { error: "Could not remove this lesson." };
  refreshCourses(); return { message: "Lesson removed." };
}

export async function enrollFree(courseId: string): Promise<CourseActionResult> {
  const { supabase } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(courseId)) return { error: "Invalid course." };
  const { error } = await supabase.rpc("enroll_free_course", { target_course: courseId });
  if (error) return { error: error.code === "42501" ? "Sign in to enroll in this course." : "This free course could not be enrolled right now." };
  revalidatePath("/account/courses"); return { message: "You’re enrolled. Start learning whenever you’re ready." };
}

export async function createCourseOrder(courseId: string): Promise<CourseActionResult> {
  const { user } = await requireUser();
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const service = serviceClient();
  if (!keyId || !keySecret || !service) return { error: "Online payments are not configured yet. Please try a free course or check back soon." };
  if (!/^[0-9a-f-]{36}$/i.test(courseId)) return { error: "Invalid course." };
  const { data: course } = await service.from("public_courses").select("id,title,price").eq("id", courseId).maybeSingle();
  if (!course || course.price < 1) return { error: "This paid course is not available." };
  const { data: enrollment } = await service.from("enrollments").select("id").eq("user_id", user.id).eq("course_id", courseId).maybeSingle();
  if (enrollment) return { error: "You’re already enrolled in this course." };
  const { count } = await service.from("payments").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("course_id", courseId).eq("status", "created").gte("created_at", new Date(Date.now() - 5 * 60_000).toISOString());
  if ((count ?? 0) >= 3) return { error: "Too many checkout attempts. Wait a few minutes and try again." };
  const receipt = randomUUID();
  let response: Response;
  try {
    response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST", headers: { "content-type": "application/json", authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}` },
      body: JSON.stringify({ amount: course.price * 100, currency: "INR", receipt, notes: { user_id: user.id, course_id: course.id } }),
      signal: AbortSignal.timeout(10000),
    });
  } catch { return { error: "The payment service could not be reached. Try again." }; }
  if (!response.ok) return { error: "The payment service did not create an order. Try again later." };
  const order = await response.json() as { id?: string; amount?: number; currency?: string };
  if (!order.id || order.amount !== course.price * 100 || order.currency !== "INR") return { error: "The payment service returned an invalid order." };
  const { error } = await service.from("payments").insert({ user_id: user.id, course_id: course.id, razorpay_order_id: order.id, amount: course.price, status: "created" });
  if (error) return { error: "Could not record the checkout. Please contact support before retrying payment." };
  return { order: { id: order.id, amount: order.amount, currency: order.currency } };
}

export async function markLessonComplete(lessonId: string): Promise<CourseActionResult> {
  const { supabase } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(lessonId)) return { error: "Invalid lesson." };
  const { data, error } = await supabase.rpc("mark_lesson_complete", { target_lesson: lessonId });
  if (error) return { error: "Could not save lesson progress. Confirm that you are enrolled." };
  revalidatePath("/account/courses"); return { certificate: data };
}

export async function reviewCourse(courseId: string, decision: string, note: string): Promise<CourseActionResult> {
  const { supabase } = await import("@/lib/admin").then((m) => m.requireAdmin());
  if (!/^[0-9a-f-]{36}$/i.test(courseId) || !["approve", "reject", "request_changes"].includes(decision) || note.length > 2000)
    return { error: "Invalid review decision." };
  const { error } = await supabase.rpc("review_course", { target_course: courseId, decision, review_note: note });
  if (error) return { error: "This course could not be reviewed. Check its current status." };
  refreshCourses(); return { message: decision === "approve" ? "Course published." : "Course returned to the instructor." };
}

export async function submitCourseReview(courseId: string, rating: number, comment: string): Promise<CourseActionResult> {
  const { supabase, user } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(courseId) || !Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length > 1200) return { error: "Choose a rating from 1 to 5." };
  const { error } = await supabase.from("course_reviews").upsert({ user_id: user.id, course_id: courseId, rating, comment: comment.trim() }, { onConflict: "user_id,course_id" });
  if (error) return { error: "Reviews are available after enrolling in the course." };
  revalidatePath("/courses"); return { message: "Thanks for sharing your experience." };
}
