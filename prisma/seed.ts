import { PrismaClient, ItemType, PeriodType, SessionSource } from "@prisma/client";
import bcrypt from "bcryptjs";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { subDays } from "date-fns";

const prisma = new PrismaClient();

const TZ = "America/New_York";

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261113);

function localDate(daysAgo: number) {
  return formatInTimeZone(subDays(new Date(), daysAgo), TZ, "yyyy-MM-dd");
}

function at(daysAgo: number, hour: number, minute = 0) {
  return fromZonedTime(`${localDate(daysAgo)} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`, TZ);
}

type ItemKey = string;

async function main() {
  await prisma.user.deleteMany({ where: { email: "demo@kairos.app" } });

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const user = await prisma.user.create({
    data: {
      name: "Alex Rivera",
      email: "demo@kairos.app",
      passwordHash,
      emailVerifiedAt: new Date(),
      timezone: TZ,
      weekStartsOn: 1,
      theme: "dark",
      workspace: {
        create: {
          name: "Alex's Workspace",
          icon: "🌿",
        },
      },
    },
    include: { workspace: true },
  });

  const workspace = user.workspace!;

  // The demo account is a Pro workspace so every feature is visible.
  await prisma.billingAccount.create({
    data: {
      userId: user.id,
      provider: "demo",
      status: "active",
      plan: "pro",
      interval: "yearly",
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      renewsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  const items: Record<ItemKey, string> = {};

  async function addItem(
    key: string,
    name: string,
    type: ItemType,
    parentKey: string | null,
    color: string | null,
    sortOrder: number,
    icon?: string,
    description?: string,
  ) {
    const item = await prisma.item.create({
      data: {
        workspaceId: workspace.id,
        parentId: parentKey ? items[parentKey] : null,
        name,
        type,
        color,
        sortOrder,
        icon,
        description,
      },
    });
    items[key] = item.id;
    return item;
  }

  await addItem("work", "Work", ItemType.AREA, null, "#6366f1", 0, "💼", "Everything related to earning a living and growing professionally.");
  await addItem("freelancing", "Freelancing", ItemType.PROJECT, "work", "#818cf8", 0, "🧑‍💻");
  await addItem("clientA", "Client A", ItemType.PROJECT, "freelancing", "#a5b4fc", 0);
  await addItem("clientB", "Client B", ItemType.PROJECT, "freelancing", "#c7d2fe", 1);
  await addItem("jobSearch", "Job Search", ItemType.PROJECT, "work", "#7dd3fc", 1);
  await addItem("profDev", "Professional Development", ItemType.PROJECT, "work", "#a78bfa", 2);

  await addItem("startup", "Startup Work", ItemType.AREA, null, "#8b5cf6", 1, "🚀", "Building products that I want to exist in the world.");
  await addItem("habitTracker", "Habit Tracker", ItemType.PROJECT, "startup", "#10b981", 0, "✅");
  await addItem("timeApp", "Time Tracking App", ItemType.PROJECT, "startup", "#0ea5e9", 1);
  await addItem("rental", "House Rental App", ItemType.PROJECT, "startup", "#f59e0b", 2);
  await addItem("rentalResearch", "Research", ItemType.PROJECT, "rental", "#fbbf24", 0);
  await addItem("rentalDev", "Development", ItemType.PROJECT, "rental", "#f59e0b", 1);
  await addItem("rentalMarketing", "Marketing", ItemType.PROJECT, "rental", "#f97316", 2);

  await addItem("study", "Study", ItemType.AREA, null, "#f43f5e", 2, "📚", "Deliberate learning and skill building.");
  await addItem("cp", "Competitive Programming", ItemType.PROJECT, "study", "#fb7185", 0);
  await addItem("swe", "Software Engineering", ItemType.PROJECT, "study", "#fda4af", 1);
  await addItem("business", "Business & Entrepreneurship", ItemType.PROJECT, "study", "#fca5a5", 2);

  await addItem("personal", "Personal", ItemType.AREA, null, "#14b8a6", 3, "🌱", "The parts of life that keep everything else working.");
  await addItem("reading", "Reading", ItemType.PROJECT, "personal", "#2dd4bf", 0, "📖");
  await addItem("fitness", "Fitness", ItemType.PROJECT, "personal", "#34d399", 1, "🏃");
  await addItem("hobbies", "Other Hobbies", ItemType.CUSTOM, "personal", "#5eead4", 2);

  const goalSpecs: Array<{
    item: ItemKey;
    name: string;
    hours?: number;
    minutes?: number;
    period: PeriodType;
    days?: number[];
    reminder?: boolean;
  }> = [
    { item: "startup", name: "Move the startup forward", hours: 20, period: PeriodType.WEEKLY, reminder: true },
    { item: "habitTracker", name: "Ship the habit tracker", hours: 8, period: PeriodType.WEEKLY },
    { item: "timeApp", name: "Ship the time tracker", hours: 10, period: PeriodType.WEEKLY, reminder: true },
    { item: "cp", name: "Compete every week", hours: 7, period: PeriodType.WEEKLY },
    { item: "reading", name: "Read every day", minutes: 30, period: PeriodType.DAILY, reminder: true },
    { item: "fitness", name: "Move four times", hours: 4, period: PeriodType.WEEKLY, days: [1, 3, 5, 6] },
    { item: "study", name: "Study deliberately", hours: 10, period: PeriodType.WEEKLY },
    { item: "clientA", name: "Deliver for Client A", hours: 15, period: PeriodType.WEEKLY },
    { item: "profDev", name: "Level up professionally", hours: 3, period: PeriodType.WEEKLY },
    { item: "business", name: "Learn the business side", hours: 60, period: PeriodType.MONTHLY },
  ];

  const startDate = at(120, 0);

  for (const spec of goalSpecs) {
    await prisma.goal.create({
      data: {
        workspaceId: workspace.id,
        itemId: items[spec.item],
        name: spec.name,
        targetSeconds: Math.round(((spec.hours ?? 0) * 3600) + ((spec.minutes ?? 0) * 60)),
        periodType: spec.period,
        daysOfWeek: spec.days ?? [],
        startDate,
        reminder: spec.reminder ?? false,
      },
    });
  }

  const descriptions: Record<string, string[]> = {
    clientA: ["Building the client flow", "Client call", "Reviewing a pull request", "Scoping the next milestone"],
    clientB: ["Client B maintenance", "Client sync", "Writing documentation"],
    jobSearch: ["Applying to roles", "Portfolio polish", "Interview prep"],
    profDev: ["Reading engineering notes", "Course session", "Practicing a new tool"],
    habitTracker: ["Building the streak view", "Polish on habit cards", "Fixing edge cases"],
    timeApp: ["Working on the timer", "Design iteration", "Analytics cleanup", "Bug fixing"],
    rentalDev: ["Rental app development", "Wiring up the listing flow", "Database work"],
    rentalResearch: ["Market research", "Competitor notes", "Talking to landlords"],
    rentalMarketing: ["Landing page copy", "Planning launch", "SEO notes"],
    cp: ["Problem set", "Contest practice", "Reviewing an editorial"],
    swe: ["Systems reading", "Architecture notes", "Practice project"],
    business: ["Business reading", "Case study notes", "Thinking through pricing"],
    reading: ["Evening reading", "Morning pages", "A quiet chapter"],
    fitness: ["Strength session", "Easy run", "Mobility work"],
    hobbies: ["Sketching", "Music practice", "An unhurried hobby"],
  };

  const descriptionsFor = (key: string) => {
    const list = descriptions[key] ?? descriptions.timeApp;
    return list[Math.floor(rand() * list.length)] as string;
  };

  const sessions: Array<{
    itemId: string;
    start: Date;
    minutes: number;
    description: string;
    source?: SessionSource;
  }> = [];

  const weighted: Array<{ key: string; weight: number }> = [
    { key: "clientA", weight: 8 },
    { key: "clientB", weight: 4 },
    { key: "jobSearch", weight: 3 },
    { key: "profDev", weight: 3 },
    { key: "habitTracker", weight: 8 },
    { key: "timeApp", weight: 10 },
    { key: "rentalDev", weight: 6 },
    { key: "rentalResearch", weight: 3 },
    { key: "rentalMarketing", weight: 2 },
    { key: "cp", weight: 9 },
    { key: "swe", weight: 4 },
    { key: "business", weight: 3 },
    { key: "reading", weight: 8 },
    { key: "fitness", weight: 5 },
    { key: "hobbies", weight: 2 },
  ];

  const totalWeight = weighted.reduce((acc, w) => acc + w.weight, 0);

  function pickItem() {
    let roll = rand() * totalWeight;
    for (const entry of weighted) {
      roll -= entry.weight;
      if (roll <= 0) return entry.key;
    }
    return weighted[0].key;
  }

  // A realistic background of tracked days.
  for (let daysAgo = 120; daysAgo >= 0; daysAgo--) {
    const day = subDays(new Date(), daysAgo);
    const weekday = Number(formatInTimeZone(day, TZ, "i")); // 1 (Mon) - 7 (Sun)
    if (rand() < 0.16) continue;
    if (weekday >= 6 && rand() < 0.45) continue;

    const sessionCount = 1 + Math.floor(rand() * 4);
    let cursor = 8 * 60 + Math.floor(rand() * 60);

    for (let i = 0; i < sessionCount; i++) {
      const key = pickItem();
      const minutes = [25, 30, 45, 50, 60, 75, 90, 120][Math.floor(rand() * 8)];
      cursor += Math.floor(rand() * 90);
      if (cursor + minutes > 22 * 60) break;
      sessions.push({
        itemId: items[key],
        start: at(daysAgo, Math.floor(cursor / 60), cursor % 60),
        minutes,
        description: descriptionsFor(key),
        source: rand() < 0.7 ? SessionSource.TIMER : SessionSource.MANUAL,
      });
      cursor += minutes;
    }
  }

  // A reliable reading habit with a couple of misses, so streaks look real.
  for (let daysAgo = 20; daysAgo >= 0; daysAgo--) {
    if (daysAgo === 3 || daysAgo === 11) continue;
    const minutes = 30 + Math.floor(rand() * 20);
    sessions.push({
      itemId: items.reading,
      start: at(daysAgo, 21, 15),
      minutes,
      description: "Evening reading",
      source: SessionSource.TIMER,
    });
  }

  // Keep this week's headline goals close to their targets.
  const thisWeekTargets: Array<{ key: string; minutes: number; day: number; hour: number }> = [
    { key: "timeApp", minutes: 300, day: 1, hour: 9 },
    { key: "timeApp", minutes: 240, day: 3, hour: 10 },
    { key: "habitTracker", minutes: 180, day: 2, hour: 14 },
    { key: "habitTracker", minutes: 150, day: 4, hour: 11 },
    { key: "cp", minutes: 120, day: 1, hour: 19 },
    { key: "cp", minutes: 120, day: 3, hour: 19 },
    { key: "cp", minutes: 90, day: 4, hour: 20 },
    { key: "startup", minutes: 180, day: 2, hour: 16 },
    { key: "startup", minutes: 150, day: 4, hour: 15 },
    { key: "fitness", minutes: 45, day: 1, hour: 7 },
    { key: "fitness", minutes: 55, day: 3, hour: 7 },
  ];

  const todayIndex = Number(formatInTimeZone(new Date(), TZ, "i"));
  for (const entry of thisWeekTargets) {
    const daysAgo = todayIndex - entry.day;
    if (daysAgo < 0) continue;
    sessions.push({
      itemId: items[entry.key],
      start: at(daysAgo, entry.hour, 0),
      minutes: entry.minutes,
      description: descriptionsFor(entry.key),
      source: SessionSource.TIMER,
    });
  }

  await prisma.timeSession.createMany({
    data: sessions.map((session) => ({
      userId: user.id,
      workspaceId: workspace.id,
      itemId: session.itemId,
      startTime: session.start,
      endTime: new Date(session.start.getTime() + session.minutes * 60_000),
      durationSeconds: session.minutes * 60,
      description: session.description,
      source: session.source ?? SessionSource.MANUAL,
    })),
  });

  console.log(`Seeded ${sessions.length} sessions for ${user.email} / demo1234`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
