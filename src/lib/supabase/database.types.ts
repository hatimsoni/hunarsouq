export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
  updated_at?: string;
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
  status: "draft" | "pending" | "approved" | "rejected" | "changes_requested" | "suspended";
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
      verification_logs: { Row: VerificationLog; Insert: never; Update: never; Relationships: [] };
      profile_status_emails: { Row: StatusEmail; Insert: never; Update: Partial<StatusEmail>; Relationships: [] };
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
      is_admin: { Args: Record<string,never>; Returns: boolean };
      review_profile: { Args: { target_id:string;decision:string;review_note:string;expected_updated_at:string }; Returns:string };
      save_category: { Args: {category_id:string|null;category_slug:string;category_name:string;category_description:string;category_icon:string;expected_updated_at:string|null}; Returns:string };
      reorder_categories: {Args:{ordered_ids:string[];expected_order:string[]};Returns:undefined};
      claim_status_email: {Args:{event_id:string;email_payload:Json};Returns:StatusEmail[]};
      public_home_snapshot: {Args:Record<string,never>;Returns:Json};
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
export type Json = string | number | boolean | null | Json[] | { [key:string]:Json|undefined };
export type VerificationLog = {id:string;profile_id:string|null;reviewer_id:string|null;action:string;from_status:string;to_status:string;note:string;created_at:string};
export type StatusEmail = {id:string;profile_id:string;to_email:string;full_name:string;new_status:string;note:string;created_at:string;sent_at:string|null;provider_id:string|null;attempts:number;first_attempt_at:string|null;locked_until:string|null;lease_token:string|null;payload:Json|null;last_error:string|null;needs_attention:boolean};
