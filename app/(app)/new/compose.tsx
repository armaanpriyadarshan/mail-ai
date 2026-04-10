import { useState } from "react";
import { View, Text, Alert, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { WizardProgress } from "@/components/WizardProgress";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { BottomSheet } from "@/components/BottomSheet";
import { Card } from "@/components/Card";
import { useDraft } from "@/lib/draft-store";
import {
  useCreateCampaign,
  useGenerateEmail,
  usePersonalizeEmails,
  useStartCampaign,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth-store";

// Client-side token substitution, used only for the preview sheet.
// The real fill happens inside send-batch.
function fillTokens(template: string, data: Record<string, string>) {
  return template.replaceAll(/\{([a-z0-9_]+)\}/g, (_, key) => data[key] ?? "");
}

export default function Compose() {
  const router = useRouter();
  const draft = useDraft();
  const { user } = useAuth();
  const [aiOpen, setAiOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [goal, setGoal] = useState("");
  const [context, setContext] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const generate = useGenerateEmail();
  const create = useCreateCampaign(user?.id);
  const start = useStartCampaign();
  const personalize = usePersonalizeEmails();

  const recipientCount = draft.leads.filter((l) => !!l.email).length;
  const canSave = !!draft.subject?.trim() && !!draft.body?.trim();

  const onGenerate = async () => {
    if (!goal) return;
    try {
      const out = await generate.mutateAsync({ goal, context });
      draft.set({ subject: out.subject, body: out.body });
      setAiOpen(false);
    } catch (e: any) {
      Alert.alert("Couldn't generate", e?.message ?? "Try again.");
    }
  };

  const insertToken = (t: string) => {
    draft.set({ body: (draft.body ?? "") + " " + t });
  };

  // Shared create path — used by both "Save as draft" and "Send campaign".
  const createCampaign = async () => {
    if (!draft.subject || !draft.body) {
      Alert.alert("Almost there", "Add a subject and body first.");
      return null;
    }
    try {
      const leads = draft.leads.filter((l) => !!l.email);
      const campaign = await create.mutateAsync({
        name: draft.name || draft.subject.slice(0, 40) || "Untitled campaign",
        subject_template: draft.subject,
        body_template: draft.body,
        ai_personalize: draft.aiPersonalize,
        leads,
      });
      return campaign;
    } catch (e: any) {
      Alert.alert("Couldn't save", e?.message ?? "Try again.");
      return null;
    }
  };

  const onSaveDraft = async () => {
    setSubmitted(true);
    const campaign = await createCampaign();
    if (!campaign) { setSubmitted(false); return; }
    draft.reset();
    router.replace("/(app)");
  };

  const onSend = async () => {
    setSubmitted(true);
    const campaign = await createCampaign();
    if (!campaign) { setSubmitted(false); return; }
    try {
      if (draft.aiPersonalize) {
        await personalize.mutateAsync({ campaign_id: campaign.id });
      }
      await start.mutateAsync(campaign.id);
      draft.reset();
      router.replace(`/(app)/campaign/${campaign.id}`);
    } catch (e: any) {
      setSubmitted(false);
      Alert.alert("Couldn't start sending", e?.message ?? "Try again.");
    }
  };

  const samples = draft.leads.filter((l) => !!l.email).slice(0, 3);

  return (
    <Screen>
      <WizardProgress step={2} total={2} />
      <View className="px-card">
        <Card>
          <Text className="text-muted text-sm">To</Text>
          <Text className="text-ink text-base mt-1">{recipientCount} recipients</Text>
        </Card>

        <View className="mt-4">
          <TextField
            label="Subject"
            value={draft.subject}
            onChangeText={(v) => draft.set({ subject: v })}
            placeholder="A short, honest subject"
          />
        </View>

        <View className="mt-4">
          <TextField
            label="Body"
            value={draft.body}
            onChangeText={(v) => draft.set({ body: v })}
            multiline
            style={{ minHeight: 200, textAlignVertical: "top" }}
            placeholder="Hey {first_name}, I noticed…"
          />
        </View>

        <View className="mt-4">
          <Button variant="secondary" onPress={() => setAiOpen(true)}>
            ✨ Help me write
          </Button>
        </View>

        <Text className="text-muted text-sm mt-6 mb-2">Personalization</Text>
        <View className="flex-row flex-wrap">
          {draft.fields.length === 0 ? (
            <Text className="text-muted text-xs">
              Add fields on the previous step to get personalization tokens.
            </Text>
          ) : (
            draft.fields.map((f) => (
              <Chip key={f} label={`{${f}}`} onPress={() => insertToken(`{${f}}`)} />
            ))
          )}
        </View>

        <Pressable
          onPress={() => draft.set({ aiPersonalize: !draft.aiPersonalize })}
          className="flex-row items-center mt-4 mb-6"
        >
          <View
            className={`w-6 h-6 rounded border ${
              draft.aiPersonalize ? "bg-accent border-accent" : "border-line"
            } items-center justify-center mr-3`}
          >
            {draft.aiPersonalize ? <Text className="text-white text-xs">✓</Text> : null}
          </View>
          <Text className="text-ink flex-1">Rewrite each email with AI</Text>
        </Pressable>

        <View className="gap-3">
          <Button variant="ghost" onPress={() => setPreviewOpen(true)} disabled={submitted}>
            Preview
          </Button>
          <Button
            variant="secondary"
            onPress={onSaveDraft}
            loading={submitted && !start.isPending}
            disabled={!canSave || submitted}
          >
            Save as draft
          </Button>
          <Button onPress={onSend} loading={submitted} disabled={!canSave || submitted}>
            Send campaign →
          </Button>
        </View>
      </View>

      <BottomSheet visible={aiOpen} onClose={() => setAiOpen(false)}>
        <Text className="text-2xl font-serif text-ink mb-4">Help me write</Text>
        <View className="gap-3">
          <TextField
            label="What's the goal of this email?"
            value={goal}
            onChangeText={setGoal}
            placeholder="Book a 15-min intro call"
          />
          <TextField
            label="What's your offer or context?"
            value={context}
            onChangeText={setContext}
            multiline
            style={{ minHeight: 100, textAlignVertical: "top" }}
            placeholder="We help small DTC brands cut shipping costs by 20%."
          />
          <Button onPress={onGenerate} loading={generate.isPending}>
            Generate
          </Button>
        </View>
      </BottomSheet>

      <BottomSheet visible={previewOpen} onClose={() => setPreviewOpen(false)}>
        <Text className="text-2xl font-serif text-ink mb-4">Preview</Text>
        <View className="gap-3">
          {samples.length === 0 ? (
            <Text className="text-muted">No recipients to preview.</Text>
          ) : (
            samples.map((s, i) => (
              <Card key={i}>
                <Text className="text-muted text-xs mb-1">To {s.email}</Text>
                <Text className="text-ink font-medium mb-2">
                  {fillTokens(draft.subject, s.data)}
                </Text>
                <Text className="text-ink leading-6">{fillTokens(draft.body, s.data)}</Text>
              </Card>
            ))
          )}
        </View>
      </BottomSheet>
    </Screen>
  );
}
