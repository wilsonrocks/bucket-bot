import type { ReactNode } from "react";
import type { CardData } from "./build-cards";
import type { BuriedEvent } from "./cards";
import { cornerSuits, fateOf, SUITS, suitIcon, type Fate } from "./fate";

/**
 * Satori layouts for the 2026 share images. Satori supports a flexbox subset
 * only: every element with more than one child needs display:flex, and no
 * CSS grid. Copy here mirrors the site's card components — tweak both.
 */

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const INK = "#15110e";
const BONE = "#f1e9d8";
const GOLD = "#c9a227";
const MUTED = "#a89f8e";
const BLOOD = "#9e1b1b";
/** The card stock round the picture, where the corner indices sit. */
const STOCK = "#f4ecd8";

// The picture panel inside the card stock; corner indices sit in the side margins.
const MARGIN_X = 116;
const MARGIN_Y = 40;
const PANEL_WIDTH = CARD_WIDTH - MARGIN_X * 2;
const PANEL_HEIGHT = CARD_HEIGHT - MARGIN_Y * 2;

export interface ImageContext {
  year: number;
  playerName: string;
  /** data: URI of the edition's card-back logo, if one is uploaded. */
  logo?: string;
  /** data: URI for the painting card's photo. */
  paintingPhoto?: string;
}

/** Black or white, whichever reads better on the given hex background. */
export function textOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return BONE;
  const n = parseInt(m[1]!, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? INK : "#ffffff";
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function Frame({
  ctx,
  bg = INK,
  fg = BONE,
  accent = GOLD,
  children,
}: {
  ctx: ImageContext;
  bg?: string;
  fg?: string;
  accent?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: PANEL_WIDTH,
        height: PANEL_HEIGHT,
        boxSizing: "border-box",
        display: "flex",
        background: bg,
        color: fg,
        padding: 26,
        borderRadius: 28,
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          width: PANEL_WIDTH - 52,
          height: PANEL_HEIGHT - 52,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          border: `4px solid ${accent}`,
          borderRadius: 22,
          padding: "44px 48px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontFamily: "Cinzel", fontWeight: 900, fontSize: 34, letterSpacing: 5, color: accent }}>
            {`MALIFAUX BURIED ${ctx.year}`}
          </div>
          {ctx.logo ? <img src={ctx.logo} width={96} height={96} style={{ objectFit: "contain" }} /> : null}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>{children}</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 36, opacity: 0.8 }}>
          <div style={{ display: "flex", fontWeight: 700 }}>{ctx.playerName}</div>
          <div style={{ display: "flex" }}>malifaux.uk</div>
        </div>
      </div>
    </div>
  );
}

const Eyebrow = ({ children, color = MUTED }: { children: string; color?: string }) => (
  <div style={{ display: "flex", fontSize: 38, textTransform: "uppercase", letterSpacing: 3, color, marginBottom: 16 }}>
    {children}
  </div>
);

const Big = ({ children, size = 260 }: { children: string; size?: number }) => (
  <div style={{ display: "flex", fontWeight: 900, fontSize: size, lineHeight: 1, letterSpacing: -6 }}>{children}</div>
);

const Line = ({ children, size = 52 }: { children: string; size?: number }) => (
  <div style={{ display: "flex", fontSize: size, fontWeight: 700, lineHeight: 1.2, marginTop: 24 }}>{children}</div>
);

function EventList({ events, max = 5, showPlace = false }: { events: BuriedEvent[]; max?: number; showPlace?: boolean }) {
  const shown = events.slice(0, max);
  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
      {shown.map((e) => (
        <div key={`${e.id}`} style={{ display: "flex", justifyContent: "space-between", fontSize: 42, padding: "12px 0", borderBottom: `2px solid ${MUTED}40` }}>
          <div style={{ display: "flex", maxWidth: 560, overflow: "hidden" }}>{e.name}</div>
          <div style={{ display: "flex", color: GOLD, fontWeight: 700 }}>
            {showPlace && e.place !== undefined ? ordinal(e.place) : `${e.players}p`}
          </div>
        </div>
      ))}
      {events.length > max ? (
        <div style={{ display: "flex", fontSize: 38, color: MUTED, marginTop: 12 }}>{`+ ${events.length - max} more`}</div>
      ) : null}
    </div>
  );
}

/**
 * A playing card from the Fate Deck: value and suit in two opposite corners
 * of the card stock, and the card's own design as the picture in the middle.
 */
export function CardImage({ card, ctx }: { card: CardData; ctx: ImageContext }) {
  const fate = fateOf(card);
  return (
    <div style={{ width: CARD_WIDTH, height: CARD_HEIGHT, display: "flex", position: "relative", background: STOCK }}>
      <CornerIndex fate={fate} style={{ top: 34, left: 22 }} />
      <CornerIndex fate={fate} style={{ bottom: 34, right: 22, transform: "rotate(180deg)" }} />
      <div style={{ position: "absolute", top: MARGIN_Y, left: MARGIN_X, display: "flex" }}>
        <CardPicture card={card} ctx={ctx} />
      </div>
    </div>
  );
}

