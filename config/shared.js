// Shared configuration constants for DM Cockpit
// This file is imported by both frontend and backend

// DMG XP thresholds by level (Easy, Medium, Hard, Deadly)
// Source: D&D 5e Dungeon Master's Guide p.82
export const XP_THRESHOLDS = {
  1:  [25, 50, 75, 100],
  2:  [50, 100, 150, 200],
  3:  [75, 150, 225, 400],
  4:  [125, 250, 375, 500],
  5:  [250, 500, 750, 1100],
  6:  [300, 600, 900, 1400],
  7:  [350, 750, 1100, 1700],
  8:  [450, 900, 1400, 2100],
  9:  [550, 1100, 1600, 2400],
  10: [600, 1200, 900, 2800],
  11: [800, 1600, 2400, 3600],
  12: [1000, 2000, 3000, 4500],
  13: [1100, 2200, 3400, 5100],
  14: [1250, 2500, 3800, 5700],
  15: [1400, 2800, 4300, 6400],
  16: [1600, 3200, 4800, 7200],
  17: [2000, 3900, 5900, 8800],
  18: [2100, 4200, 6300, 9500],
  19: [2400, 4900, 7300, 10900],
  20: [2800, 5700, 8500, 12700]
};

// DMG Monster XP by Challenge Rating
// Source: D&D 5e Dungeon Master's Guide p.82
export const MONSTER_XP = {
  '0': 10, '1/8': 25, '1/4': 50, '1/2': 100, '1': 200, '2': 450, '3': 700,
  '4': 1100, '5': 1800, '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900,
  '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000, '16': 15000,
  '17': 18000, '18': 20000, '19': 22000, '20': 25000, '21': 33000, '22': 41000,
  '23': 50000, '24': 62000, '25': 75000, '26': 90000, '27': 105000, '28': 120000,
  '29': 135000, '30': 155000
};

// AI Provider configurations
export const AI_PROVIDERS = [
  { id: 'ollama_local', name: 'Ollama (Local)', requiresKey: false },
  { id: 'ollama_cloud', name: 'Ollama (Cloud)', requiresKey: false },
  { id: 'openai', name: 'OpenAI', requiresKey: true },
  { id: 'claude', name: 'Anthropic Claude', requiresKey: true },
  { id: 'openrouter', name: 'OpenRouter', requiresKey: true },
  { id: 'gemini', name: 'Google Gemini', requiresKey: true }
];

// Default AI settings per provider
export const DEFAULT_AI_SETTINGS = {
  ollama_local: {
    endpoint: 'http://localhost:11434',
    model: 'llama3.2'
  },
  ollama_cloud: {
    endpoint: 'https://ollama.cloud',
    model: 'llama3.2'
  },
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  },
  claude: {
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-sonnet-20241022'
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'openrouter/auto'
  },
  gemini: {
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini:generateContent',
    model: 'gemini-2.5-flash'
  }
};

