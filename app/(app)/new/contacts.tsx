import { useState } from "react";
import { View, Text, Alert, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { WizardProgress } from "@/components/WizardProgress";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { BottomSheet } from "@/components/BottomSheet";
import { useDraft } from "@/lib/draft-store";
import { useSearchLeads, useGuessEmails, useProfile, useCreateCheckout } from "@/lib/queries";
import { useAuth } from "@/lib/auth-store";
import type { Lead } from "@/lib/types";

type Mode = "manual" | "search" | "guess";

export default function Contacts() {
  const router = useRouter();
  const draft = useDraft();
  const [mode, setMode] = useState<Mode>("manual");

  return (
    <Screen>
      <WizardProgress step={1} total={2} />

      <View className="px-card">
        <Text className="text-3xl font-serif text-ink mb-2 leading-9">Who are you emailing?</Text>
        <Text className="text-muted text-base mb-6 leading-6">
          Pick how you want to build your list, and the fields you want for each person.
        </Text>

        <FieldsEditor />

        <View className="mt-6">
          <ModeTabs mode={mode} onChange={setMode} />
        </View>

        <View className="mt-6">
          {mode === "manual" ? <ManualMode /> : null}
          {mode === "search" ? <SearchMode /> : null}
          {mode === "guess" ? <GuessMode /> : null}
        </View>

        {draft.leads.length > 0 ? (
          <View className="mt-8 mb-4">
            <Text className="text-muted text-xs mb-3">
              {draft.leads.length} {draft.leads.length === 1 ? "contact" : "contacts"}
            </Text>
            <ContactSheet />
          </View>
        ) : null}

        <View className="mt-4">
          <Button
            onPress={() => router.push("/(app)/new/compose")}
            disabled={draft.leads.length === 0}
          >
            Next: write email →
          </Button>
        </View>
      </View>
    </Screen>
  );
}

// ---- Fields editor ---------------------------------------------------------

function FieldsEditor() {
  const draft = useDraft();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const confirm = () => {
    if (!name.trim()) {
      setAdding(false);
      return;
    }
    draft.addField(name);
    setName("");
    setAdding(false);
  };

  return (
    <View>
      <Text className="text-muted text-xs mb-2">Fields per contact</Text>
      <View className="flex-row flex-wrap">
        {draft.fields.map((f) => (
          <View
            key={f}
            className="flex-row items-center bg-accentSoft px-3 py-2 rounded-full mr-2 mb-2"
          >
            <Text className="text-accent text-sm">{f}</Text>
            <Pressable onPress={() => draft.removeField(f)} className="ml-2">
              <Ionicons name="close" size={14} color="#E26A2C" />
            </Pressable>
          </View>
        ))}

        {adding ? (
          <View className="flex-row items-center bg-card border border-accent rounded-full px-3 py-1 mr-2 mb-2">
            <TextField
              value={name}
              onChangeText={setName}
              autoFocus
              placeholder="field name"
              onSubmitEditing={confirm}
              onBlur={confirm}
              style={{
                paddingVertical: 0,
                paddingHorizontal: 0,
                borderWidth: 0,
                backgroundColor: "transparent",
                minWidth: 90,
              }}
            />
          </View>
        ) : (
          <Pressable
            onPress={() => setAdding(true)}
            className="flex-row items-center bg-card border border-line px-3 py-2 rounded-full mb-2"
          >
            <Ionicons name="add" size={14} color="#7A6F62" />
            <Text className="text-muted text-sm ml-1">Add field</Text>
          </Pressable>
        )}
      </View>
      <Text className="text-muted text-xs mt-1 leading-5">
        Each field becomes a {"{"}token{"}"} you can drop into the email later.
      </Text>
    </View>
  );
}

// ---- Mode tabs -------------------------------------------------------------

function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const tabs: { key: Mode; label: string; premium?: boolean }[] = [
    { key: "manual", label: "I have a list" },
    { key: "guess", label: "Guess emails" },
    { key: "search", label: "Find with AI", premium: true },
  ];
  return (
    <View className="flex-row bg-card border border-line rounded-card p-1">
      {tabs.map((t) => {
        const active = mode === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            className={`flex-1 py-3 rounded-card ${active ? "bg-accent" : ""}`}
          >
            <View className="flex-row items-center justify-center">
              <Text
                className={`text-center text-sm ${active ? "text-white font-medium" : "text-muted"}`}
              >
                {t.label}
              </Text>
              {t.premium ? (
                <Ionicons
                  name="diamond"
                  size={12}
                  color={active ? "#ffffff" : "#E26A2C"}
                  style={{ marginLeft: 4 }}
                />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---- Manual paste ----------------------------------------------------------

function ManualMode() {
  const draft = useDraft();
  const [text, setText] = useState("");

  const parse = () => {
    const rows: Lead[] = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,\t]/).map((s) => s.trim());
        const first = parts[0] ?? "";
        const match = first.match(/<([^>]+)>/);
        const email = (match ? match[1] : first).toLowerCase();
        if (!email.includes("@")) return null;
        const data: Record<string, string> = {};
        draft.fields.forEach((field, i) => {
          const v = parts[i + 1];
          if (v) data[field] = v;
        });
        return { email, data } satisfies Lead;
      })
      .filter((r): r is Lead => r !== null);

    if (rows.length === 0) {
      Alert.alert("Nothing to add", "Paste at least one valid email.");
      return;
    }
    draft.addLeads(rows);
    setText("");
  };

  const columnHint = ["email", ...draft.fields].join(", ");

  return (
    <View>
      <View className="bg-card border border-line rounded-card px-4 py-3 mb-2">
        <Text className="text-muted text-xs mb-1">Format</Text>
        <Text className="text-ink text-sm" selectable>
          {columnHint}
        </Text>
      </View>
      <TextField
        multiline
        value={text}
        onChangeText={setText}
        placeholder="one per line"
        style={{ minHeight: 140, textAlignVertical: "top" }}
      />
      <View className="mt-3">
        <Button variant="secondary" onPress={parse}>
          Add to list
        </Button>
      </View>
      <Text className="text-muted text-xs mt-3 leading-5">
        Just emails works too — extras stay blank.
      </Text>
    </View>
  );
}

// ---- Apollo search ---------------------------------------------------------

function SearchMode() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const draft = useDraft();
  const [query, setQuery] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const search = useSearchLeads();
  const checkout = useCreateCheckout();

  const isFree = (profile?.subscription_tier ?? "free") === "free";

  const run = async () => {
    if (isFree) {
      setUpgradeOpen(true);
      return;
    }
    if (!query.trim()) return;
    try {
      const res = await search.mutateAsync({ query });
      if (res.leads.length === 0) {
        Alert.alert("No results", "Try a different description.");
        return;
      }
      draft.addLeads(res.leads);
      setQuery("");
    } catch (e: any) {
      if (e?.message?.includes("lead_limit_reached")) {
        Alert.alert("You're out of lookups", "Upgrade to Pro to find more people.");
      } else {
        Alert.alert("Search failed", e?.message ?? "Try again.");
      }
    }
  };

  const onUpgrade = async () => {
    try {
      const { url } = await checkout.mutateAsync();
      if (url) {
        const WebBrowser = await import("expo-web-browser");
        await WebBrowser.openBrowserAsync(url);
      }
    } catch (e: any) {
      Alert.alert("Couldn't start checkout", e?.message ?? "Try again.");
    }
  };

  if (isFree) {
    return (
      <View>
        <View className="bg-card border border-line rounded-card p-6 items-center">
          <Ionicons name="diamond" size={32} color="#E26A2C" style={{ marginBottom: 12 }} />
          <Text className="text-ink text-lg font-medium text-center mb-2">
            Pro feature
          </Text>
          <Text className="text-muted text-sm text-center leading-6 mb-5">
            Find contacts automatically using AI-powered search. Upgrade to Pro to unlock.
          </Text>
          <Button onPress={onUpgrade} loading={checkout.isPending}>
            Upgrade to Pro
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View>
      <TextField
        multiline
        value={query}
        onChangeText={setQuery}
        placeholder="e.g. startup founders in SF, marketing managers at DTC brands"
        style={{ minHeight: 100, textAlignVertical: "top" }}
      />
      <View className="mt-3">
        <Button variant="secondary" onPress={run} loading={search.isPending}>
          Find contacts
        </Button>
      </View>
    </View>
  );
}

// ---- AI guess --------------------------------------------------------------

function GuessMode() {
  const draft = useDraft();
  const [text, setText] = useState("");
  const guess = useGuessEmails();

  const run = async () => {
    const contacts = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, company] = line.split(/[,\t]|\s+@\s+/).map((s) => s.trim());
        return { name, company };
      })
      .filter((c) => c.name);

    if (contacts.length === 0) {
      Alert.alert("Nothing to guess", "Enter at least one name + company per line.");
      return;
    }
    if (contacts.length > 50) {
      Alert.alert("Too many", "Max 50 guesses at a time.");
      return;
    }

    try {
      const res = await guess.mutateAsync({ contacts });
      if (res.leads.length === 0) {
        Alert.alert("No guesses", "The model couldn't find plausible emails.");
        return;
      }
      draft.addLeads(res.leads);
      setText("");
    } catch (e: any) {
      Alert.alert("Guess failed", e?.message ?? "Try again.");
    }
  };

  return (
    <View>
      <TextField
        multiline
        value={text}
        onChangeText={setText}
        placeholder={"Jane Doe, Acme Inc\nJohn Smith, Globex"}
        style={{ minHeight: 140, textAlignVertical: "top" }}
      />
      <View className="mt-3">
        <Button variant="secondary" onPress={run} loading={guess.isPending}>
          Guess emails with AI
        </Button>
      </View>
      <Text className="text-muted text-xs mt-3 leading-5">
        These are guesses based on common patterns — verify before sending.
      </Text>
    </View>
  );
}

// ---- Contact sheet ---------------------------------------------------------

function ContactSheet() {
  const draft = useDraft();

  return (
    <ScrollView className="max-h-96" nestedScrollEnabled>
      <View className="gap-2">
        {draft.leads.map((l, i) => {
          const displayName = draft.fields
            .map((f) => l.data[f])
            .filter(Boolean)
            .join(" · ");
          return (
            <View
              key={`${l.email}-${i}`}
              className="bg-card border border-line rounded-card p-3 flex-row items-start justify-between"
            >
              <View className="flex-1 pr-2">
                <Text className="text-ink text-sm" numberOfLines={1}>
                  {l.email}
                </Text>
                {displayName ? (
                  <Text className="text-muted text-xs mt-0.5" numberOfLines={2}>
                    {displayName}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => draft.removeLead(l.email)} className="p-2">
                <Ionicons name="close" size={16} color="#7A6F62" />
              </Pressable>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
