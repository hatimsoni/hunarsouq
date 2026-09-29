import { z } from "zod";
export const homeSnapshotSchema = z.object({
  verified_members: z.number().int().nonnegative(),
  verified_businesses: z.number().int().nonnegative(),
  verified_courses: z.number().int().nonnegative().default(0),
  categories: z.array(
    z.object({
      id: z.string().uuid(),
      slug: z.string(),
      name: z.string(),
      description: z.string(),
      icon: z.string(),
      sort_order: z.number().int(),
      member_count: z.number().int().nonnegative(),
    }),
  ),
  recent_members: z.array(
    z.object({
      id: z.string().uuid(),
      full_name: z.string(),
      username: z.string(),
      city: z.string(),
      category_id: z.string().uuid(),
      has_photo: z.boolean(),
      approved_at: z.string().nullable(),
    }),
  ),
});
export type RecentMember = z.infer<
  typeof homeSnapshotSchema
>["recent_members"][number];
