import { test } from "bun:test";
import { calculateHit } from "../game/batting.ts";
import { Player } from "../game/Player.ts";
import type { ThrownPitch, Stats } from "../game/types.ts";

function makePlayer(contact: number): Player {
  const stats: Stats = {
    contact,
    power: 0,
    running: 0,
    pitching: 0,
    fielding: 0,
    charisma: 0,
    growth: 0,
  };
  return new Player(undefined, undefined, stats);
}

const pitcher = makePlayer(0);

// Build a pitch that yields reasonable contact rates across all contact skills.
// Angles in calculateHit depend only on batter contact, not pitch quality,
// so we can fix pitch properties and simply condition on contact=true.
function makePitch(isStrike = true, pitchQuality = 5): ThrownPitch {
  return {
    pitcher,
    isStrike,
    pitchQuality,
  };
}

type Bucket = { label: string; min: number; max: number }; // inclusive min, exclusive max

// Launch angle buckets (degrees)
//   -135..-50 | -50..-10 | -10..10 | 10..25 | 25..50 | 50..135
const launchBuckets: Bucket[] = [
  { label: "[-135,-50)", min: -135, max: -50 },
  { label: "[-50,-10)", min: -50, max: -10 },
  { label: "[-10,10)", min: -10, max: 10 },
  { label: "[10,25)", min: 10, max: 25 },
  { label: "[25,50)", min: 25, max: 50 },
  { label: "[50,135)", min: 50, max: 135 },
];

// Attack/spray angle buckets (degrees)
//   -90..-60 | -60..-30 | -30..0 | 0..30 | 30..60 | 60..90
const attackBuckets: Bucket[] = [
  { label: "[-90,-60)", min: -90, max: -60 },
  { label: "[-60,-30)", min: -60, max: -30 },
  { label: "[-30,0)", min: -30, max: 0 },
  { label: "[0,30)", min: 0, max: 30 },
  { label: "[30,60)", min: 30, max: 60 },
  { label: "[60,90)", min: 60, max: 90 },
];

function bucketIndex(buckets: Bucket[], value: number): number {
  if (buckets.length === 0) return -1;

  for (const [i, b] of buckets.entries()) {
    if (value >= b.min && value < b.max) return i;
  }
  // If value lands exactly on the max boundary of the last bucket, count it there.
  const last = buckets[buckets.length - 1];
  if (!last) return -1;
  if (value === last.max) return buckets.length - 1;
  return -1;
}

// Collect a fixed number of CONTACTED batted balls for a given contact skill.
// Continues sampling until `contactsTarget` contacts have been observed, with a
// generous cap on total attempts to avoid infinite loops at extreme settings.
function collectContactsForLevel(
  contact: number,
  contactsTarget: number,
  isStrike = true,
  pitchQuality = 5
): { launch: number[]; attack: number[] } {
  const batter = makePlayer(contact);
  const pitch = makePitch(isStrike, pitchQuality);

  const launch: number[] = [];
  const attack: number[] = [];

  let attempts = 0;
  const maxAttempts = contactsTarget * 20; // cap to prevent runaway loops

  while (launch.length < contactsTarget && attempts < maxAttempts) {
    attempts++;
    const res = calculateHit(batter, pitch);
    if (!res) continue;
    if (typeof res.launch !== "number" || typeof res.attack !== "number") continue;

    launch.push(res.launch);
    attack.push(res.attack);
  }

  return { launch, attack };
}

function printDistributionTable(
  title: string,
  buckets: Bucket[],
  rows: { contact: number; counts: number[]; total: number }[]
) {
  const headerBuckets = buckets.map((b) => b.label);
  const header = ["Contact", ...headerBuckets].join(" | ");
  console.log(`\n${title}\n`);
  console.log(header);
  console.log("-".repeat(header.length));
  for (const row of rows) {
    const probs = row.counts.map((c) => ((c / row.total) * 100).toFixed(1).padStart(8, " "));
    console.log(
      `${row.contact.toString().padStart(7, " ")} | ${probs.join(" | ")}`
    );
  }
  console.log("");
}

  const MAX_CONTACT = 10;

test("Angle distribution by contact: Launch angle buckets", () => {
  const contactsPerLevel = 20000; // number of CONTACTED balls to collect per contact level
  const rows: { contact: number; counts: number[]; total: number }[] = [];

  for (let contact = 0; contact <= MAX_CONTACT; contact++) {
    const { launch } = collectContactsForLevel(contact, contactsPerLevel, true, 5);

    const counts = new Array(launchBuckets.length).fill(0);
    for (const v of launch) {
      const idx = bucketIndex(launchBuckets, v);
      if (idx !== -1) counts[idx]++;
    }
    rows.push({ contact, counts, total: launch.length });
  }

  printDistributionTable(
    `Launch angle distribution across buckets (${contactsPerLevel} contacts per level)`,
    launchBuckets,
    rows
  );
});

test("Angle distribution by contact: Attack angle buckets", () => {
  const contactsPerLevel = 20000; // number of CONTACTED balls to collect per contact level
  const rows: { contact: number; counts: number[]; total: number }[] = [];

  for (let contact = 0; contact <= MAX_CONTACT; contact++) {
    const { attack } = collectContactsForLevel(contact, contactsPerLevel, true, 5);

    const counts = new Array(attackBuckets.length).fill(0);
    for (const v of attack) {
      const idx = bucketIndex(attackBuckets, v);
      if (idx !== -1) counts[idx]++;
    }
    rows.push({ contact, counts, total: attack.length });
  }

  printDistributionTable(
    `Attack (spray) angle distribution across buckets (${contactsPerLevel} contacts per level)`,
    attackBuckets,
    rows
  );
});
