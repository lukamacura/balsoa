export type LonLat = [lon: number, lat: number];

export const countries = {
  at: "Austria",
  hu: "Hungary",
  rs: "Serbia",
  hr: "Croatia",
  bg: "Bulgaria",
  it: "Italy",
  es: "Spain",
  ae: "United Arab Emirates",
  mx: "Mexico",
  co: "Colombia",
  pe: "Peru",
  bo: "Bolivia",
  ar: "Argentina",
} as const;

export type CountryCode = keyof typeof countries;

export type ReferenceItem = {
  id: string;
  place: string;
  title: string;
  detail?: string;
  metric?: string;
  coords?: LonLat;
  flags?: CountryCode[];
};

export type ReferenceGroup = {
  id: string;
  label: string;
  intro: string;
  items: ReferenceItem[];
};

export type ReachStage = {
  id: string;
  label: string;
  /** Globe centre while this stage is in view. */
  view: LonLat;
  /** Camera distance: above 1 moves closer to the surface. */
  zoom: number;
  places: CountryCode[];
};

export const nav = [
  { label: "About", href: "#about" },
  { label: "Reach", href: "#reach" },
  { label: "Services", href: "#services" },
  { label: "Numbers", href: "#numbers" },
  { label: "References", href: "#references" },
  { label: "Contact", href: "#contact" },
];

export const contact = {
  email: "office@balsoaconsulting.com",
  web: "www.balsoaconsulting.com",
  webUrl: "https://www.balsoaconsulting.com",
  location: "Vienna, Austria",
};

export const hero = {
  eyebrow: "Balsoa Consulting · Vienna, Austria",
  lines: ["Energy, Oil & Gas", "Advisory & Engineering", "Solutions."],
  lead: "Engineering know-how and global partnerships for energy, oil and gas projects, from concept to commissioning.",
  stats: [
    { value: "14+14", unit: "MWe / MWt", label: "Gas-engine CHP, Novi Sad" },
    { value: "48″", unit: "Ø valves", label: "Balkan Stream interconnector" },
    { value: "13", unit: "countries", label: "Across four continents", flags: Object.keys(countries) as CountryCode[] },
    { value: "9", unit: "AVL", label: "Approved vendor registrations" },
  ],
};

export const partners = [
  "Ecopetrol",
  "PEMEX",
  "Srbijagas",
  "Bulgartransgas",
  "JANAF",
  "Técnicas Reunidas",
  "Enagás",
  "Bonatti",
  "TGI Colombia",
  "YPFB",
  "Petroperu",
  "TECHINT",
  "Pluspetrol",
  "TGN",
  "Beogradske elektrane",
  "Novosadska toplana",
];

export const about = {
  statement:
    "We unite technical expertise, engineering know-how and global partnerships across energy, oil and gas.",
  body: "Long-standing partners worldwide let us choose the right equipment, guarantee quality at competitive prices and compete on equal terms with the industry’s global leaders.",
  pillars: [
    { title: "Technical support", text: "From first assessment to delivery." },
    { title: "Equipment selection", text: "Pipes, valves, metering stations, engines and turbines." },
    { title: "Quality, fairly priced", text: "Backed by long-standing global partners." },
  ],
};

export const reach = {
  title: "One office. Four continents.",
  stages: [
    {
      id: "europe",
      label: "Europe",
      view: [17, 42],
      zoom: 1.55,
      places: ["at", "hu", "rs", "hr", "bg", "it", "es"],
    },
    {
      id: "middle-east",
      label: "Middle East",
      view: [38, 34],
      zoom: 1.2,
      places: ["ae"],
    },
    {
      id: "americas",
      label: "The Americas",
      view: [-56, 6],
      zoom: 1,
      places: ["mx", "co", "pe", "bo", "ar"],
    },
  ] satisfies ReachStage[],
};

export const services = {
  title: "From strategy to steel in the ground.",
  intro: "Three disciplines on one line, from first concept to commissioning.",
  items: [
    {
      id: "energy",
      title: "Energy Consulting",
      summary: "Strategy through greenfield delivery across energy, oil and gas.",
      points: ["Strategy & planning", "Distribution networks", "CHP plants", "Hybrid & renewables", "Greenfield projects"],
    },
    {
      id: "engineering",
      title: "Project Management & Engineering",
      summary: "Supply, sizing and supervision to international standards.",
      points: ["Pipe, valves & MRS", "Engines, turbines & boilers", "Site supervision"],
    },
    {
      id: "business",
      title: "Business Development",
      summary: "New markets and the partnerships that win projects.",
      points: ["Market entry", "EPC partnerships", "Global engineering network"],
    },
  ],
};

