// React Query hooks. Thin wrappers over supabase + edge function calls.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "./supabase";
import type { Campaign, Lead, Profile, Recipient } from "./types";

// ---- profile ---------------------------------------------------------------
export function useProfile(userId: string | undefined) {
  return useQuery({
    enabled: !!userId,
    queryKey: ["profile", userId],
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .single();
      if (error) throw error;
      return data as Profile;
    },
  });
}

export function useUpdateProfile(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      const { error } = await supabase.from("profiles").update(patch).eq("id", userId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", userId] }),
  });
}

// ---- campaigns -------------------------------------------------------------
export function useCampaigns(userId: string | undefined) {
  return useQuery({
    enabled: !!userId,
    queryKey: ["campaigns", userId],
    queryFn: async (): Promise<Campaign[]> => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
  });
}

export function useCampaign(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ["campaign", id],
    queryFn: async (): Promise<Campaign> => {
      const { data, error } = await supabase.from("campaigns").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Campaign;
    },
  });
}

export function useRecipients(campaignId: string | undefined) {
  const qc = useQueryClient();

  // Realtime subscription — keeps the cache fresh as send-batch flips statuses.
  useEffect(() => {
    if (!campaignId) return;
    const channel = supabase
      .channel(`recipients:${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recipients",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => qc.invalidateQueries({ queryKey: ["recipients", campaignId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, qc]);

  return useQuery({
    enabled: !!campaignId,
    queryKey: ["recipients", campaignId],
    queryFn: async (): Promise<Recipient[]> => {
      const { data, error } = await supabase
        .from("recipients")
        .select("*")
        .eq("campaign_id", campaignId!)
        .order("email");
      if (error) throw error;
      return data as Recipient[];
    },
  });
}

// ---- edge function helpers -------------------------------------------------
async function invoke<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) throw error;
  return data as T;
}

export function useSearchLeads() {
  return useMutation({
    mutationFn: (input: { query: string; filters?: Record<string, unknown> }) =>
      invoke<{ leads: Lead[]; cached: boolean }>("search-leads", input),
  });
}

export function useGenerateEmail() {
  return useMutation({
    mutationFn: (input: { goal: string; context?: string; tone?: string }) =>
      invoke<{ subject: string; body: string }>("generate-email", input),
  });
}

export function usePersonalizeEmails() {
  return useMutation({
    mutationFn: (input: { campaign_id: string }) =>
      invoke<{ ok: boolean; updated: number }>("personalize-emails", input),
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: () => invoke<{ url: string }>("create-checkout", {}),
  });
}

// ---- compound: create campaign + recipients + start sending ----------------
export function useCreateCampaign(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      audience_query: string;
      subject_template: string;
      body_template: string;
      ai_personalize: boolean;
      leads: Lead[];
    }) => {
      const { data: campaign, error } = await supabase
        .from("campaigns")
        .insert({
          user_id: userId,
          name: input.name,
          audience_query: input.audience_query,
          subject_template: input.subject_template,
          body_template: input.body_template,
          ai_personalize: input.ai_personalize,
          status: "draft",
        })
        .select()
        .single();
      if (error) throw error;

      const rows = input.leads
        .filter((l) => l.email)
        .map((l) => ({
          campaign_id: campaign.id,
          email: l.email!,
          first_name: l.first_name,
          last_name: l.last_name,
          company: l.company,
          title: l.title,
        }));
      if (rows.length > 0) {
        const { error: rErr } = await supabase.from("recipients").insert(rows);
        if (rErr) throw rErr;
      }
      return campaign as Campaign;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns", userId] }),
  });
}

export function useStartCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from("campaigns")
        .update({ status: "sending" })
        .eq("id", campaignId);
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["campaign", id] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}
