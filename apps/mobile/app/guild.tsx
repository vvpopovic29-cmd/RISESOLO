import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ApiError, type ApiClient } from "@risesolo/api-client";
import type { GuildDetailDto, GuildMemberDto, GuildMessageDto, GuildRaidDto } from "@risesolo/validation";
import { useAuth } from "../src/auth/AuthContext";
import { useGuild } from "../src/guilds/use-guild";
import { Button } from "../src/ui/Button";
import { ErrorState } from "../src/ui/ErrorState";
import { ProgressBar } from "../src/ui/ProgressBar";
import { Screen } from "../src/ui/Screen";
import { TextField } from "../src/ui/TextField";

const RAID_STATUS_LABEL: Record<GuildRaidDto["status"], string> = {
  AVAILABLE: "U toku",
  COMPLETED: "Zavrsen",
  EXPIRED: "Istekao",
};

export default function GuildScreen() {
  const { apiClient, state: authState } = useAuth();
  const { state, refetch } = useGuild(apiClient);
  const myUserId = authState.status === "signedIn" ? authState.user.id : undefined;

  return (
    <Screen>
      <Pressable onPress={() => router.back()} testID="guild-back">
        <Text className="text-accent">{"< Nazad"}</Text>
      </Pressable>

      <Text className="text-2xl font-bold text-neutral-50 dark:text-neutral-1000">Ceh</Text>

      {state.status === "loading" ? (
        <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam...</Text>
      ) : state.status === "error" ? (
        <ErrorState message={state.message} onRetry={refetch} testID="guild-error" />
      ) : state.status === "none" ? (
        <NoGuildPanel apiClient={apiClient} onChanged={refetch} />
      ) : (
        <GuildDetailPanel apiClient={apiClient} myUserId={myUserId} guild={state.data} onChanged={refetch} />
      )}
    </Screen>
  );
}

function NoGuildPanel({ apiClient, onChanged }: { apiClient: ApiClient; onChanged: () => void }) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [joinTag, setJoinTag] = useState("");
  const [submitting, setSubmitting] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setSubmitting("create");
    setError(null);
    try {
      await apiClient.guilds.create({ name: name.trim(), tag: tag.trim().toUpperCase() });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kreiranje ceha nije uspelo.");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleJoin() {
    setSubmitting("join");
    setError(null);
    try {
      await apiClient.guilds.join({ tag: joinTag.trim().toUpperCase() });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Pridruzivanje cehu nije uspelo.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <View className="gap-4">
      <Text testID="guild-none" className="text-neutral-500 dark:text-neutral-600">
        Nisi jos clan nijednog ceha. Osnuj svoj ili se pridruzi postojecem preko taga.
      </Text>

      <View className="gap-3 rounded-lg border border-neutral-700 p-4 dark:border-neutral-400">
        <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">OSNUJ CEH</Text>
        <TextField label="Naziv" placeholder="npr. Zeljezni vukovi" value={name} onChangeText={setName} testID="guild-name-input" />
        <TextField label="Tag (2-6 slova/brojeva)" placeholder="npr. VUKOVI" value={tag} onChangeText={setTag} testID="guild-tag-input" autoCapitalize="characters" />
        <Button label="Osnuj ceh" onPress={() => void handleCreate()} loading={submitting === "create"} testID="create-guild-button" />
      </View>

      <View className="gap-3 rounded-lg border border-neutral-700 p-4 dark:border-neutral-400">
        <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">PRIDRUZI SE CEHU</Text>
        <TextField label="Tag ceha" placeholder="npr. VUKOVI" value={joinTag} onChangeText={setJoinTag} testID="guild-join-tag-input" autoCapitalize="characters" />
        <Button label="Pridruzi se" variant="secondary" onPress={() => void handleJoin()} loading={submitting === "join"} testID="join-guild-button" />
      </View>

      {error ? <Text className="text-danger">{error}</Text> : null}
    </View>
  );
}

