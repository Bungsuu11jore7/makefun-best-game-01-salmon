// Salmon Song — the three rivers. Each river is one leg of the run
// home: its name, its current, what hunts in it, and its sky.
export const RIVERS = [
  {
    index: 0,
    name: 'Gentle Creek',
    tagline: 'Slow water, warm sun — learn the river.',
    current: 30,
    swimSpeed: 120,
    rockGap: 3.2,
    rockSpeed: 150,
    heronEvery: 999,
    fallsAt: [],
    bearEvery: 999,
    flyEvery: 1.4,
    eddyEvery: 6.0,
    skyTop: '#ffd98a',
    skyMid: '#ffb36b',
    skyLow: '#7ec8c0',
    water: '#1d7a72',
    waterDeep: '#0d4a4d',
    pine: '#173f35',
  },
  {
    index: 1,
    name: 'The Rapids',
    tagline: 'Fast water, sharp rocks — and herons overhead.',
    current: 55,
    swimSpeed: 130,
    rockGap: 1.7,
    rockSpeed: 210,
    heronEvery: 7.5,
    fallsAt: [],
    bearEvery: 999,
    flyEvery: 1.1,
    eddyEvery: 7.5,
    skyTop: '#8fd8e8',
    skyMid: '#4fb3c9',
    skyLow: '#2a8a9e',
    water: '#14707f',
    waterDeep: '#0a3d4d',
    pine: '#123a33',
  },
  {
    index: 2,
    name: 'The Falls',
    tagline: 'Leap the falls. The bears are waiting.',
    current: 70,
    swimSpeed: 140,
    rockGap: 1.35,
    rockSpeed: 250,
    heronEvery: 5.5,
    fallsAt: [300, 650],
    bearEvery: 6.5,
    flyEvery: 0.9,
    eddyEvery: 9.0,
    skyTop: '#c9a6ff',
    skyMid: '#7d5fc9',
    skyLow: '#3d2f6e',
    water: '#1a5f7a',
    waterDeep: '#0b3348',
    pine: '#1c2a44',
  },
];

export function riverForDistance(distance) {
  if (distance >= 2000) return RIVERS[2];
  if (distance >= 1000) return RIVERS[1];
  return RIVERS[0];
}

export function riverStartDistance(riverIndex) {
  return riverIndex * 1000;
}
