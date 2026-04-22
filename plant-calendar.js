// 📅 Base de référence : quand semer / planter / récolter / tailler / bouturer…
// Climat tempéré (France métropolitaine).
// Mois : 1 = janvier … 12 = décembre.
// Actions :
//  - sow_indoor  : semis à l'intérieur (chaud / sous abri)
//  - sow_outdoor : semis en pleine terre
//  - plant       : mise en terre du plant / bulbe / griffe
//  - harvest     : récolte
//  - prune       : taille / pincement
//  - cuttings    : bouturage
//  - divide      : division de touffe / repiquage
//  - treat       : traitement (purin, soufre, bouillie bordelaise, paillage…)
window.PLANT_CALENDAR = [
  // ═══════════════════ LÉGUMES ═══════════════════
  { name: 'Tomate',       type: 'legume',  sow_indoor: [2,3,4], sow_outdoor: [],            plant: [5,6],         harvest: [7,8,9,10],         prune: [6,7,8],   cuttings: [],         divide: [],        treat: [6,7,8] },
  { name: 'Courgette',    type: 'legume',  sow_indoor: [4],     sow_outdoor: [5,6],         plant: [5,6],         harvest: [7,8,9,10],         prune: [],        cuttings: [],         divide: [],        treat: [7,8] },
  { name: 'Concombre',    type: 'legume',  sow_indoor: [3,4],   sow_outdoor: [5],           plant: [5,6],         harvest: [7,8,9],            prune: [6,7],     cuttings: [],         divide: [],        treat: [7,8] },
  { name: 'Poivron',      type: 'legume',  sow_indoor: [2,3],   sow_outdoor: [],            plant: [5,6],         harvest: [7,8,9,10],         prune: [6,7],     cuttings: [],         divide: [],        treat: [] },
  { name: 'Aubergine',    type: 'legume',  sow_indoor: [2,3],   sow_outdoor: [],            plant: [5,6],         harvest: [7,8,9],            prune: [6,7],     cuttings: [],         divide: [],        treat: [] },
  { name: 'Salade (laitue)', type: 'legume', sow_indoor: [2,3], sow_outdoor: [3,4,5,6,7,8,9], plant: [3,4,5,9],  harvest: [5,6,7,8,9,10],     prune: [],        cuttings: [],         divide: [],        treat: [] },
  { name: 'Radis',        type: 'legume',  sow_indoor: [],      sow_outdoor: [3,4,5,6,7,8,9], plant: [],          harvest: [4,5,6,7,8,9,10],   prune: [],        cuttings: [],         divide: [],        treat: [] },
  { name: 'Carotte',      type: 'legume',  sow_indoor: [],      sow_outdoor: [3,4,5,6,7],   plant: [],            harvest: [6,7,8,9,10,11],    prune: [],        cuttings: [],         divide: [],        treat: [] },
  { name: 'Haricot vert', type: 'legume',  sow_indoor: [],      sow_outdoor: [5,6,7],       plant: [],            harvest: [7,8,9,10],         prune: [],        cuttings: [],         divide: [],        treat: [] },
  { name: 'Pois',         type: 'legume',  sow_indoor: [],      sow_outdoor: [2,3,4,10,11], plant: [],            harvest: [5,6,7],            prune: [],        cuttings: [],         divide: [],        treat: [] },
  { name: 'Épinard',      type: 'legume',  sow_indoor: [],      sow_outdoor: [3,4,8,9],     plant: [],            harvest: [5,6,10,11],        prune: [],        cuttings: [],         divide: [],        treat: [] },
  { name: 'Pomme de terre', type: 'legume', sow_indoor: [],     sow_outdoor: [],            plant: [3,4,5],       harvest: [6,7,8,9],          prune: [5,6],     cuttings: [],         divide: [],        treat: [6,7] },
  { name: 'Oignon',       type: 'legume',  sow_indoor: [],      sow_outdoor: [2,3,9,10],    plant: [3,4,9,10],    harvest: [7,8],              prune: [],        cuttings: [],         divide: [],        treat: [] },
  { name: 'Ail',          type: 'legume',  sow_indoor: [],      sow_outdoor: [],            plant: [10,11,2,3],   harvest: [6,7],              prune: [],        cuttings: [],         divide: [],        treat: [] },
  { name: 'Betterave',    type: 'legume',  sow_indoor: [],      sow_outdoor: [4,5,6],       plant: [],            harvest: [7,8,9,10],         prune: [],        cuttings: [],         divide: [],        treat: [] },
  { name: 'Courge / potiron', type: 'legume', sow_indoor: [4],  sow_outdoor: [5],           plant: [5,6],         harvest: [9,10],             prune: [7],       cuttings: [],         divide: [],        treat: [] },
  { name: 'Poireau',      type: 'legume',  sow_indoor: [2,3],   sow_outdoor: [3,4,5],       plant: [5,6,7],       harvest: [10,11,12,1,2,3],   prune: [],        cuttings: [],         divide: [],        treat: [] },
  { name: 'Chou',         type: 'legume',  sow_indoor: [2,3],   sow_outdoor: [4,5,6],       plant: [5,6,7,8],     harvest: [9,10,11,12],       prune: [],        cuttings: [],         divide: [],        treat: [5,6,7] },

  // ═══════════════════ FRUITS ═══════════════════
  { name: 'Fraise',       type: 'fruit',   sow_indoor: [],      sow_outdoor: [],            plant: [3,4,9,10],    harvest: [5,6,7],            prune: [10],      cuttings: [],         divide: [9,10],    treat: [3,4] },
  { name: 'Framboisier',  type: 'fruit',   sow_indoor: [],      sow_outdoor: [],            plant: [10,11,2,3],   harvest: [6,7,8,9],          prune: [2,11,12], cuttings: [10,11],    divide: [10,11,2,3], treat: [3] },
  { name: 'Melon',        type: 'fruit',   sow_indoor: [3,4],   sow_outdoor: [5],           plant: [5,6],         harvest: [7,8,9],            prune: [6,7],     cuttings: [],         divide: [],        treat: [] },
  { name: 'Pommier',      type: 'fruit',   sow_indoor: [],      sow_outdoor: [],            plant: [11,12,1,2,3], harvest: [8,9,10,11],        prune: [12,1,2],  cuttings: [],         divide: [],        treat: [11,2,3] },
  { name: 'Poirier',      type: 'fruit',   sow_indoor: [],      sow_outdoor: [],            plant: [11,12,1,2,3], harvest: [8,9,10],           prune: [12,1,2],  cuttings: [],         divide: [],        treat: [11,2,3] },
  { name: 'Cerisier',     type: 'arbre',   sow_indoor: [],      sow_outdoor: [],            plant: [11,12,2,3],   harvest: [6,7],              prune: [8,9],     cuttings: [],         divide: [],        treat: [3] },
  { name: 'Vigne',        type: 'fruit',   sow_indoor: [],      sow_outdoor: [],            plant: [11,12,1,2,3], harvest: [9,10],             prune: [12,1,2],  cuttings: [12,1,2],   divide: [],        treat: [4,5,6,7] },

  // ═══════════════════ AROMATES ═══════════════════
  { name: 'Basilic',      type: 'aromate', sow_indoor: [3,4],   sow_outdoor: [5],           plant: [5,6],         harvest: [6,7,8,9,10],       prune: [6,7,8],   cuttings: [5,6,7],    divide: [],        treat: [] },
  { name: 'Persil',       type: 'aromate', sow_indoor: [2,3],   sow_outdoor: [3,4,5,6,7,8], plant: [3,4,5],       harvest: [5,6,7,8,9,10,11],  prune: [],        cuttings: [],         divide: [],        treat: [] },
  { name: 'Ciboulette',   type: 'aromate', sow_indoor: [2,3],   sow_outdoor: [3,4,5],       plant: [3,4,5,9,10],  harvest: [4,5,6,7,8,9,10],   prune: [6,7],     cuttings: [],         divide: [3,4,9,10],treat: [] },
  { name: 'Coriandre',    type: 'aromate', sow_indoor: [],      sow_outdoor: [3,4,5,6,7,8], plant: [],            harvest: [5,6,7,8,9,10],     prune: [],        cuttings: [],         divide: [],        treat: [] },
  { name: 'Menthe',       type: 'aromate', sow_indoor: [],      sow_outdoor: [],            plant: [3,4,5,9,10],  harvest: [5,6,7,8,9,10],     prune: [6,7,10],  cuttings: [4,5,6,9],  divide: [3,4,9,10],treat: [] },
  { name: 'Thym',         type: 'aromate', sow_indoor: [3,4],   sow_outdoor: [4,5],         plant: [3,4,5,9,10],  harvest: [5,6,7,8,9],        prune: [3,4,9],   cuttings: [5,6,9],    divide: [3,4,9],   treat: [] },
  { name: 'Romarin',      type: 'aromate', sow_indoor: [3,4],   sow_outdoor: [],            plant: [3,4,5,9,10],  harvest: [1,2,3,4,5,6,7,8,9,10,11,12], prune: [4,5,9], cuttings: [5,6,9], divide: [],     treat: [] },

  // ═══════════════════ FLEURS ═══════════════════
  { name: 'Tournesol',    type: 'fleur',   sow_indoor: [3,4],   sow_outdoor: [4,5,6],       plant: [5,6],         harvest: [],                 prune: [],        cuttings: [],         divide: [],        treat: [] },
  { name: 'Cosmos',       type: 'fleur',   sow_indoor: [3,4],   sow_outdoor: [4,5],         plant: [5,6],         harvest: [],                 prune: [7,8],     cuttings: [],         divide: [],        treat: [] },
  { name: 'Capucine',     type: 'fleur',   sow_indoor: [],      sow_outdoor: [4,5,6],       plant: [5,6],         harvest: [],                 prune: [],        cuttings: [],         divide: [],        treat: [] },
  { name: 'Zinnia',       type: 'fleur',   sow_indoor: [3,4],   sow_outdoor: [5],           plant: [5,6],         harvest: [],                 prune: [7,8],     cuttings: [],         divide: [],        treat: [] },
  { name: 'Tulipe',       type: 'fleur',   sow_indoor: [],      sow_outdoor: [],            plant: [10,11],       harvest: [],                 prune: [5,6],     cuttings: [],         divide: [6,7],     treat: [] },
  { name: 'Rosier',       type: 'fleur',   sow_indoor: [],      sow_outdoor: [],            plant: [10,11,12,2,3],harvest: [],                 prune: [2,3,8],   cuttings: [8,9,10],   divide: [],        treat: [3,4,5,6] },
  { name: 'Hortensia',    type: 'fleur',   sow_indoor: [],      sow_outdoor: [],            plant: [10,11,3,4],   harvest: [],                 prune: [2,3],     cuttings: [7,8,9],    divide: [10,11,3], treat: [] },
  { name: 'Lavande',      type: 'aromate', sow_indoor: [3,4],   sow_outdoor: [],            plant: [3,4,9,10],    harvest: [6,7,8],            prune: [3,8,9],   cuttings: [8,9,10],   divide: [],        treat: [] },
  { name: 'Géranium',     type: 'fleur',   sow_indoor: [1,2,3], sow_outdoor: [],            plant: [4,5],         harvest: [],                 prune: [10,11],   cuttings: [8,9],      divide: [3,4],     treat: [] },
  { name: 'Pivoine',      type: 'fleur',   sow_indoor: [],      sow_outdoor: [],            plant: [9,10,11],     harvest: [],                 prune: [11],      cuttings: [],         divide: [9,10],    treat: [] }
];