function GuildDetailPanel({
  apiClient,
  myUserId,
  guild,
  onChanged,
}: {
  apiClient: ApiClient;
  myUserId: string | undefined;
  guild: GuildDetailDto;
  onChanged: () => void;
}) {
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [donateAmount, setDonateAmount] = useState("");

  async function runAction(key: string, action: () => Promise<unknown>) {
    setBusyAction(key);
    setActionError(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Akcija nije uspela.");
    } finally {
      setBusyAction(null);
    }
  }

  const isLeader = guild.myRole === "LEADER";

  function canKick(target: GuildMemberDto): boolean {
    if (target.role === "LEADER") return false;
    if (isLeader) return true;
    return guild.myRole === "OFFICER" && target.role === "MEMBER";
  }

  return (
    <View className="gap-4">
      <View className="gap-2 rounded-lg border border-premium/40 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold text-neutral-50 dark:text-neutral-1000">
            {guild.name} [{guild.tag}]
          </Text>
          <Text className="text-xs font-medium text-accent">{guild.myRole}</Text>
        </View>
        <ProgressBar progress={guild.progress} colorClassName="bg-premium" testID="guild-level-progress" />
        <Text className="text-xs text-neutral-500 dark:text-neutral-600">
          Level {guild.level} · {guild.currentLevelXp} / {guild.requiredXp} XP
        </Text>
        <Button
          label="Napusti ceh"
          variant="secondary"
          onPress={() => void runAction("leave", () => apiClient.guilds.leave())}
          loading={busyAction === "leave"}
          testID="leave-guild-button"
        />
      </View>

      <View className="gap-2 rounded-lg border border-neutral-700 p-4 dark:border-neutral-400">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">NEDELJNI CEHOVSKI RAID</Text>
          <Text className="text-xs font-medium text-accent">{RAID_STATUS_LABEL[guild.raid.status]}</Text>
        </View>
        <ProgressBar progress={guild.raid.progress / guild.raid.targetContributions} testID="guild-raid-progress" />
        <View className="flex-row items-center justify-between pt-1">
          <Text className="text-xs text-neutral-500 dark:text-neutral-600">
            {guild.raid.progress} / {guild.raid.targetContributions} treninga svih clanova
          </Text>
          <Text className="text-xs text-reward">+{guild.raid.coinReward} coins u riznicu</Text>
        </View>
      </View>

      <View className="gap-2 rounded-lg border border-neutral-700 p-4 dark:border-neutral-400">
        <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">CLANOVI ({guild.members.length})</Text>
        {guild.members.map((member) => (
          <View key={member.userId} className="flex-row items-center justify-between gap-2 py-1">
            <View className="flex-1 gap-0.5">
              <Text className="font-semibold text-neutral-50 dark:text-neutral-1000">
                {member.username}
                {member.userId === myUserId ? " (ti)" : ""}
              </Text>
              <Text className="text-xs text-neutral-500 dark:text-neutral-600">{member.role}</Text>
            </View>
            {member.userId !== myUserId && isLeader && member.role !== "LEADER" ? (
              <Button
                label={member.role === "OFFICER" ? "Ucini clanom" : "Ucini oficirom"}
                variant="secondary"
                onPress={() =>
                  void runAction(`role-${member.userId}`, () =>
                    apiClient.guilds.changeMemberRole(member.userId, { role: member.role === "OFFICER" ? "MEMBER" : "OFFICER" }),
                  )
                }
                loading={busyAction === `role-${member.userId}`}
                testID={`guild-role-${member.userId}`}
              />
            ) : null}
            {member.userId !== myUserId && canKick(member) ? (
              <Button
                label="Izbaci"
                variant="danger"
                onPress={() => void runAction(`kick-${member.userId}`, () => apiClient.guilds.kickMember(member.userId))}
                loading={busyAction === `kick-${member.userId}`}
                testID={`guild-kick-${member.userId}`}
              />
            ) : null}
          </View>
        ))}
      </View>

      <View className="gap-2 rounded-lg border border-reward/40 p-4">
        <Text className="text-sm font-semibold text-reward">RIZNICA: {guild.treasuryCoins} coins</Text>
        <View className="flex-row items-end gap-2">
          <View className="flex-1">
            <TextField label="Doniraj coins" value={donateAmount} onChangeText={setDonateAmount} keyboardType="number-pad" testID="guild-donate-input" />
          </View>
          <Button
            label="Doniraj"
            variant="secondary"
            onPress={() => {
              const coins = Math.round(Number(donateAmount));
              if (!Number.isFinite(coins) || coins <= 0) {
                setActionError("Unesi validan broj coins-a.");
                return;
              }
              void runAction("donate", () => apiClient.guilds.donate({ coins })).then(() => setDonateAmount(""));
            }}
            loading={busyAction === "donate"}
            testID="guild-donate-button"
          />
        </View>
        {isLeader ? (
          <Button
            label="Podeli riznicu clanovima"
            onPress={() => void runAction("distribute", () => apiClient.guilds.distributeTreasury())}
            loading={busyAction === "distribute"}
            testID="guild-distribute-button"
          />
        ) : null}
      </View>

      <GuildChat apiClient={apiClient} message={message} setMessage={setMessage} setActionError={setActionError} />

      {actionError ? <Text className="text-danger">{actionError}</Text> : null}
    </View>
  );
}

function GuildChat({
  apiClient,
  message,
  setMessage,
  setActionError,
}: {
  apiClient: ApiClient;
  message: string;
  setMessage: (value: string) => void;
  setActionError: (value: string | null) => void;
}) {
  const [messages, setMessages] = useState<GuildMessageDto[] | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);

  function refetchMessages() {
    setLoadingMessages(true);
    apiClient.guilds
      .getMessages()
      .then(setMessages)
      .catch((err: unknown) => setActionError(err instanceof ApiError ? err.message : "Poruke nisu ucitane."))
      .finally(() => setLoadingMessages(false));
  }

  useEffect(() => {
    refetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiClient]);

  async function handleSend() {
    if (message.trim() === "") return;
    setSending(true);
    try {
      await apiClient.guilds.postMessage({ message: message.trim() });
      setMessage("");
      refetchMessages();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Poruka nije poslata.");
    } finally {
      setSending(false);
    }
  }

  return (
    <View className="gap-2 rounded-lg border border-neutral-700 p-4 dark:border-neutral-400">
      <Text className="text-sm font-semibold text-neutral-400 dark:text-neutral-700">PORUKE CEHA</Text>
      {loadingMessages ? (
        <Text className="text-neutral-500 dark:text-neutral-600">Ucitavam...</Text>
      ) : (
        <View className="gap-1.5" testID="guild-messages">
          {(messages ?? []).length === 0 ? (
            <Text className="text-neutral-500 dark:text-neutral-600">Jos uvek nema poruka.</Text>
          ) : null}
          {(messages ?? []).map((entry) => (
            <Text key={entry.id} className="text-sm text-neutral-50 dark:text-neutral-1000">
              <Text className="font-semibold">{entry.username}: </Text>
              {entry.message}
            </Text>
          ))}
        </View>
      )}
      <View className="flex-row items-end gap-2">
        <View className="flex-1">
          <TextField label="Poruka" value={message} onChangeText={setMessage} testID="guild-message-input" />
        </View>
        <Button label="Posalji" onPress={() => void handleSend()} loading={sending} testID="guild-send-message-button" />
      </View>
    </View>
  );
}
