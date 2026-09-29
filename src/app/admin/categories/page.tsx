import { requireAdmin } from "@/lib/admin";
import { CategoryManager } from "@/components/admin/category-manager";
export const metadata = { title: "Manage categories" };
export default async function Categories() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order")
    .order("id");
  if (error) throw new Error("Categories could not be loaded.");
  return (
    <>
      <h1 className="text-3xl">Room for every kind of hunar.</h1>
      <p className="mb-8 mt-3 text-sm leading-7 text-muted-foreground">
        Add, edit, and reorder the categories shown on the homepage. Changes
        take effect when saved.
      </p>
      <CategoryManager categories={data ?? []} />
    </>
  );
}
