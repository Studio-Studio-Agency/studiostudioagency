/**
 * Mapping of common grocery product names to emoji icons.
 * Keys are lowercase for case-insensitive matching.
 * Inspired by the Bring! app visual style.
 */
const PRODUCT_ICONS: Record<string, string> = {
  // Obst & Früchte
  apfel: "🍎", äpfel: "🍎", apple: "🍎",
  birne: "🍐", birnen: "🍐",
  banane: "🍌", bananen: "🍌",
  orange: "🍊", orangen: "🍊",
  zitrone: "🍋", zitronen: "🍋",
  limette: "🍋", limetten: "🍋",
  erdbeeren: "🍓", erdbeere: "🍓",
  blaubeeren: "🫐", heidelbeeren: "🫐",
  himbeeren: "🫐",
  weintrauben: "🍇", trauben: "🍇",
  kirsche: "🍒", kirschen: "🍒",
  wassermelone: "🍉", melone: "🍈",
  pfirsich: "🍑", pfirsiche: "🍑",
  mango: "🥭", mangos: "🥭",
  ananas: "🍍",
  kiwi: "🥝", kiwis: "🥝",
  avocado: "🥑", avocados: "🥑",
  kokosnuss: "🥥",

  // Gemüse
  tomate: "🍅", tomaten: "🍅", "cherry-tomaten": "🍅",
  kartoffel: "🥔", kartoffeln: "🥔",
  karotte: "🥕", karotten: "🥕", möhre: "🥕", möhren: "🥕", rüebli: "🥕",
  zwiebel: "🧅", zwiebeln: "🧅",
  knoblauch: "🧄",
  brokkoli: "🥦", broccoli: "🥦",
  salat: "🥬", kopfsalat: "🥬", eisbergsalat: "🥬", feldsalat: "🥬", rucola: "🥬",
  mais: "🌽",
  gurke: "🥒", gurken: "🥒", salatgurke: "🥒",
  paprika: "🫑",
  peperoni: "🌶️", chili: "🌶️",
  pilze: "🍄", champignons: "🍄",
  aubergine: "🍆",
  kürbis: "🎃",
  süsskartoffel: "🍠", süsskartoffeln: "🍠", süßkartoffel: "🍠",
  spinat: "🥬",
  zucchini: "🥒",
  ingwer: "🫚",
  spargel: "🌿",

  // Milchprodukte
  milch: "🥛", vollmilch: "🥛",
  butter: "🧈",
  käse: "🧀", emmentaler: "🧀", gruyère: "🧀", mozzarella: "🧀", parmesan: "🧀",
  joghurt: "🍶", jogurt: "🍶", naturjoghurt: "🍶",
  ei: "🥚", eier: "🥚",
  sahne: "🥛", rahm: "🥛",
  quark: "🥛",
  frischkäse: "🧀",

  // Backwaren
  brot: "🍞", toast: "🍞", toastbrot: "🍞", vollkornbrot: "🍞",
  brötchen: "🥖", semmel: "🥖", weggli: "🥖",
  baguette: "🥖",
  croissant: "🥐", gipfeli: "🥐",
  brezel: "🥨", bretzel: "🥨",
  kuchen: "🍰", torte: "🎂",
  mehl: "🌾",

  // Fleisch & Fisch
  poulet: "🍗", hähnchen: "🍗", huhn: "🍗", chicken: "🍗", hühnchen: "🍗",
  steak: "🥩", rindfleisch: "🥩", rind: "🥩",
  schweinefleisch: "🥩", schwein: "🥩",
  hackfleisch: "🥩", gehacktes: "🥩",
  wurst: "🌭", würstchen: "🌭", cervelat: "🌭",
  schinken: "🥓", speck: "🥓", bacon: "🥓",
  lachs: "🐟", salmon: "🐟",
  fisch: "🐟", thunfisch: "🐟",
  garnelen: "🦐", crevetten: "🦐", shrimps: "🦐",

  // Getränke
  wasser: "💧", mineralwasser: "💧",
  saft: "🧃", orangensaft: "🧃", apfelsaft: "🧃",
  kaffee: "☕", espresso: "☕",
  tee: "🍵",
  bier: "🍺",
  wein: "🍷", rotwein: "🍷", weisswein: "🍷",
  cola: "🥤", limonade: "🥤", sprite: "🥤", fanta: "🥤",
  smoothie: "🥤",
  energy: "⚡",

  // Grundnahrungsmittel
  reis: "🍚",
  pasta: "🍝", nudeln: "🍝", spaghetti: "🍝", penne: "🍝",
  pizza: "🍕",
  müesli: "🥣", müsli: "🥣", cornflakes: "🥣", haferflocken: "🥣",
  zucker: "🍬",
  salz: "🧂",
  pfeffer: "🫚",
  olivenöl: "🫒", öl: "🫒",
  essig: "🍶",
  honig: "🍯",
  senf: "🟡",
  ketchup: "🍅",
  mayonnaise: "🥫", mayo: "🥫",
  sojasauce: "🥫",

  // Snacks & Süsses
  schokolade: "🍫", schoggi: "🍫",
  chips: "🥔",
  nüsse: "🥜", erdnüsse: "🥜", mandeln: "🥜", cashews: "🥜",
  gummibärchen: "🍬", bonbons: "🍬",
  kekse: "🍪", cookies: "🍪", guetzli: "🍪",
  eis: "🍦", glacé: "🍦", glace: "🍦",
  popcorn: "🍿",

  // Tiefkühl
  tiefkühlpizza: "🍕",
  pommes: "🍟", fritten: "🍟",
  fischstäbchen: "🐟",

  // Haushalt
  toilettenpapier: "🧻", "wc-papier": "🧻", klopapier: "🧻",
  küchenpapier: "🧻", haushaltspapier: "🧻",
  spülmittel: "🧴", abwaschmittel: "🧴", geschirrspülmittel: "🧴",
  waschmittel: "🧺",
  müllbeutel: "🗑️", abfallsäcke: "🗑️",
  schwamm: "🧽",
  alufolie: "🫙", frischhaltefolie: "🫙",
  kerze: "🕯️", kerzen: "🕯️",
  batterien: "🔋", batterie: "🔋",
  glühbirne: "💡",

  // Pflege & Hygiene
  zahnpasta: "🪥", zahnbürste: "🪥",
  shampoo: "🧴", duschgel: "🧴",
  seife: "🧼",
  deo: "🧴", deodorant: "🧴",
  taschentücher: "🤧",
  pflaster: "🩹",
  sonnencreme: "☀️",
  rasierer: "🪒",

  // Baby & Kind
  windeln: "🧒", pampers: "🧒",
  babybrei: "🍼",
  schnuller: "👶",

  // Tierbedarf
  katzenfutter: "🐱", katzenstreu: "🐱",
  hundefutter: "🐶",

  // Schweizer Spezialitäten
  rivella: "🥤", "rivella rot": "🥤", "rivella blau": "🥤",
  zopf: "🍞", butterzopf: "🍞",
  bündnerfleisch: "🥩",
  rösti: "🥔", rööschti: "🥔",
  raclette: "🧀", "raclette-käse": "🧀",
  fondue: "🫕", käsefondue: "🫕", "fondue chinoise": "🫕",
  birchermüesli: "🥣", birchermüsli: "🥣",
  ovomaltine: "☕", ovo: "☕",
  aromat: "🧂",
  appenzeller: "🧀",
  greyerzer: "🧀",
  sbrinz: "🧀", tilsiter: "🧀",
  landjäger: "🌭",
  zürigschnätzlets: "🥩",
  älplermagronen: "🍝",
  leckerli: "🍪",
  luxemburgerli: "🍬",
  toblerone: "🍫",
  sugus: "🍬",
  thomy: "🟡", "thomy senf": "🟡", "thomy mayo": "🥫",
  cailler: "🍫",
  ragusa: "🍫",
  zweifel: "🥔", "zweifel chips": "🥔",
  mostbröckli: "🥩",
  biberli: "🍪",
  magenbrot: "🍪",
  nusstorte: "🥧", "bündner nusstorte": "🥧",
  meringue: "🍰",
  vermicelles: "🍰",
  zigerbrüt: "🍞",
  schüblig: "🌭",
  kalbsbratwurst: "🌭", bratwurst: "🌭", "st. galler bratwurst": "🌭",
  fleischkäse: "🥩",
  viande: "🥩",
  ziger: "🧀",
  vacherin: "🧀",
  "tête de moine": "🧀",
  "basler leckerli": "🍪",

  // Schweizer Marken & Supermarkt
  aproz: "💧", "aproz mineral": "💧",
  farmer: "🥣", "farmer riegel": "🥣", "farmer crunchy": "🥣",
  "m-budget": "🛒", "m budget": "🛒",
  sélection: "🛒", selection: "🛒",
  "prix garantie": "🛒",
  naturaplan: "🌿", naturaline: "🌿",
  "fine food": "✨",
  "anna's best": "🥗", "annas best": "🥗",
  "betty bossi": "🍽️",
  hero: "🥫", "hero konfitüre": "🥫",
  knorr: "🥣", "knorr suppe": "🥣",
  maggi: "🥣", "maggi würze": "🥣",
  "le parfait": "🥫",
  emmi: "🥛", "emmi caffè latte": "☕", "caffè latte": "☕",
  "kiri": "🧀", "la vache qui rit": "🧀",
  wander: "☕",
  ricola: "🍬",
  läderach: "🍫",
  sprüngli: "🍫", "sprüngli pralinés": "🍫",
  lindt: "🍫", "lindt lindor": "🍫",
  frey: "🍫", "chocolat frey": "🍫",
  "minor": "🍫",
  "branches": "🍫",
  "dar-vida": "🍪", darvida: "🍪",
  "wernli": "🍪",
  "kambly": "🍪", "kambly bretzeli": "🍪",
  "hug": "🍪",
  migros: "🛒",
  coop: "🛒",
  aldi: "🛒",
  lidl: "🛒",
  denner: "🛒",
  volg: "🛒",
  spar: "🛒",
  "elmer citro": "🥤", "elmer": "🥤",
  "passugger": "💧",
  "valser": "💧",
  "henniez": "💧",
  "rhäzünser": "💧",
  "ramseier": "🧃", "ramseier apfelschorle": "🧃",
  "rivella grün": "🥤",
  "möhl": "🧃", "möhl most": "🧃",
  "appenzeller bier": "🍺", "quöllfrisch": "🍺",
  "feldschlösschen": "🍺",
  "cardinal": "🍺",
  "eichhof": "🍺",
  "chopfab": "🍺",
};

/**
 * Returns a matching emoji icon for a product name.
 * Performs case-insensitive partial matching.
 */
export function getProductIcon(name: string): string | null {
  const lower = name.toLowerCase().trim();

  // Exact match
  if (PRODUCT_ICONS[lower]) return PRODUCT_ICONS[lower];

  // Check if the product name starts with a known key
  for (const [key, icon] of Object.entries(PRODUCT_ICONS)) {
    if (lower.startsWith(key) || lower.includes(key)) {
      return icon;
    }
  }

  return null;
}
