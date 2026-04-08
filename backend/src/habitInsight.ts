type HabitInsight = {
  category: "good" | "bad";
  reason: string;
  tips: string[];
};

const badKeywords = [
  "smoke",
  "smoking",
  "vape",
  "alcohol",
  "drinking",
  "junk food",
  "sugar",
  "doomscroll",
  "scroll",
  "gambling",
  "late night",
  "procrastinate",
  "skip workout",
  "skip gym"
];

const goodKeywords = [
  "read",
  "exercise",
  "workout",
  "walk",
  "meditate",
  "sleep",
  "water",
  "journal",
  "study",
  "learn",
  "stretch",
  "healthy"
];

function includesAny(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

export function analyzeHabit(name: string, description: string): HabitInsight {
  const text = `${name} ${description}`.toLowerCase();

  if (includesAny(text, badKeywords)) {
    return {
      category: "bad",
      reason: "This habit appears harmful to long-term health, focus, or productivity.",
      tips: [
        "Make the bad habit harder: remove triggers from your environment.",
        "Replace it with a small positive action you can do in under 2 minutes.",
        "Track urges and identify time/place patterns for 1-2 weeks.",
        "Use accountability: tell a friend or set reminders and limits."
      ]
    };
  }

  if (includesAny(text, goodKeywords)) {
    return {
      category: "good",
      reason: "This habit supports health, learning, or consistency over time.",
      tips: [
        "Keep the trigger simple and consistent.",
        "Start small and focus on streak consistency.",
        "Review progress weekly and raise the target gradually."
      ]
    };
  }

  return {
    category: "good",
    reason: "This looks neutral-to-positive. Keep it realistic and measurable.",
    tips: [
      "Define exactly when and where you will do it.",
      "Track completion daily for better consistency.",
      "Adjust weekly target if it feels too easy or too hard."
    ]
  };
}