// Environment.monster mappings for random encounter generator
export const ENVIRONMENT_MONSTERS = {
  Arctic: [
    {name:'Ice Mephit',cr:'1/2'},{name:'Winter Wolf',cr:'3'},{name:'Yeti',cr:'3'},
    {name:'Polar Bear',cr:'2'},{name:'Ice Golem',cr:'5'},{name:'Frost Giant',cr:'8'},
    {name:'Remorhaz',cr:'11'},{name:'White Dragon Wyrmling',cr:'2'},{name:'Young White Dragon',cr:'6'},
    {name:'Bheur Hag',cr:'7'},{name:'Orc War Chief',cr:'4'},{name:'Wolf',cr:'1/4'}
  ],
  Coastal: [
    {name:'Giant Crab',cr:'1/8'},{name:'Reef Shark',cr:'1/2'},{name:'Sahuagin',cr:'1/2'},
    {name:'Harpy',cr:'1'},{name:'Merrow',cr:'2'},{name:'Sea Hag',cr:'2'},
    {name:'Water Elemental',cr:'5'},{name:'Young Bronze Dragon',cr:'8'},{name:'Giant Octopus',cr:'1'},
    {name:'Plesiosaurus',cr:'2'},{name:'Sahuagin Baron',cr:'5'},{name:'Dragon Turtle',cr:'17'}
  ],
  Desert: [
    {name:'Giant Poisonous Snake',cr:'1/4'},{name:'Fire Snake',cr:'1'},{name:'Giant Hyena',cr:'1'},
    {name:'Hobgoblin',cr:'1/2'},{name:'Wight',cr:'3'},{name:'Hell Hound',cr:'3'},
    {name:'Yuan-ti Malison',cr:'3'},{name:'Medusa',cr:'6'},{name:'Young Brass Dragon',cr:'6'},
    {name:'Purple Worm',cr:'15'},{name:'Mummy Lord',cr:'15'},{name:'Androsphinx',cr:'17'}
  ],
  Forest: [
    {name:'Giant Rat',cr:'1/8'},{name:'Giant Bat',cr:'1/4'},{name:'Wolf',cr:'1/4'},
    {name:'Giant Spider',cr:'1'},{name:'Hobgoblin',cr:'1/2'},{name:'Worg',cr:'1/2'},
    {name:'Giant Boar',cr:'2'},{name:'Ogre',cr:'2'},{name:'Hobgoblin Captain',cr:'3'},
    {name:'Werewolf',cr:'3'},{name:'Young Green Dragon',cr:'8'},{name:'Treant',cr:'9'},
    {name:'Unicorn',cr:'5'},{name:'Grick',cr:'2'}
  ],
  Grassland: [
    {name:'Giant Weasel',cr:'1/8'},{name:'Giant Badger',cr:'1/4'},{name:'Panther',cr:'1/4'},
    {name:'Jackalwere',cr:'1/2'},{name:'Lion',cr:'1'},{name:'Giant Eagle',cr:'1'},
    {name:'Rhinoceros',cr:'2'},{name:'Giant Elk',cr:'2'},{name:'Ankheg',cr:'2'},
    {name:'Hobgoblin Captain',cr:'3'},{name:'Couatl',cr:'4'},{name:'Elephant',cr:'4'},
    {name:'Hill Giant',cr:'5'},{name:'Triceratops',cr:'5'},{name:'Tyrannosaurus Rex',cr:'8'}
  ],
  Hill: [
    {name:'Giant Goat',cr:'1/2'},{name:'Giant Owl',cr:'1/4'},{name:'Wolf',cr:'1/4'},
    {name:'Hobgoblin',cr:'1/2'},{name:'Orc',cr:'1/2'},{name:'Giant Boar',cr:'2'},
    {name:'Ogre',cr:'2'},{name:'Hippogriff',cr:'1'},{name:'Griffon',cr:'2'},
    {name:'Troll',cr:'5'},{name:'Ettin',cr:'4'},{name:'Chimera',cr:'6'},
    {name:'Wyvern',cr:'6'},{name:'Hill Giant',cr:'5'},{name:'Young Copper Dragon',cr:'7'}
  ],
  Mountain: [
    {name:'Giant Goat',cr:'1/2'},{name:'Aarakocra',cr:'1/4'},{name:'Pteranodon',cr:'1/4'},
    {name:'Griffon',cr:'2'},{name:'Giant Elk',cr:'2'},{name:'Wyvern',cr:'6'},
    {name:'Bulette',cr:'5'},{name:'Basilisk',cr:'3'},{name:'Manticore',cr:'3'},
    {name:'Young Silver Dragon',cr:'9'},{name:'Stone Giant',cr:'7'},{name:'Frost Giant',cr:'8'},
    {name:'Young Red Dragon',cr:'10'},{name:'Fire Giant',cr:'9'},{name:'Roc',cr:'11'}
  ],
  Swamp: [
    {name:'Giant Rat',cr:'1/8'},{name:'Giant Frog',cr:'1/4'},{name:'Constrictor Snake',cr:'1/4'},
    {name:'Crocodile',cr:'1/2'},{name:'Lizardfolk',cr:'1/2'},{name:'Giant Spider',cr:'1'},
    {name:'Ghoul',cr:'1'},{name:'Swarm of Insects',cr:'1/2'},{name:"Will-o'-Wisp",cr:'2'},
    {name:'Ghast',cr:'2'},{name:'Ogre',cr:'2'},{name:'Shambling Mound',cr:'5'},
    {name:'Young Black Dragon',cr:'7'},{name:'Hydra',cr:'8'},{name:'Froghemoth',cr:'10'}
  ],
  Underdark: [
    {name:'Giant Bat',cr:'1/4'},{name:'Giant Rat',cr:'1/8'},{name:'Giant Centipede',cr:'1/4'},
    {name:'Giant Spider',cr:'1'},{name:'Scout',cr:'1/2'},{name:'Drow',cr:'1/4'},
    {name:'Bugbear',cr:'1'},{name:'Deep Gnome',cr:'1/2'},{name:'Carrion Crawler',cr:'2'},
    {name:'Grell',cr:'3'},{name:'Ochre Jelly',cr:'2'},{name:'Doppelganger',cr:'3'},
    {name:'Mind Flayer',cr:'7'},{name:'Beholder',cr:'13'},{name:'Aboleth',cr:'10'},
    {name:'Hook Horror',cr:'3'},{name:'Umber Hulk',cr:'5'}
  ],
  Underwater: [
    {name:'Giant Crab',cr:'1/8'},{name:'Merfolk',cr:'1/4'},{name:'Reef Shark',cr:'1/2'},
    {name:'Sahuagin',cr:'1/2'},{name:'Giant Octopus',cr:'1'},{name:'Merrow',cr:'2'},
    {name:'Killer Whale',cr:'3'},{name:'Water Elemental',cr:'5'},{name:'Giant Shark',cr:'5'},
    {name:'Dragon Turtle',cr:'17'},{name:'Kraken',cr:'23'},{name:'Marid',cr:'11'},
    {name:'Sea Hag',cr:'2'}
  ],
  Urban: [
    {name:'Rat',cr:'0'},{name:'Cat',cr:'0'},{name:'Commoner',cr:'0'},
    {name:'Noble',cr:'1/8'},{name:'Guard',cr:'1/8'},{name:'Cultist',cr:'1/8'},
    {name:'Thug',cr:'1/2'},{name:'Spy',cr:'1'},{name:'Bandit',cr:'1/8'},
    {name:'Knight',cr:'3'},{name:'Veteran',cr:'3'},{name:'Assassin',cr:'8'},
    {name:'Gladiator',cr:'5'},{name:'Mage',cr:'6'},{name:'Priest',cr:'2'},
    {name:'Were-rat',cr:'2'},{name:'Wererat',cr:'2'}
  ],
  Dungeon: [
    {name:'Giant Rat',cr:'1/8'},{name:'Giant Centipede',cr:'1/4'},{name:'Skeleton',cr:'1/4'},
    {name:'Giant Spider',cr:'1'},{name:'Zombie',cr:'1/4'},{name:'Ghoul',cr:'1'},
    {name:'Shadow',cr:'1/2'},{name:'Mimic',cr:'2'},{name:'Rust Monster',cr:'1/2'},
    {name:'Gelatinous Cube',cr:'2'},{name:'Ochre Jelly',cr:'2'},{name:'Carrion Crawler',cr:'2'},
    {name:'Hell Hound',cr:'3'},{name:'Black Pudding',cr:'4'},{name:'Roper',cr:'5'},
    {name:'Beholder',cr:'13'},{name:'Lich',cr:'21'}
  ],
  Planar: [
    {name:'Flumph',cr:'1/8'},{name:'Modron',cr:'1/8'},{name:'Abyssal Chicken',cr:'1/4'},
    {name:'Dretch',cr:'1/4'},{name:'Quasit',cr:'1'},{name:'Mephit',cr:'1/2'},
    {name:'Hell Hound',cr:'3'},{name:'Succubus',cr:'4'},{name:'Incubus',cr:'4'},
    {name:'Vrock',cr:'6'},{name:'Hezrou',cr:'8'},{name:'Glabrezu',cr:'9'},
    {name:'Nalfeshnee',cr:'13'},{name:'Marilith',cr:'16'},{name:'Balor',cr:'19'},
    {name:'Planetar',cr:'16'},{name:'Solar',cr:'21'}
  ]
};

