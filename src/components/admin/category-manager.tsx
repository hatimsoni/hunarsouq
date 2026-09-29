"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowUp, ArrowDown, Pencil, Plus } from "lucide-react";
import { categorySchema, categoryIcons } from "@/lib/admin-validation";
import {
  saveCategory,
  reorderCategories,
  type AdminResult,
} from "@/app/admin/actions";
import type { Category } from "@/lib/supabase/database.types";
import { Field, inputClass } from "@/components/form-field";
import { Button } from "@/components/ui/button";
const blank = {
  id: "",
  revision: "",
  name: "",
  slug: "",
  description: "",
  icon: "Palette" as const,
};
export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [result, setResult] = useState<AdminResult>({});
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: blank,
  });
  const edit = (category: Category) => {
    setEditing(category.id);
    setResult({});
    reset({
      ...category,
      icon:
        categorySchema.shape.icon.safeParse(category.icon).data ?? "Palette",
      revision: category.updated_at ?? "",
    });
    document.getElementById("category-name")?.focus();
  };
  const move = (index: number, direction: number) =>
    startTransition(async () => {
      setResult({});
      const expected = categories.map((category) => category.id);
      const ids = [...expected];
      [ids[index], ids[index + direction]] = [
        ids[index + direction],
        ids[index],
      ];
      try {
        const response = await reorderCategories({ ids, expected });
        setResult(response);
        if (!response.error) {
          setEditing(null);
          reset(blank);
          router.refresh();
        }
      } catch {
        setResult({
          error:
            "The order could not be confirmed. Reload before trying again.",
        });
      }
    });
  return (
    <div className="grid items-start gap-7 lg:grid-cols-[1fr_360px]">
      <section className="min-w-0 overflow-x-auto rounded-xl border bg-background">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-secondary text-xs">
            <tr>
              <th scope="col" className="p-4">
                Category
              </th>
              <th scope="col" className="p-4">
                Order
              </th>
              <th scope="col" className="p-4">
                Edit
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category, index) => (
              <tr key={category.id} className="border-b last:border-0">
                <td className="p-4">
                  <p className="font-medium">{category.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    /{category.slug}
                  </p>
                </td>
                <td className="p-4">
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="size-11"
                      aria-label={`Move ${category.name} up`}
                      disabled={pending || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="size-11"
                      aria-label={`Move ${category.name} down`}
                      disabled={pending || index === categories.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown />
                    </Button>
                  </div>
                </td>
                <td className="p-4">
                  <Button
                    variant="ghost"
                    className="size-11"
                    aria-label={`Edit ${category.name}`}
                    disabled={pending}
                    onClick={() => edit(category)}
                  >
                    <Pencil />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <form
        className="space-y-5 rounded-xl border bg-background p-6"
        noValidate
        onSubmit={handleSubmit((value) =>
          startTransition(async () => {
            setResult({});
            try {
              const response = await saveCategory(value);
              setResult(response);
              if (!response.error) {
                setEditing(null);
                reset(blank);
                router.refresh();
              }
            } catch {
              setResult({
                error: "The category could not be saved. Please try again.",
              });
            }
          }),
        )}
      >
        <h2 className="text-xl">
          {editing ? "Edit category" : "Add a category"}
        </h2>
        <fieldset disabled={pending} className="space-y-5">
          <Field id="category-name" label="Name" error={errors.name?.message}>
            <input
              id="category-name"
              className={inputClass}
              {...register("name")}
            />
          </Field>
          <Field
            id="category-slug"
            label="Slug"
            error={errors.slug?.message}
            hint="Used in category links. Keep established slugs where possible."
          >
            <input
              id="category-slug"
              className={inputClass}
              {...register("slug")}
            />
          </Field>
          <Field
            id="category-description"
            label="Description"
            error={errors.description?.message}
          >
            <textarea
              id="category-description"
              rows={3}
              maxLength={250}
              className={inputClass}
              {...register("description")}
            />
          </Field>
          <Field id="category-icon" label="Icon" error={errors.icon?.message}>
            <select
              id="category-icon"
              className={inputClass}
              {...register("icon")}
            >
              {categoryIcons.map((icon) => (
                <option key={icon}>{icon}</option>
              ))}
            </select>
          </Field>
        </fieldset>
        {result.error && (
          <p role="alert" className="text-sm text-destructive">
            {result.error}
          </p>
        )}
        {result.message && (
          <p role="status" className="rounded-lg bg-secondary p-3 text-sm">
            {result.message}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" className="h-11" disabled={pending}>
            {pending ? "Saving…" : editing ? "Save changes" : "Add category"}
            <Plus />
          </Button>
          {editing && (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={pending}
              onClick={() => {
                setEditing(null);
                reset(blank);
                setResult({});
              }}
            >
              Cancel edit
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
