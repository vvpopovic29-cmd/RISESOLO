import { Pressable, ScrollView, Text, View } from "react-native";
import { Link, Redirect } from "expo-router";
import { useColorScheme } from "nativewind";
import { useAuth } from "../src/auth/AuthProvider";
import { DailyQuestCard } from "../src/quest/DailyQuestCard";
import { QuestCard } from "../src/quest/QuestCard";
import { PlayerStatusCard } from "../src/player/PlayerStatusCard";

export default function HomeScreen() {
  const { session, loading, signOut } = useAuth();
  const { colorScheme, toggleColorScheme } = useColorScheme();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-1000 dark:bg-neutral-50">
        <Text className="text-neutral-600">Ucitavanje...</Text>
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <ScrollView className="flex-1 bg-neutral-1000 dark:bg-neutral-50">
      <View className="items-center gap-6 px-6 py-12">
        <View className="items-center gap-1">
          <Text className="text-4xl font-bold text-neutral-50 dark:text-neutral-1000">
            RISESOLO
          </Text>
          <Text className="text-base text-neutral-500 dark:text-neutral-700">System Status</Text>
        </View>

        <PlayerStatusCard />
        <DailyQuestCard />
        <QuestCard
          testID="weekly-quest"
          type="weekly"
          linkedAction="workout"
          generate={(apiClient) => apiClient.generateWeeklyQuest()}
          label="Weekly Quest"
          loadingText="Proveravam Weekly Quest..."
          emptyText="Ove nedelje jos nemas Weekly Quest."
          generateButtonText="Generisi Weekly Quest"
          errorPrefix="Ne mogu da ucitam Weekly Quest"
        />
        <QuestCard
          testID="side-quest"
          type="side"
          linkedAction="nutrition"
          generate={(apiClient) => apiClient.generateSideQuest()}
          label="Side Quest"
          loadingText="Proveravam Side Quest..."
          emptyText="Danas jos nemas Side Quest."
          generateButtonText="Generisi Side Quest"
          errorPrefix="Ne mogu da ucitam Side Quest"
        />
        <QuestCard
          testID="rank-exam-quest"
          type="boss"
          linkedAction="workout"
          generate={(apiClient) => apiClient.generateRankExamQuest()}
          label="Rank Examination"
          loadingText="Proveravam Rank Examination..."
          emptyText="Nemas aktivan Rank Examination."
          generateButtonText="Zapocni Rank Examination"
          errorPrefix="Ne mogu da zapocnem Rank Examination"
        />

        <View className="w-full max-w-sm flex-row gap-3">
          <Link href="/workout/log" asChild>
            <Pressable
              testID="nav-workout-log"
              className="flex-1 items-center rounded-md bg-accent px-4 py-3"
            >
              <Text className="font-semibold text-neutral-50">Zabelezi trening</Text>
            </Pressable>
          </Link>
          <Link href="/nutrition" asChild>
            <Pressable
              testID="nav-nutrition"
              className="flex-1 items-center rounded-md bg-info px-4 py-3"
            >
              <Text className="font-semibold text-neutral-50">Nutrition</Text>
            </Pressable>
          </Link>
        </View>

        <View className="w-full max-w-sm flex-row gap-3">
          <Link href="/achievements" asChild>
            <Pressable
              testID="nav-achievements"
              className="flex-1 items-center rounded-md bg-premium px-4 py-3"
            >
              <Text className="font-semibold text-neutral-50">Achievements</Text>
            </Pressable>
          </Link>
          <Link href="/exercise/progress" asChild>
            <Pressable
              testID="nav-exercise-progress"
              className="flex-1 items-center rounded-md bg-reward px-4 py-3"
            >
              <Text className="font-semibold text-neutral-50">Progres</Text>
            </Pressable>
          </Link>
        </View>

        <View className="w-full max-w-sm flex-row gap-3">
          <Link href="/training-plan" asChild>
            <Pressable
              testID="nav-training-plan"
              className="flex-1 items-center rounded-md bg-accent px-4 py-3"
            >
              <Text className="font-semibold text-neutral-50">Training Plan</Text>
            </Pressable>
          </Link>
          <Link href="/player-profile" asChild>
            <Pressable
              testID="nav-player-profile"
              className="flex-1 items-center rounded-md bg-info px-4 py-3"
            >
              <Text className="font-semibold text-neutral-50">Profil</Text>
            </Pressable>
          </Link>
        </View>

        <View className="w-full max-w-sm flex-row gap-3">
          <Link href="/workout/history" asChild>
            <Pressable
              testID="nav-workout-history"
              className="flex-1 items-center rounded-md bg-accent px-4 py-3"
            >
              <Text className="font-semibold text-neutral-50">Istorija treninga</Text>
            </Pressable>
          </Link>
        </View>

        <View className="flex-row gap-3">
          <Pressable
            onPress={toggleColorScheme}
            className="rounded-md border border-neutral-500 px-4 py-2"
          >
            <Text className="text-neutral-50 dark:text-neutral-1000">
              Tema: {colorScheme === "dark" ? "Dark" : "Light"}
            </Text>
          </Pressable>
          <Pressable
            testID="sign-out"
            onPress={signOut}
            className="rounded-md border border-danger px-4 py-2"
          >
            <Text className="text-danger">Odjavi se</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