// Default environment list for encounter builder
export const ENVIRONMENTS = [
  'Arctic', 'Coastal', 'Desert', 'Dungeon', 'Forest', 'Grassland',
  'Hill', 'Mountain', 'Planar', 'Swamp', 'Underdark', 'Underwater', 'Urban'
];

// Default DDB sources (books) for monster filtering
export const DDB_SOURCES = [
  { name: 'Any Book', value: '' },
  { name: 'Monster Manual', value: 'Monster Manual' },
  { name: "Volo's Guide to Monsters", value: "Volo's Guide" },
  { name: "Mordenkainen's Tome of Foes", value: "Mordenkainens Tome" },
  { name: "Fizban's Treasury of Dragons", value: "Fizbans Treasury" },
  { name: 'Curse of Strahd', value: 'Curse of Strahd' },
  { name: 'Out of the Abyss', value: 'Out of the Abyss' },
  { name: 'Storm Kings Thunder', value: 'Storm Kings Thunder' },
  { name: 'Tomb of Annihilation', value: 'Tomb of Annihilation' },
  { name: 'Waterdeep: Dragon Heist', value: 'Waterdeep: Dragon Heist' },
  { name: 'Waterdeep: Dungeon of the Mad Mage', value: 'Waterdeep: Dungeon of the Mad Mage' },
  { name: 'Lost Mine of Phandelver', value: 'Lost Mine of Phandelver' }
];

