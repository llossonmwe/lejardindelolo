// 📅 Base de référence : quand semer / planter / récolter
// Climat tempéré (France métropolitaine).
// Mois : 1 = janvier … 12 = décembre.
// - sow_indoor : semis à l'intérieur (chaud / sous abri)
// - sow_outdoor : semis en pleine terre
// - plant : mise en terre du plant
// - harvest : récolte
window.PLANT_CALENDAR = [
  // ─── Légumes ───
  { name: 'Tomate',       type: 'legume',  sow_indoor: [2,3,4],     sow_outdoor: [],           plant: [5,6],           harvest: [7,8,9,10] },
  { name: 'Courgette',    type: 'legume',  sow_indoor: [4],         sow_outdoor: [5,6],        plant: [5,6],           harvest: [7,8,9,10] },
  { name: 'Concombre',    type: 'legume',  sow_indoor: [3,4],       sow_outdoor: [5],          plant: [5,6],           harvest: [7,8,9] },
  { name: 'Poivron',      type: 'legume',  sow_indoor: [2,3],       sow_outdoor: [],           plant: [5,6],           harvest: [7,8,9,10] },
  { name: 'Aubergine',    type: 'legume',  sow_indoor: [2,3],       sow_outdoor: [],           plant: [5,6],           harvest: [7,8,9] },
  { name: 'Salade (laitue)', type: 'legume', sow_indoor: [2,3],     sow_outdoor: [3,4,5,6,7,8,9], plant: [3,4,5,9],    harvest: [5,6,7,8,9,10] },
  { name: 'Radis',        type: 'legume',  sow_indoor: [],          sow_outdoor: [3,4,5,6,7,8,9], plant: [],         harvest: [4,5,6,7,8,9,10] },
  { name: 'Carotte',      type: 'legume',  sow_indoor: [],          sow_outdoor: [3,4,5,6,7],  plant: [],              harvest: [6,7,8,9,10,11] },
  { name: 'Haricot vert', type: 'legume',  sow_indoor: [],          sow_outdoor: [5,6,7],      plant: [],              harvest: [7,8,9,10] },
  { name: 'Pois',         type: 'legume',  sow_indoor: [],          sow_outdoor: [2,3,4,10,11],plant: [],              harvest: [5,6,7] },
  { name: 'Épinard',      type: 'legume',  sow_indoor: [],          sow_outdoor: [3,4,8,9],    plant: [],              harvest: [5,6,10,11] },
  { name: 'Pomme de terre', type: 'legume',sow_indoor: [],          sow_outdoor: [],           plant: [3,4,5],         harvest: [6,7,8,9] },
  { name: 'Oignon',       type: 'legume',  sow_indoor: [],          sow_outdoor: [2,3,9,10],   plant: [3,4,9,10],      harvest: [7,8] },
  { name: 'Ail',          type: 'legume',  sow_indoor: [],          sow_outdoor: [],           plant: [10,11,2,3],     harvest: [6,7] },
  { name: 'Betterave',    type: 'legume',  sow_indoor: [],          sow_outdoor: [4,5,6],      plant: [],              harvest: [7,8,9,10] },
  { name: 'Courge / potiron', type: 'legume', sow_indoor: [4],      sow_outdoor: [5],          plant: [5,6],           harvest: [9,10] },
  { name: 'Poireau',      type: 'legume',  sow_indoor: [2,3],       sow_outdoor: [3,4,5],      plant: [5,6,7],         harvest: [10,11,12,1,2,3] },
  { name: 'Chou',         type: 'legume',  sow_indoor: [2,3],       sow_outdoor: [4,5,6],      plant: [5,6,7,8],       harvest: [9,10,11,12] },

  // ─── Fruits ───
  { name: 'Fraise',       type: 'fruit',   sow_indoor: [],          sow_outdoor: [],           plant: [3,4,9,10],      harvest: [5,6,7] },
  { name: 'Framboisier',  type: 'fruit',   sow_indoor: [],          sow_outdoor: [],           plant: [10,11,2,3],     harvest: [6,7,8,9] },
  { name: 'Melon',        type: 'fruit',   sow_indoor: [3,4],       sow_outdoor: [5],          plant: [5,6],           harvest: [7,8,9] },

  // ─── Aromates ───
  { name: 'Basilic',      type: 'aromate', sow_indoor: [3,4],       sow_outdoor: [5],          plant: [5,6],           harvest: [6,7,8,9,10] },
  { name: 'Persil',       type: 'aromate', sow_indoor: [2,3],       sow_outdoor: [3,4,5,6,7,8],plant: [3,4,5],         harvest: [5,6,7,8,9,10,11] },
  { name: 'Ciboulette',   type: 'aromate', sow_indoor: [2,3],       sow_outdoor: [3,4,5],      plant: [3,4,5,9,10],    harvest: [4,5,6,7,8,9,10] },
  { name: 'Coriandre',    type: 'aromate', sow_indoor: [],          sow_outdoor: [3,4,5,6,7,8],plant: [],              harvest: [5,6,7,8,9,10] },
  { name: 'Menthe',       type: 'aromate', sow_indoor: [],          sow_outdoor: [],           plant: [3,4,5,9,10],    harvest: [5,6,7,8,9,10] },
  { name: 'Thym',         type: 'aromate', sow_indoor: [3,4],       sow_outdoor: [4,5],        plant: [3,4,5,9,10],    harvest: [5,6,7,8,9] },
  { name: 'Romarin',      type: 'aromate', sow_indoor: [3,4],       sow_outdoor: [],           plant: [3,4,5,9,10],    harvest: [1,2,3,4,5,6,7,8,9,10,11,12] },

  // ─── Fleurs ───
  { name: 'Tournesol',    type: 'fleur',   sow_indoor: [3,4],       sow_outdoor: [4,5,6],      plant: [5,6],           harvest: [] },
  { name: 'Cosmos',       type: 'fleur',   sow_indoor: [3,4],       sow_outdoor: [4,5],        plant: [5,6],           harvest: [] },
  { name: 'Capucine',     type: 'fleur',   sow_indoor: [],          sow_outdoor: [4,5,6],      plant: [5,6],           harvest: [] },
  { name: 'Zinnia',       type: 'fleur',   sow_indoor: [3,4],       sow_outdoor: [5],          plant: [5,6],           harvest: [] },
  { name: 'Tulipe',       type: 'fleur',   sow_indoor: [],          sow_outdoor: [],           plant: [10,11],         harvest: [] },
  { name: 'Rosier',       type: 'fleur',   sow_indoor: [],          sow_outdoor: [],           plant: [10,11,12,2,3],  harvest: [] }
];
