import { Dexie } from "dexie";

export const db = new Dexie("geoFeatures");

db.version(1).stores({
  features: "++id, title, description, latitude, longitude",
});

export async function seedEmptyDatabase() {
  const count = await db.table("features").count();

  if (count > 0) {
    return;
  }

  await db.table("features").bulkAdd([
    {
      title: "Central Park",
      description: "A large public park in New York City.",
      latitude: 40.785091,
      longitude: -73.968285,
    },
    {
      title: "Eiffel Tower",
      description: "An iconic landmark in Paris.",
      latitude: 48.85837,
      longitude: 2.294481,
    },
    {
      title: "Sydney Opera House",
      description: "A famous performing arts center in Sydney.",
      latitude: -33.856784,
      longitude: 151.215297,
    },
  ]);
}

await seedEmptyDatabase();