// CR filter options
export const CR_FILTERS = [
  { value: '', label: 'Any CR' },
  { value: '0', label: 'CR 0' },
  { value: '1/8', label: 'CR 1/8' },
  { value: '1/4', label: 'CR 1/4' },
  { value: '1/2', label: 'CR 1/2' },
  { value: '1', label: 'CR 1' },
  { value: '2', label: 'CR 2' },
  { value: '3', label: 'CR 3' },
  { value: '4', label: 'CR 4' },
  { value: '5', label: 'CR 5+' }
];

// Random encounter CR options (min/max selectors)
export const RANDOM_CR_OPTIONS = [
  '0', '1/8', '1/4', '1/2', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  '10', '11', '12', '13', '14', '15', '16'
];

// Combat status conditions list
export const CONDITIONS_LIST = [
  'Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 'Incapacitated',
  'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained',
  'Stunned', 'Unconscious', 'Concentrating', 'Blessed', 'Bane', 'Hasted', 'Slowed',
  'Restrained (Web)', 'Faerie Fire', 'Hexed', "Hunter's Mark"
];

// Magic item tables (DMG)
export const MAGIC_ITEMS = {
  A: ['Potion of climbing','Potion of healing','Spell scroll (cantrip)','Spell scroll (1st level)','Bag of holding','Driftglobe'],
  B: ['Potion of greater healing','Potion of fire breath','Potion of resistance','Ammunition +1','Potion of animal friendship','Potion of hill giant strength','Potion of growth','Potion of water breathing','Spell scroll (2nd level)','Spell scroll (3rd level)','Bag of holding',"Keoghtom's ointment",'Oil of slipperiness','Dust of disappearance','Dust of dryness','Dust of sneezing and choking','Elemental gem','Philter of love','Alchemy jug','Cap of water breathing','Cloak of the manta ray','Decanter of endless water','Eversmoking bottle','Eyes of minute seeing','Goggles of night','Helm of comprehending languages','Immovable rod','Lantern of revealing',"Mariner's armor",'Mithral armor','Potion of poison','Ring of swimming','Robe of useful items','Rope of climbing','Saddle of the cavalier','Wand of magic detection','Wand of secrets'],
  C: ['Potion of superior healing','Spell scroll (4th level)','Ammunition +2','Potion of maximum healing','Potion of heroism','Potion of invulnerability','Potion of mind reading','Oil of etherealness',"Quaal's feather token",'Scroll of protection','Bag of beans','Chime of opening','Necklace of fireballs','Periapt of health','Sending stones','Adamantine armor','Amulet of proof against detection and location','Boots of elvenkind','Boots of striding and springing','Bracers of archery','Brooch of shielding','Broom of flying','Circlet of blasting','Cloak of elvenkind','Cloak of protection','Deck of illusions','Eversmoking bottle','Eyes of charming','Eyes of the eagle','Figurine of wondrous power (silver raven)','Gauntlets of ogre power','Gem of brightness','Gloves of missile snaring','Gloves of swimming and climbing','Gloves of thievery','Hat of disguise','Headband of intellect','Helm of telepathy','Horseshoes of speed','Horseshoes of a zephyr','Instant fortress','Ioun stone (awareness)','Ioun stone (protection)','Ioun stone (reserve)','Javelin of lightning','Medallion of thoughts','Pearl of power','Periapt of wound closure','Pipes of haunting','Pipes of the sewers','Ring of jumping','Ring of mind shielding','Ring of warmth','Ring of water walking','Robe of eyes','Rod of the pact keeper','Scarab of protection','Shield +1','Staff of the adder','Staff of the python','Stone of good luck','Sword of vengeance','Trident of fish command','Wand of the war mage +1','Wand of web','Weapon +1'],
  D: ['Potion of supreme healing','Potion of invisibility','Potion of speed','Potion of flying','Spell scroll (5th level)','Ammunition +3','Oil of sharpness',"Quaal's feather token",'Scroll of protection','Bag of devouring','Bead of force','Chime of opening','Necklace of prayer beads','Periapt of proof against poison','Portable hole','Rope of entanglement','Adamantine armor','Amulet of health','Armor of resistance','Armor of vulnerability','Arrow-catching shield','Belt of dwarvenkind','Belt of hill giant strength','Boots of levitation','Boots of speed','Bowl of commanding water elementals','Bracers of defense','Brazier of commanding fire elementals','Cape of the mountebank','Censer of controlling air elementals','Crystal ball','Cube of force','Dagger of venom','Dimensional shackles','Dragon slayer','Elven chain','Flame tongue','Gem of seeing','Giant slayer','Glamoured studded leather','Helm of teleportation','Horn of blasting','Horn of Valhalla','Horseshoes of a zephyr','Instant fortress','Ioun stone (absorption)','Ioun stone (agility)','Ioun stone (fortitude)','Ioun stone (insight)','Ioun stone (intellect)','Ioun stone (leadership)','Ioun stone (strength)','Iron bands of Bilarro','Mace of disruption','Mace of smiting','Mace of terror','Mantle of spell resistance','Necklace of fireballs','Periapt of proof against poison','Ring of animal influence','Ring of evasion','Ring of feather falling','Ring of free action','Ring of protection','Ring of resistance','Ring of spell storing','Ring of the ram','Ring of X-ray vision','Robe of scintillating colors','Robe of stars','Rod of absorption','Rod of alertness','Rod of security','Rod of the pact keeper +2','Shield +2','Shield of missile attraction','Staff of charming','Staff of healing','Staff of swarming insects','Staff of the woodlands','Staff of withering','Stone of controlling earth elementals','Sun blade','Sword of life stealing','Sword of wounding','Sword of sharpnes','Tentacle rod','Vicious weapon','Wand of binding','Wand of enemy detection','Wand of fear','Wand of fireballs','Wand of lightning bolts','Wand of paralysis','Wand of the war mage +2','Wand of wonder','Weapon +2','Wings of flying'],
  E: ['Spell scroll (6th level)','Spell scroll (7th level)','Ammunition +3','Oil of sharpness','Potion of giant strength (frost giant)','Potion of invulnerability','Crystal ball','Deck of illusions','Horn of Valhalla','Manual of bodily health','Manual of gainful exercise','Manual of golems','Manual of quickness of action','Mirror of life trapping','Ring of djinni summoning','Ring of elemental command','Ring of invisibility','Ring of spell turning','Rod of lordly might','Rod of the pact keeper +3','Scarab of protection','Staff of the magi','Sword of answering','Tome of clear thought','Tome of leadership and influence','Tome of understanding','Wand of the war mage +3','Weapon +3'],
  F: ['Potion of giant strength (stone giant)','Potion of heroism (superior)','Potion of supreme healing','Spell scroll (8th level)','Spell scroll (9th level)','Apparatus of Kwalish','Armor of invulnerability','Belt of cloud giant strength','Belt of storm giant strength','Cloak of arachnida','Crystal ball of true seeing','Cube of force','Deck of many things','Defender','Hammer of thunderbolts','Holy avenger','Horn of Valhalla (iron)','Instrument of the bards (Anstruth harp)','Ioun stone (greater absorption)','Ioun stone (mastery)','Ioun stone (regeneration)','Iron flask','Luck blade','Plate armor of etherealness','Ring of air elemental command','Ring of earth elemental command','Ring of fire elemental command','Ring of water elemental command','Ring of three wishes','Robe of the archmagi','Scarab of protection','Sovereign glue','Sphere of annihilation','Staff of the magi','Sword of sharpness','Talisman of the sphere','Tome of the stilled tongue','Trident of fish command','Universal solvent','Well of many worlds'],
  G: ['Candle of invocation','Plate armor of resistance','Ring of invisibility','Ring of regeneration','Ring of telekinesis','Robe of scintillating colors','Robe of stars','Rod of absorption','Rod of alertness','Rod of security','Scarab of protection','Staff of the magi','Sword of answering','Tome of clear thought','Tome of leadership and influence','Tome of understanding','Wand of the war mage +3','Weapon +3'],
  H: ['Armor of resistance (plate)','Armor of invulnerability','Belt of storm giant strength','Cloak of arachnida','Crystal ball of true seeing','Defender','Hammer of thunderbolts','Holy avenger','Instrument of the bards (Ollamh harp)','Ioun stone (greater absorption)','Ioun stone (mastery)','Ioun stone (regeneration)','Iron flask','Luck blade','Plate armor of etherealness','Ring of djinni summoning','Ring of elemental command','Ring of invisibility','Ring of spell turning','Ring of three wishes','Robe of the archmagi','Scarab of protection','Sovereign glue','Sphere of annihilation','Staff of the magi','Sword of answering','Talisman of the sphere','Tome of the stilled tongue','Universal solvent','Well of many worlds'],
  I: ['Defender','Hammer of thunderbolts','Holy avenger','Instrument of the bards (Ollamh harp)','Ioun stone (greater absorption)','Ioun stone (mastery)','Ioun stone (regeneration)','Iron flask','Luck blade','Plate armor of etherealness','Ring of djinni summoning','Ring of elemental command','Ring of invisibility','Ring of spell turning','Ring of three wishes','Robe of the archmagi','Scarab of protection','Sovereign glue','Sphere of annihilation','Staff of the magi','Sword of answering','Talisman of the sphere','Tome of the stilled tongue','Universal solvent','Well of many worlds']
};

