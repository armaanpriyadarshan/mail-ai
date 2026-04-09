// Provisional shared types. Migrate to generated supabase types once the schema settles.

export type CampaignStatus = "draft" | "sending" | "paused" | "completed" | "failed";
export type RecipientStatus = "queued" | "sent" | "failed";
export type Tier = "free" | "pro";

export interface Profile {
  id: string;
  gmail_email: string | null;
  daily_send_limit: number;
  default_signature: string | null;
  subscription_tier: Tier;
  created_at: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  status: CampaignStatus;
  subject_template: string | null;
  body_template: string | null;
  ai_personalize: boolean;
  audience_query: string | null;
  created_at: string;
}

export interface Recipient {
  id: string;
  campaign_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  title: string | null;
  personalized_subject: string | null;
  personalized_body: string | null;
  status: RecipientStatus;
  sent_at: string | null;
  error: string | null;
}

export interface Lead {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  title: string | null;
  company: string | null;
  linkedin_url?: string | null;
}
