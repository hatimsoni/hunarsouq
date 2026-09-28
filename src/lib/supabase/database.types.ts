export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
};
export type Profile = {
  id: string;
  full_name: string;
  username: string | null;
  photo_url: string | null;
  category_id: string | null;
  sub_skills: string[];
  bio: string;
  city: string;
  state: string;
  country: string;
  years_experience: number;
  availability: "available" | "busy" | "not_taking_work";
  phone: string;
  whatsapp: string;
  email_public: string;
  show_call: boolean;
  show_email: boolean;
  links: {
    instagram?: string;
    website?: string;
    portfolio?: string;
    youtube?: string;
    linkedin?: string;
  };
  portfolio_images: string[];
  status: "draft" | "pending" | "approved" | "rejected" | "changes_requested";
  rejection_note: string | null;
  is_verified: boolean;
  role: "member" | "admin" | "instructor";
  created_at: string;
  approved_at: string | null;
  updated_at: string;
};
export type PublicProfile = Omit<
  Profile,
  | "phone"
  | "whatsapp"
  | "email_public"
  | "show_call"
  | "show_email"
  | "status"
  | "rejection_note"
  | "role"
  | "updated_at"
>;
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, "id"> & { id?: string };
        Update: Partial<Category>;
        Relationships: [];
      };
    };
    Views: { public_profiles: { Row: PublicProfile; Relationships: [] } };
    Functions: {
      username_available: { Args: { candidate: string }; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