// Loot treasure tables by CR tier
export const LOOT_TREASURE = {
  individual: {
    '0-4': [
      { range:[1,30],   coins:'5d6 cp' },
      { range:[31,60],  coins:'4d6 sp' },
      { range:[61,70],  coins:'3d6 ep' },
      { range:[71,95],  coins:'3d6 gp' },
      { range:[96,100], coins:'1d6 pp' }
    ],
    '5-10': [
      { range:[1,30],   coins:'4d6x100 cp, 1d6x10 ep' },
      { range:[31,60],  coins:'6d6x10 sp, 2d6x10 gp' },
      { range:[61,70],  coins:'3d6x10 ep, 2d6x10 gp' },
      { range:[71,95],  coins:'4d6x10 gp' },
      { range:[96,100], coins:'2d6x10 gp, 3d6 pp' }
    ],
    '11-16': [
      { range:[1,20],   coins:'4d6x100 sp, 1d6x100 gp' },
      { range:[21,35],  coins:'1d6x100 ep, 1d6x100 gp' },
      { range:[36,75],  coins:'2d6x100 gp, 1d6x10 pp' },
      { range:[76,100], coins:'2d6x100 gp, 2d6x10 pp' }
    ],
    '17+': [
      { range:[1,15],   coins:'2d6x1000 ep, 8d6x100 gp' },
      { range:[16,55],  coins:'1d6x1000 gp, 1d6x100 pp' },
      { range:[56,100], coins:'1d6x1000 gp, 2d6x100 pp' }
    ]
  },
  hoard: {
    '0-4': {
      coins: '6d6x100 cp, 3d6x100 sp, 2d6x10 gp',
      goods: [
        { range:[1,5],    type:'none' },
        { range:[6,16],   type:'gems', count:'1d6', value:10 },
        { range:[17,26],  type:'art', count:'1d4', value:25 },
        { range:[27,36],  type:'gems', count:'1d6', value:50 },
        { range:[37,44],  type:'art', count:'1d4', value:75 },
        { range:[45,52],  type:'gems', count:'1d6', value:100 },
        { range:[53,60],  type:'art', count:'1d4', value:250 },
        { range:[61,65],  type:'gems', count:'1d6', value:500 },
        { range:[66,70],  type:'art', count:'1d4', value:750 },
        { range:[71,75],  type:'gems', count:'1d6', value:1000 },
        { range:[76,80],  type:'art', count:'1d4', value:1500 },
        { range:[81,85],  type:'gems', count:'1d6', value:2000 },
        { range:[86,90],  type:'art', count:'1d4', value:2500 },
        { range:[91,95],  type:'gems', count:'1d6', value:5000 },
        { range:[96,100], type:'art', count:'1d4', value:7500 }
      ],
      magic: [
        { range:[1,5],    table:'none' },
        { range:[6,22],   table:'A', count:'1d4' },
        { range:[23,35],  table:'A', count:'1d6' },
        { range:[36,45],  table:'B', count:'1d4' },
        { range:[46,55],  table:'B', count:'1d6' },
        { range:[56,65],  table:'C', count:'1d4' },
        { range:[66,75],  table:'C', count:'1d6' },
        { range:[76,80],  table:'D', count:'1d4' },
        { range:[81,88],  table:'F', count:'1d4' },
        { range:[89,92],  table:'G', count:'1d4' },
        { range:[93,95],  table:'H', count:'1d4' },
        { range:[96,98],  table:'H', count:'1d6' },
        { range:[99,100], table:'I', count:'1d4' }
      ]
    },
    '5-10': {
      coins: '2d6x100 cp, 2d6x1000 sp, 6d6x100 gp, 3d6x10 pp',
      goods: [
        { range:[1,4],    type:'none' },
        { range:[5,10],   type:'gems', count:'2d4', value:25 },
        { range:[11,16],  type:'art', count:'3d6', value:250 },
        { range:[17,22],  type:'gems', count:'3d6', value:50 },
        { range:[23,28],  type:'art', count:'2d4', value:750 },
        { range:[29,32],  type:'gems', count:'3d6', value:100 },
        { range:[33,36],  type:'art', count:'2d4', value:1500 },
        { range:[37,40],  type:'gems', count:'3d6', value:250 },
        { range:[41,44],  type:'art', count:'2d4', value:2500 },
        { range:[45,49],  type:'gems', count:'3d6', value:500 },
        { range:[50,54],  type:'art', count:'2d4', value:3500 },
        { range:[55,59],  type:'gems', count:'3d6', value:1000 },
        { range:[60,63],  type:'art', count:'2d4', value:4500 },
        { range:[64,66],  type:'gems', count:'3d6', value:2500 },
        { range:[67,69],  type:'art', count:'2d4', value:5500 },
        { range:[70,72],  type:'gems', count:'3d6', value:5000 },
        { range:[73,74],  type:'art', count:'2d4', value:6500 },
        { range:[75,76],  type:'gems', count:'3d6', value:7500 },
        { range:[77,78],  type:'art', count:'2d4', value:7500 },
        { range:[79,80],  type:'gems', count:'3d6', value:10000 },
        { range:[81,100], type:'art', count:'2d4', value:'roll' }
      ],
      magic: [
        { range:[1,4],    table:'none' },
        { range:[5,22],   table:'A', count:'1d6' },
        { range:[23,38],  table:'B', count:'1d4' },
        { range:[39,52],  table:'C', count:'1d4' },
        { range:[53,64],  table:'D', count:'1d4' },
        { range:[65,74],  table:'F', count:'1d4' },
        { range:[75,82],  table:'G', count:'1d4' },
        { range:[83,88],  table:'H', count:'1d4' },
        { range:[89,92],  table:'H', count:'1d6' },
        { range:[93,96],  table:'I', count:'1d4' },
        { range:[97,98],  table:'I', count:'1d6' },
        { range:[99,100], table:'I', count:'1d8' }
      ]
    },
    '11-16': {
      coins: '4d6x1000 gp, 5d6x100 pp',
      goods: [
        { range:[1,3],    type:'none' },
        { range:[4,6],    type:'gems', count:'2d4', value:250 },
        { range:[7,9],    type:'art', count:'2d4', value:750 },
        { range:[10,12],  type:'gems', count:'2d4', value:1000 },
        { range:[13,15],  type:'art', count:'2d4', value:1500 },
        { range:[16,18],  type:'gems', count:'2d4', value:2500 },
        { range:[19,20],  type:'art', count:'2d4', value:2500 },
        { range:[21,23],  type:'gems', count:'2d4', value:5000 },
        { range:[24,26],  type:'art', count:'2d4', value:3500 },
        { range:[27,29],  type:'gems', count:'2d4', value:7500 },
        { range:[30,32],  type:'art', count:'2d4', value:4500 },
        { range:[33,35],  type:'gems', count:'2d4', value:10000 },
        { range:[36,38],  type:'art', count:'2d4', value:5500 },
        { range:[39,41],  type:'gems', count:'2d4', value:15000 },
        { range:[42,100], type:'art', count:'2d4', value:6500 }
      ],
      magic: [
        { range:[1,3],    table:'none' },
        { range:[4,6],    table:'C', count:'1d6' },
        { range:[7,9],    table:'D', count:'1d4' },
        { range:[10,12],  table:'E', count:'1d4' },
        { range:[13,15],  table:'F', count:'1d4' },
        { range:[16,20],  table:'G', count:'1d4' },
        { range:[21,24],  table:'H', count:'1d4' },
        { range:[25,28],  table:'H', count:'1d6' },
        { range:[29,32],  table:'I', count:'1d4' },
        { range:[33,36],  table:'I', count:'1d6' },
        { range:[37,100], table:'I', count:'1d8' }
      ]
    },
    '17+': {
      coins: '12d6x1000 gp, 8d6x1000 pp',
      goods: [
        { range:[1,2],    type:'none' },
        { range:[3,5],    type:'gems', count:'3d6', value:1000 },
        { range:[6,8],    type:'art', count:'1d10', value:2500 },
        { range:[9,11],   type:'gems', count:'3d6', value:5000 },
        { range:[12,14],  type:'art', count:'1d10', value:7500 },
        { range:[15,17],  type:'gems', count:'3d6', value:10000 },
        { range:[18,20],  type:'art', count:'1d10', value:10000 },
        { range:[21,23],  type:'gems', count:'3d6', value:25000 },
        { range:[24,26],  type:'art', count:'1d10', value:15000 },
        { range:[27,29],  type:'gems', count:'3d6', value:50000 },
        { range:[30,100], type:'art', count:'1d10', value:25000 }
      ],
      magic: [
        { range:[1,2],    table:'none' },
        { range:[3,5],    table:'C', count:'1d8' },
        { range:[6,8],    table:'D', count:'1d6' },
        { range:[9,11],   table:'E', count:'1d6' },
        { range:[12,14],  table:'G', count:'1d6' },
        { range:[15,22],  table:'H', count:'1d6' },
        { range:[23,30],  table:'I', count:'1d6' },
        { range:[31,100], table:'I', count:'1d8' }
      ]
    }
  }
};
