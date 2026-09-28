import type { Category } from "./supabase/database.types";

const seeds = [
  [
    "tailoring-stitching",
    "Tailoring & Stitching",
    "A perfect fit, made with care.",
    "Scissors",
  ],
  [
    "catering-cooking",
    "Catering & Cooking",
    "Good food. Unforgettable gatherings.",
    "CookingPot",
  ],
  ["architect", "Architect", "Thoughtful spaces for everyday life.", "Ruler"],
  ["lawyer", "Lawyer", "Clarity and guidance when it matters.", "Scale"],
  [
    "software-it",
    "Software & IT",
    "Digital solutions, human expertise.",
    "CodeXml",
  ],
  ["engineer", "Engineer", "Turning possibilities into progress.", "Cog"],
  [
    "teacher",
    "Teacher",
    "A little guidance. A world of possibility.",
    "BookOpen",
  ],
  [
    "business-trading",
    "Business & Trading",
    "Local enterprise, lasting connections.",
    "Store",
  ],
  [
    "doctor-healthcare",
    "Doctor & Healthcare",
    "Care for you and your community.",
    "HeartPulse",
  ],
  ["accountant", "Accountant", "Make sense of the numbers.", "Calculator"],
  [
    "digital-marketing-graphics",
    "Digital Marketing & Graphics",
    "Ideas that help your story stand out.",
    "Megaphone",
  ],
  ["real-estate", "Real Estate", "Find your next place to belong.", "House"],
  [
    "service-provider",
    "Service Provider",
    "Reliable help for everyday needs.",
    "Wrench",
  ],
  [
    "travel-events",
    "Travel & Events",
    "Moments worth making memories of.",
    "Plane",
  ],
  ["artist", "Artist", "Imagination, brought to life by hand.", "Palette"],
  [
    "photography-videography",
    "Photography & Videography",
    "Your moments, beautifully captured.",
    "Camera",
  ],
  [
    "jewellery-gemstones",
    "Jewellery & Gemstones",
    "Small details. Extraordinary craft.",
    "Gem",
  ],
] as const;

export const categories: Category[] = seeds.map(
  ([slug, name, description, icon], sort_order) => ({
    id: slug,
    slug,
    name,
    description,
    icon,
    sort_order,
  }),
);
