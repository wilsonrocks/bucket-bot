/** "Shout out to <@a>, <@b> and <@c> for organising it!", or nothing without organisers. */
export function organiserShoutOut(discordIds: string[]): string {
  if (discordIds.length === 0) return "";
  const mentions = discordIds.map((id) => `<@${id}>`);
  const names =
    mentions.length === 1
      ? mentions[0]
      : `${mentions.slice(0, -1).join(", ")} and ${mentions[mentions.length - 1]}`;
  return `\n\nShout out to ${names} for organising it! ❤️`;
}
