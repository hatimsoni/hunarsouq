export type SearchParams = Record<string, string | string[] | undefined>;
export const availabilityLabels = {
  available: "Available for work",
  busy: "Currently busy",
  not_taking_work: "Not taking work",
};
export function directoryFilters(params: SearchParams) {
  const one = (key: string) =>
    typeof params[key] === "string" ? params[key].trim().slice(0, 100) : "";
  const n = Number(one("page"));
  const availability = one("availability");
  return {
    q: one("q"),
    skill: one("skill"),
    city: one("city"),
    availability: Object.hasOwn(availabilityLabels, availability)
      ? availability
      : "",
    verified: one("verified") === "1",
    page: Number.isInteger(n) && n > 0 ? Math.min(n, 10000) : 1,
  };
}
export function directoryHref(
  filters: ReturnType<typeof directoryFilters>,
  page: number,
) {
  const query = new URLSearchParams();
  for (const key of ["q", "skill", "city", "availability"] as const)
    if (filters[key]) query.set(key, filters[key]);
  if (filters.verified) query.set("verified", "1");
  if (page > 1) query.set("page", String(page));
  return `/hunar${query.size ? `?${query}` : ""}`;
}
