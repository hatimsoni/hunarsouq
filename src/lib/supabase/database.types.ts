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
  status:
    | "draft"
    | "pending"
    | "approved"
    | "rejected"
    | "changes_requested"
    | "suspended";
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
      businesses: {
        Row: Business;
        Insert: Partial<Business> & {
          owner_id: string;
          name: string;
          slug: string;
          type: Business["type"];
        };
        Update: Partial<Business>;
        Relationships: [];
      };
      work_experiences: {
        Row: WorkExperience;
        Insert: Partial<WorkExperience> & {
          profile_id: string;
          title: string;
          organisation: string;
          start_date: string;
        };
        Update: Partial<WorkExperience>;
        Relationships: [];
      };
      business_verification_logs: {
        Row: Omit<VerificationLog, "profile_id"> & {
          business_id: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          profile_id: string | null;
          reason: string;
          details: string;
          status: string;
          created_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      verification_logs: {
        Row: VerificationLog;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      profile_status_emails: {
        Row: StatusEmail;
        Insert: never;
        Update: Partial<StatusEmail>;
        Relationships: [];
      };
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
      courses: {
        Row: Course;
        Insert: Partial<Course> & Pick<Course, "title" | "slug" | "category_id" | "instructor_id" | "short_description" | "description" | "level" | "duration_text">;
        Update: Partial<Course>;
        Relationships: [];
      };
      course_modules: {
        Row: CourseModule;
        Insert: Partial<CourseModule> & Pick<CourseModule, "course_id" | "title">;
        Update: Partial<CourseModule>;
        Relationships: [];
      };
      lessons: {
        Row: Lesson;
        Insert: Partial<Lesson> & Pick<Lesson, "module_id" | "title" | "type">;
        Update: Partial<Lesson>;
        Relationships: [];
      };
      enrollments: {
        Row: Enrollment;
        Insert: Pick<Enrollment, "user_id" | "course_id"> & Partial<Pick<Enrollment, "id" | "enrolled_at" | "completed_at">>;
        Update: never;
        Relationships: [];
      };
      lesson_progress: {
        Row: LessonProgress;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      certificates: {
        Row: Certificate;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      course_reviews: {
        Row: CourseReview;
        Insert: Pick<CourseReview, "user_id" | "course_id" | "rating" | "comment">;
        Update: Partial<Pick<CourseReview, "rating" | "comment">>;
        Relationships: [];
      };
      payments: {
        Row: Payment;
        Insert: Omit<Payment, "id" | "created_at" | "paid_at" | "razorpay_payment_id"> & Partial<Pick<Payment, "id" | "created_at" | "paid_at" | "razorpay_payment_id">>;
        Update: Partial<Payment>;
        Relationships: [];
      };
    };
    Views: {
      public_profiles: { Row: PublicProfile; Relationships: [] };
      public_businesses: { Row: PublicBusiness; Relationships: [] };
      public_work_experiences: {
        Row: Omit<WorkExperience, "created_at" | "updated_at">;
        Relationships: [];
      };
      public_courses: { Row: PublicCourse; Relationships: [] };
      public_course_reviews: { Row: PublicCourseReview; Relationships: [] };
    };
    Functions: {
      search_businesses: {
        Args: {
          keyword: string;
          type_filter: string;
          city_filter: string;
          page_number: number;
        };
        Returns: Json;
      };
      review_business: {
        Args: {
          target_id: string;
          decision: string;
          review_note: string;
          expected_updated_at: string;
        };
        Returns: string;
      };
      reveal_business_contact: {
        Args: { target_id: string; visitor_key: string };
        Returns: Json;
      };
      search_hunar: {
        Args: {
          keyword: string;
          skill: string;
          city_filter: string;
          availability_filter: string;
          page_number: number;
        };
        Returns: Json;
      };
      hunar_cities: {
        Args: Record<string, never>;
        Returns: { city: string }[];
      };
      reveal_profile_contact: {
        Args: { target_id: string; visitor_key: string };
        Returns: Json;
      };
      report_public_profile: {
        Args: {
          target_id: string;
          visitor_key: string;
          report_reason: string;
          report_details: string;
        };
        Returns: Json;
      };
      review_public_report: {
        Args: { report_id: string; decision: string };
        Returns: undefined;
      };
      username_available: { Args: { candidate: string }; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      review_profile: {
        Args: {
          target_id: string;
          decision: string;
          review_note: string;
          expected_updated_at: string;
        };
        Returns: string;
      };
      save_category: {
        Args: {
          category_id: string | null;
          category_slug: string;
          category_name: string;
          category_description: string;
          category_icon: string;
          expected_updated_at: string | null;
        };
        Returns: string;
      };
      reorder_categories: {
        Args: { ordered_ids: string[]; expected_order: string[] };
        Returns: undefined;
      };
      claim_status_email: {
        Args: { event_id: string; email_payload: Json };
        Returns: StatusEmail[];
      };
      public_home_snapshot: { Args: Record<string, never>; Returns: Json };
      enroll_free_course: { Args: { target_course: string }; Returns: string };
      mark_lesson_complete: { Args: { target_lesson: string }; Returns: string | null };
      review_course: { Args: { target_course: string; decision: string; review_note: string }; Returns: undefined };
      set_course_instructor: { Args: { target_user: string; enabled: boolean }; Returns: undefined };
      verify_certificate: { Args: { target_code: string }; Returns: Json };
      course_content_visible: { Args: { target_course: string }; Returns: boolean };
      lesson_content_visible: { Args: { target_lesson: string; preview: boolean }; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json | undefined };
export type Business = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  type: "home_business" | "shop" | "service" | "studio" | "online" | "other";
  description: string;
  logo: string | null;
  photos: string[];
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  instagram: string;
  show_call: boolean;
  show_email: boolean;
  status: Profile["status"];
  is_verified: boolean;
  rejection_note: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
};
export type PublicBusiness = Omit<
  Business,
  | "phone"
  | "whatsapp"
  | "email"
  | "show_call"
  | "show_email"
  | "status"
  | "rejection_note"
  | "updated_at"
> & { owner_name: string; owner_username: string };
export type WorkExperience = {
  id: string;
  profile_id: string;
  title: string;
  organisation: string;
  start_date: string;
  end_date: string | null;
  description: string;
  created_at: string;
  updated_at: string;
};

export type Course = {
  id: string; title: string; slug: string; category_id: string; instructor_id: string;
  thumbnail: string | null; short_description: string; description: string;
  level: "beginner" | "intermediate" | "advanced"; language: string;
  duration_text: string; price: number;
  status: "draft" | "pending" | "published" | "rejected" | "changes_requested";
  review_note: string | null; is_featured: boolean; created_at: string; updated_at: string;
};
export type CourseModule = { id: string; course_id: string; title: string; sort_order: number };
export type Lesson = {
  id: string; module_id: string; title: string; type: "video" | "text" | "pdf";
  video_url: string | null; content: string; attachment_url: string | null;
  duration_minutes: number; is_preview: boolean; sort_order: number;
};
export type Enrollment = { id: string; user_id: string; course_id: string; enrolled_at: string; completed_at: string | null };
export type LessonProgress = { user_id: string; lesson_id: string; completed_at: string };
export type Certificate = { id: string; user_id: string; course_id: string; certificate_code: string; issued_at: string };
export type CourseReview = { user_id: string; course_id: string; rating: number; comment: string; created_at: string; updated_at: string };
export type Payment = { id: string; user_id: string; course_id: string; razorpay_order_id: string; razorpay_payment_id: string | null; amount: number; status: "created" | "paid" | "failed" | "refunded"; created_at: string; paid_at: string | null };
export type PublicCourse = Omit<Course, "status" | "review_note" | "is_featured"> & {
  instructor_name: string; instructor_username: string; instructor_photo: string | null; instructor_verified: boolean;
  learner_count: number; module_count: number; total_minutes: number; average_rating: number | null; review_count: number;
};
export type PublicCourseReview = { course_id: string; rating: number; comment: string; created_at: string; learner_name: string; learner_username: string };
export type PublicCertificate = { certificate_code: string; issued_at: string; course_title: string; learner_name: string; learner_username: string };
export type VerificationLog = {
  id: string;
  profile_id: string | null;
  reviewer_id: string | null;
  action: string;
  from_status: string;
  to_status: string;
  note: string;
  created_at: string;
};
export type StatusEmail = {
  id: string;
  profile_id: string;
  to_email: string;
  full_name: string;
  new_status: string;
  note: string;
  created_at: string;
  sent_at: string | null;
  provider_id: string | null;
  attempts: number;
  first_attempt_at: string | null;
  locked_until: string | null;
  lease_token: string | null;
  payload: Json | null;
  last_error: string | null;
  needs_attention: boolean;
};