// Corner values shrink as they get longer, to stay inside the corner.
const VALUE_SIZE = [68, 54, 40];

function CornerIndex({ fate, style }: { fate: Fate; style: Record<string, string | number> }) {
  const suit = SUITS[fate.suit];
  return (
    <div
      style={{
        position: "absolute",
        width: 72,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: suit.colour,
        ...style,
      }}
    >
      <div style={{ display: "flex", fontFamily: "Cinzel", fontWeight: 900, fontSize: VALUE_SIZE[Math.min(`${fate.value ?? "J"}`.length, 3) - 1], lineHeight: 1 }}>{`${fate.value ?? "J"}`}</div>
      {fate.value !== undefined ? (
        cornerSuits(fate.suit).map((s) => <img key={s} src={suitIcon(s)} width={60} height={60} style={{ marginTop: 8 }} />)
      ) : (
        // The Red Joker carries every suit; the Black Joker none.
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 8 }}>
          {cornerSuits(fate.suit).map((s) => (
            <img key={s} src={suitIcon(s)} width={48} height={48} />
          ))}
        </div>
      )}
    </div>
  );
}

function CardPicture({ card, ctx }: { card: CardData; ctx: ImageContext }) {
  switch (card.key) {
    case "INTRO":
      return (
        <Frame ctx={ctx}>
          <Eyebrow>{`${ctx.year}, flipped`}</Eyebrow>
          <Big>{`${card.gamesPlayed}`}</Big>
          <Line>{`games across ${plural(card.eventsPlayed, "event")}.`}</Line>
          {card.percentile >= 50 ? (
            <Line size={44}>{`More than ${card.percentile}% of UK players.`}</Line>
          ) : null}
        </Frame>
      );
    case "MOST_PLAYED_FACTION": {
      const fg = textOn(card.faction.hexCode);
      return (
        <Frame ctx={ctx} bg={card.faction.hexCode} fg={fg} accent={fg}>
          <Eyebrow color={fg}>Your faction</Eyebrow>
          <Big size={150}>{card.faction.name}</Big>
          <Line>{`${plural(card.events, "event")} — ${Math.round(card.share * 100)}% of your year.`}</Line>
        </Frame>
      );
    }
    case "FACTIONS": {
      const max = Math.max(...card.factions.map((f) => f.events));
      return (
        <Frame ctx={ctx}>
          <Eyebrow>Spread your bets</Eyebrow>
          <Big size={140}>{`${card.factions.length} factions`}</Big>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 48 }}>
            {card.factions.slice(0, 6).map((f) => (
              <div key={f.faction.code} style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
                <div style={{ display: "flex", width: 300, fontSize: 36, fontWeight: 700 }}>{f.faction.name}</div>
                <div style={{ display: "flex", flex: 1, marginLeft: 16 }}>
                  <div style={{ display: "flex", height: 48, borderRadius: 12, background: f.faction.hexCode, width: `${(f.events / max) * 100}%` }} />
                </div>
                <div style={{ display: "flex", width: 140, justifyContent: "flex-end", fontSize: 38 }}>
                  {f.factionRank !== undefined ? `#${f.factionRank}` : `${f.events}`}
                </div>
              </div>
            ))}
          </div>
        </Frame>
      );
    }
    case "VENUES":
      return (
        <Frame ctx={ctx}>
          <Eyebrow>Have models, will travel</Eyebrow>
          <Big>{`${card.venues.length}`}</Big>
          <Line>{`${card.venues.length === 1 ? "venue" : "venues"} across ${plural(card.regions, "region")}.`}</Line>
          <Line size={44}>{card.venues.slice(0, 4).map((v) => v.town).join(" · ")}</Line>
        </Frame>
      );
    case "BIGGEST_EVENT":
      return (
        <Frame ctx={ctx}>
          <Eyebrow>Your biggest crowd</Eyebrow>
          <Big>{`${card.event.players}`}</Big>
          <Line>{`players at ${card.event.name}.`}</Line>
          {card.event.place !== undefined ? <Line size={44}>{`You finished ${ordinal(card.event.place)}.`}</Line> : null}
        </Frame>
      );
    case "PODIUMS":
      return (
        <Frame ctx={ctx}>
          <Eyebrow>On the podium</Eyebrow>
          <Big>{`${card.events.length}`}</Big>
          <Line>{`top-three ${card.events.length === 1 ? "finish" : "finishes"}.`}</Line>
          <EventList events={card.events} showPlace />
        </Frame>
      );
    case "EVENTS_WON":
      return (
        <Frame ctx={ctx} bg={BLOOD} accent={GOLD}>
          <Eyebrow color={GOLD}>Undefeated? Close enough.</Eyebrow>
          <Big>{`${card.events.length}`}</Big>
          <Line>{card.events.length === 1 ? "event won." : "events won."}</Line>
          <EventList events={card.events} />
        </Frame>
      );
    case "RANKING":
      return (
        <Frame ctx={ctx}>
          <Eyebrow>Rolling year ranking</Eyebrow>
          <Big>{`#${card.finalRank}`}</Big>
          <Line>{`of ${card.totalPlayers} ranked players.`}</Line>
          {card.bestRank < card.finalRank ? <Line size={44}>{`Peaked at #${card.bestRank}.`}</Line> : null}
        </Frame>
      );
    case "PAINTING":
      return (
        <Frame ctx={ctx}>
          <Eyebrow>Brush with greatness</Eyebrow>
          {ctx.paintingPhoto ? (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
              <img src={ctx.paintingPhoto} height={480} style={{ borderRadius: 24, objectFit: "cover", maxWidth: 700 }} />
            </div>
          ) : null}
          <Big size={ctx.paintingPhoto ? 140 : 260}>{`${card.awards.length}`}</Big>
          <Line>{card.awards.length === 1 ? "painting award." : "painting awards."}</Line>
        </Frame>
      );
    case "ORGANISED":
      return (
        <Frame ctx={ctx}>
          <Eyebrow>Behind the table</Eyebrow>
          <Big>{`${card.events.length}`}</Big>
          <Line>{`${card.events.length === 1 ? "event" : "events"} organised for ${plural(card.playersHosted, "player")}.`}</Line>
          <Line size={44}>Thank you. Seriously.</Line>
        </Frame>
      );
    case "ACHIEVEMENTS":
      return (
        <Frame ctx={ctx}>
          <Eyebrow>Unlocked</Eyebrow>
          <Big>{`${card.achievements.length}`}</Big>
          <Line>{card.achievements.length === 1 ? "achievement earned." : "achievements earned."}</Line>
          <Line size={42}>{card.achievements.slice(0, 5).map((a) => a.name).join(" · ")}</Line>
        </Frame>
      );
    case "SUMMARY": {
      const stats = summaryStats(card);
      const accent = card.topFaction?.hexCode ?? GOLD;
      return (
        <Frame ctx={ctx} accent={accent}>
          <Eyebrow>{`${ctx.playerName}'s ${ctx.year}`}</Eyebrow>
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 24 }}>
            {stats.map(([label, value]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", width: "50%", marginBottom: 40 }}>
                <div style={{ display: "flex", fontSize: 110, fontWeight: 900, lineHeight: 1 }}>{value}</div>
                <div style={{ display: "flex", fontSize: 40, color: MUTED, marginTop: 8 }}>{label}</div>
              </div>
            ))}
          </div>
          {card.topFaction ? (
            <div style={{ display: "flex", alignItems: "center", fontSize: 46, fontWeight: 700 }}>
              <div style={{ display: "flex", width: 40, height: 40, borderRadius: 20, background: card.topFaction.hexCode, marginRight: 20 }} />
              {card.topFaction.name}
            </div>
          ) : null}
        </Frame>
      );
    }
  }
}

