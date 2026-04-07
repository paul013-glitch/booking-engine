const fs = require("fs/promises");
const path = require("path");

function toYmd(date) {
  return date.toISOString().slice(0, 10);
}

function parseIcsDates(icsText) {
  const matches = [...icsText.matchAll(/DTSTART;VALUE=DATE:(\d{8})[\s\S]*?DTEND;VALUE=DATE:(\d{8})/g)];
  const blocked = new Set();

  for (const match of matches) {
    const startRaw = match[1];
    const endRaw = match[2];

    const start = new Date(`${startRaw.slice(0, 4)}-${startRaw.slice(4, 6)}-${startRaw.slice(6, 8)}T00:00:00Z`);
    const endExclusive = new Date(`${endRaw.slice(0, 4)}-${endRaw.slice(4, 6)}-${endRaw.slice(6, 8)}T00:00:00Z`);

    for (let day = new Date(start); day < endExclusive; day.setUTCDate(day.getUTCDate() + 1)) {
      blocked.add(toYmd(day));
    }
  }

  return [...blocked].sort();
}

async function main() {
  const icalUrl = process.env.AIRBNB_ICAL_URL;

  if (!icalUrl) {
    throw new Error("Missing AIRBNB_ICAL_URL environment variable");
  }

  const response = await fetch(icalUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch iCal: ${response.status} ${response.statusText}`);
  }

  const icsText = await response.text();
  const blockedDates = parseIcsDates(icsText);
  const outputPath = path.resolve(process.cwd(), "blocked-dates.json");

  await fs.writeFile(outputPath, JSON.stringify(blockedDates, null, 2) + "\n", "utf8");

  console.log(`Updated ${outputPath} with ${blockedDates.length} blocked dates`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
