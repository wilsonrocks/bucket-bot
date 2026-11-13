// Titles for the #1 ROLLING_YEAR player in the weekly announcements post.
// One is picked at random each week, used as "the current <title>".
export const TOP_DOG_TITLES = [
  "Boss",
  "Hoarcat's Whiskers",
  "Head Honcho",
  "Nephilim's Pyjamas",
  "Tyrant",
  "Auto-Hire",
  "Title Master",
  "Head Head Hunter",
];

export const pickTopDogTitle = (
  titles: readonly string[] = TOP_DOG_TITLES,
  random: () => number = Math.random,
): string => titles[Math.floor(random() * titles.length)] ?? "Top Dog";
