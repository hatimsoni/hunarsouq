-- Phase 1: public taxonomy only. No profile/contact data is stored here.
begin;
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '',
  icon text not null default 'Palette',
  sort_order integer not null default 0 check (sort_order >= 0)
);
create index categories_sort_order_idx on public.categories(sort_order);
alter table public.categories enable row level security;
revoke all on public.categories from anon, authenticated;
grant select on public.categories to anon, authenticated;
create policy "Anyone can read categories" on public.categories for select to anon, authenticated using (true);
-- No client write grants or policies. Admin category management is Phase 3.
insert into public.categories (slug, name, description, icon, sort_order) values
('tailoring-stitching', 'Tailoring & Stitching', 'A perfect fit, made with care.', 'Scissors', 0),
('catering-cooking', 'Catering & Cooking', 'Good food. Unforgettable gatherings.', 'CookingPot', 1),
('architect', 'Architect', 'Thoughtful spaces for everyday life.', 'Ruler', 2),
('lawyer', 'Lawyer', 'Clarity and guidance when it matters.', 'Scale', 3),
('software-it', 'Software & IT', 'Digital solutions, human expertise.', 'CodeXml', 4),
('engineer', 'Engineer', 'Turning possibilities into progress.', 'Cog', 5),
('teacher', 'Teacher', 'A little guidance. A world of possibility.', 'BookOpen', 6),
('business-trading', 'Business & Trading', 'Local enterprise, lasting connections.', 'Store', 7),
('doctor-healthcare', 'Doctor & Healthcare', 'Care for you and your community.', 'HeartPulse', 8),
('accountant', 'Accountant', 'Make sense of the numbers.', 'Calculator', 9),
('digital-marketing-graphics', 'Digital Marketing & Graphics', 'Ideas that help your story stand out.', 'Megaphone', 10),
('real-estate', 'Real Estate', 'Find your next place to belong.', 'House', 11),
('service-provider', 'Service Provider', 'Reliable help for everyday needs.', 'Wrench', 12),
('travel-events', 'Travel & Events', 'Moments worth making memories of.', 'Plane', 13),
('artist', 'Artist', 'Imagination, brought to life by hand.', 'Palette', 14),
('photography-videography', 'Photography & Videography', 'Your moments, beautifully captured.', 'Camera', 15),
('jewellery-gemstones', 'Jewellery & Gemstones', 'Small details. Extraordinary craft.', 'Gem', 16);
commit;
