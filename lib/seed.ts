// SuiteScout seed data — the 20 verified batch-3 resorts.
// Source: workspace/goals/vivereply-suite-backlinks-and-20-client-push/
//   files/vivereply-leads/batch3-research.md (researched 2026-10-17,
//   browser-verified). Names, websites and locations only.
// NO phone numbers, NO email addresses — contact details stay out of
// this public repo. The demo trio (the video runs these) is flagged
// demo=true.

export interface SeedProspect {
  name: string;
  website: string | null;
  location: string;
  demo: boolean;
}

export const SEED_PROSPECTS: SeedProspect[] = [
  {
    name: "Sundori Eco Resort",
    website: "http://sundoriecoresort.com/",
    location: "Mongla, Bagerhat (Sundarbans gateway)",
    demo: true,
  },
  {
    name: "Gol Kanon Eco Resort",
    website: null,
    location: "Mongla, Bagerhat",
    demo: false,
  },
  {
    name: "The Cox Beach Resort",
    website: "https://thecoxbeachresort.com/",
    location: "Cox's Bazar",
    demo: true,
  },
  {
    name: "Balishira Resort",
    website: "http://www.balishiraresort.com/",
    location: "Sreemangal, Moulvibazar",
    demo: true,
  },
  {
    name: "Tilagaon Eco Village",
    website: "http://www.tilagaoneconvillage.com/",
    location: "Kamalganj, Moulvibazar",
    demo: false,
  },
  {
    name: "Giriraj Resort",
    website: null,
    location: "Bandarban",
    demo: false,
  },
  {
    name: "Nilanjana Boat Club & Resort",
    website: null,
    location: "Rangamati (Kaptai Lake)",
    demo: false,
  },
  {
    name: "Miami Beach Resort",
    website: null,
    location: "Cox's Bazar",
    demo: false,
  },
  {
    name: "Modern Resort",
    website: null,
    location: "Cox's Bazar",
    demo: false,
  },
  {
    name: "Sreemangal Eco Resort",
    website: "http://sreemangalecoresort.com/",
    location: "Sreemangal, Moulvibazar",
    demo: false,
  },
  {
    name: "Rodela Eco Resort",
    website: null,
    location: "Kamalganj, Moulvibazar",
    demo: false,
  },
  {
    name: "Shyamol Chhaya Eco Cottage",
    website: null,
    location: "Kamalganj, Moulvibazar",
    demo: false,
  },
  {
    name: "Sawpnorajjo Park & Resort",
    website: "https://sawpnorajjo.com/",
    location: "Kuakata, Patuakhali",
    demo: false,
  },
  {
    name: "Nijhum Dwip Keora Eco Resort",
    website: null,
    location: "Nijhum Dwip, Noakhali",
    demo: false,
  },
  {
    name: "Rungrang Resort Cottage",
    website: "https://sajek-resort-rungrang-cottage.business.site/",
    location: "Sajek Valley, Rangamati",
    demo: false,
  },
  {
    name: "Machang Bari Resort",
    website: null,
    location: "Bandarban",
    demo: false,
  },
  {
    name: "Lake View Island",
    website: null,
    location: "Rangamati (Kaptai Lake)",
    demo: false,
  },
  {
    name: "Aronnak Holiday Resort",
    website: "http://www.aronnok.com/",
    location: "Rangamati",
    demo: false,
  },
  {
    name: "Royal Beach Resort",
    website: "https://royalbeachbd.com/",
    location: "Cox's Bazar",
    demo: false,
  },
  {
    name: "Pansi Hotel & Resorts",
    website: "https://panshi.virtualistbd.com/",
    location: "Kuakata, Patuakhali",
    demo: false,
  },
];

export function seedProspects(
  insert: (p: SeedProspect, now: string) => void,
): void {
  const now = new Date().toISOString();
  for (const p of SEED_PROSPECTS) {
    insert(p, now);
  }
}
