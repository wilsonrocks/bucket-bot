import { EmbedBuilder } from "discord.js";

const ASSETS_URL = process.env.ASSETS_URL;

export function positionLabel(position: number, totalWinners: number): string {
  if (totalWinners === 1) return "Winner";
  const suffixes: Record<number, string> = { 1: "st", 2: "nd", 3: "rd" };
  return `${position}${suffixes[position] ?? "th"}`;
}

export function buildPaintingEmbeds(
  categories: {
    name: string;
    winners: {
      playerName: string;
      position: number;
      model: string | null;
      description: string | null;
      imageKey: string | null;
    }[];
  }[]
): EmbedBuilder[] {
  const embeds: EmbedBuilder[] = [];

  for (const category of categories) {
    for (const winner of category.winners) {
      const label = positionLabel(winner.position, category.winners.length);
      const lines: string[] = [winner.playerName];
      if (winner.model) lines.push(`*${winner.model}*`);
      if (winner.description) lines.push(winner.description);

      const embed = new EmbedBuilder()
        .setTitle(`🎨 ${category.name} — ${label}`)
        .setDescription(lines.join("\n"));

      if (winner.imageKey && ASSETS_URL) {
        embed.setImage(`${ASSETS_URL}/${winner.imageKey}-w800.png`);
      }

      embeds.push(embed);
    }
  }

  return embeds;
}