export const references = {
  title: "Proven on pipelines, plants and platforms.",
  intro: "Projects and vendor qualifications across Europe, the Middle East and the Americas.",
  groups: [
    {
      id: "energy",
      label: "Energy",
      intro: "Power, heat and cooling plants built on gas engines and biogas.",
      items: [
        {
          id: "at-biogas",
          place: "Austria",
          title: "Biogas plants",
          coords: [15.2, 47.4],
          flags: ["at"],
        },
        {
          id: "hu-chp",
          place: "Hungary",
          title: "Heating plants & CHP",
          detail: "Gas-engine CHP integrated into district heating.",
          coords: [19.04, 47.5],
          flags: ["hu"],
        },
        {
          id: "rs-novi-sad",
          place: "Novi Sad, Serbia",
          title: "JKP Novosadska toplana",
          detail: "Gas-engine cogeneration plant.",
          metric: "14 MWe + 14 MWt",
          coords: [19.84, 45.27],
          flags: ["rs"],
        },
        {
          id: "rs-belgrade",
          place: "Belgrade, Serbia",
          title: "JKP Beogradske elektrane",
          detail: "Gas-engine CHP in the city heating system.",
          metric: "10 MWe + 10 MWt",
          coords: [20.46, 44.79],
          flags: ["rs"],
        },
        {
          id: "uae-cooling",
          place: "United Arab Emirates",
          title: "District cooling",
          detail: "Gas engines with absorption chillers.",
          coords: [55.27, 25.2],
          flags: ["ae"],
        },
        {
          id: "black-sea",
          place: "Black Sea, offshore",
          title: "Offshore platforms",
          detail: "Power supply and CHP gensets for oil & gas platforms.",
          coords: [31.6, 43.4],
        },
        {
          id: "landfill",
          place: "Multiple sites",
          title: "Landfill gas",
          detail: "Biogas collection, flares and gas-engine power.",
        },
      ],
    },
    {
      id: "oil-gas",
      label: "Oil & Gas",
      intro: "Pipe, valves and engineering for pipeline operators.",
      items: [
        {
          id: "balkan-stream",
          place: "Serbia · Bulgaria",
          title: "Balkan Stream interconnector",
          detail: "Pipe, large-bore valves and actuators, plus engineering support to the main EPC contractor.",
          metric: "48″",
          coords: [22.4, 43.4],
          flags: ["rs", "bg"],
        },
        {
          id: "bulgartransgas",
          place: "Bulgaria",
          title: "Bulgartransgas",
          detail: "Pipeline and fittings.",
          coords: [23.32, 42.7],
          flags: ["bg"],
        },
        {
          id: "srbijagas",
          place: "Serbia",
          title: "Srbijagas",
          detail: "Industrial valves and actuators.",
          coords: [19.84, 45.27],
          flags: ["rs"],
        },
        {
          id: "janaf",
          place: "Croatia",
          title: "JANAF",
          detail: "Specialised valves for oil pipelines.",
          coords: [15.98, 45.81],
          flags: ["hr"],
        },
        {
          id: "spain",
          place: "Spain",
          title: "Técnicas Reunidas · Enagás · Grupo Cuñado",
          detail: "Industrial valve supply.",
          coords: [-3.7, 40.42],
          flags: ["es"],
        },
        {
          id: "italy",
          place: "Italy",
          title: "Bonatti",
          detail: "Valves for the international contractor.",
          coords: [10.33, 44.8],
          flags: ["it"],
        },
        {
          id: "colombia",
          place: "Colombia",
          title: "Ecopetrol",
          detail: "Pipes and valves via the EPC contractor.",
          coords: [-74.07, 4.71],
          flags: ["co"],
        },
        {
          id: "peru",
          place: "Peru",
          title: "Cupersa",
          detail: "Equipment supply.",
          coords: [-77.04, -12.05],
          flags: ["pe"],
        },
      ],
    },
    {
      id: "avl",
      label: "Approved Vendor Lists",
      intro: "Direct supplier registration with national energy companies.",
      items: [
        {
          id: "avl-colombia",
          place: "Colombia",
          title: "TGI Colombia · Ecopetrol",
          coords: [-74.07, 4.71],
          flags: ["co"],
        },
        {
          id: "avl-bolivia",
          place: "Bolivia",
          title: "YPFB",
          coords: [-68.15, -16.5],
          flags: ["bo"],
        },
        {
          id: "avl-peru",
          place: "Peru",
          title: "Petroperu",
          coords: [-77.04, -12.05],
          flags: ["pe"],
        },
        {
          id: "avl-argentina",
          place: "Argentina",
          title: "TECHINT · Pluspetrol · TGN · Odebrecht",
          coords: [-58.38, -34.6],
          flags: ["ar"],
        },
        {
          id: "avl-mexico",
          place: "Mexico",
          title: "PEMEX",
          coords: [-99.13, 19.43],
          flags: ["mx"],
        },
      ],
    },
  ] satisfies ReferenceGroup[],
};

export const numbers = {
  title: "Worked out by hand.",
  intro: "The figures behind our references, line by line.",
  project: "Reference figures",
  sheet: [
    { heading: "1. CHP output" },
    { label: "Novi Sad", value: "14 MWe + 14 MWt" },
    { label: "Belgrade", value: "10 MWe + 10 MWt", sum: true },
    { label: "Total", value: "24 MWe + 24 MWt" },
    { value: "= 48 MW", mark: "circle" },
    { heading: "2. Balkan Stream" },
    { label: "Pipe Ø", value: "48 in × 25.4 mm/in" },
    { value: "= 1219 mm", mark: "underline" },
    { heading: "3. Network" },
    { label: "Countries", value: "7 + 1 + 5 = 13" },
    { label: "AVL", value: "2 + 1 + 1 + 4 + 1 = 9", mark: "check" },
  ] satisfies CalcRow[],
};

export type CalcRow = {
  heading?: string;
  label?: string;
  value?: string;
  /** Draw the column-addition rule under this row. */
  sum?: boolean;
  mark?: "circle" | "underline" | "check";
};

export const contactSection = {
  title: "Let’s talk about your next project.",
  intro: "From a single valve package to a greenfield plant.",
};