function summaryStats(card: Extract<CardData, { key: "SUMMARY" }>): [string, string][] {
  const stats: [string, string][] = [
    ["events", `${card.eventsPlayed}`],
    ["games", `${card.gamesPlayed}`],
  ];
  if (card.finalRank !== undefined) stats.push(["ranking", `#${card.finalRank}`]);
  if (card.wins > 0) stats.push(["wins", `${card.wins}`]);
  if (card.podiums > 0) stats.push(["podiums", `${card.podiums}`]);
  if (card.paintingAwards > 0) stats.push(["painting awards", `${card.paintingAwards}`]);
  if (card.eventsOrganised > 0) stats.push(["events organised", `${card.eventsOrganised}`]);
  if (card.venues > 0) stats.push(["venues", `${card.venues}`]);
  return stats.slice(0, 6);
}

/** 1200×630 link preview for the deck's main URL. */
export function SummaryOgImage({ card, ctx }: { card: Extract<CardData, { key: "SUMMARY" }>; ctx: ImageContext }) {
  const stats = summaryStats(card).slice(0, 4);
  const accent = card.topFaction?.hexCode ?? GOLD;
  return (
    <div style={{ width: OG_WIDTH, height: OG_HEIGHT, boxSizing: "border-box", display: "flex", background: INK, color: BONE, fontFamily: "Inter", padding: 28 }}>
      <div style={{ width: OG_WIDTH - 56, height: OG_HEIGHT - 56, boxSizing: "border-box", display: "flex", flexDirection: "column", border: `4px solid ${accent}`, borderRadius: 28, padding: "40px 52px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontFamily: "Cinzel", fontWeight: 900, fontSize: 34, letterSpacing: 5, color: GOLD }}>
            {`MALIFAUX BURIED ${ctx.year}`}
          </div>
          {ctx.logo ? <img src={ctx.logo} width={72} height={72} style={{ objectFit: "contain" }} /> : null}
        </div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 900, marginTop: 28 }}>{ctx.playerName}</div>
        <div style={{ flex: 1, display: "flex", alignItems: "flex-end" }}>
          {stats.map(([label, value]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", fontSize: 96, fontWeight: 900, lineHeight: 1 }}>{value}</div>
              <div style={{ display: "flex", fontSize: 32, color: MUTED, marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
