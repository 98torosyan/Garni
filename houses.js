/*
  Ազատ է — տների տվյալներ
  -------------------------------------------------
  chatId — տնատիրոջ Telegram ID-ն (թվեր)։ Կարող ես գրել այստեղ,
  կամ թողնել դատարկ և կցել կարգավորումների էջից (կայքի հասցե + #setup)։
  Բոտի token-ը ԵՐԲԵՔ այստեղ մի գրիր․ այն մուտքագրվում է միայն #setup էջում։
*/

window.GARNI_CONFIG = {
  requestMinutes: 30
};

window.GARNI_HOUSES = [
  {
    id: 'tsiran',
    chatId: '1308614030',
    name: { hy: 'Ծիրանի տուն', ru: 'Абрикосовый дом', en: 'Apricot House' },
    owner: { hy: 'Մանուկ', ru: 'Манук', en: 'Manuk' },
    phone: '+374 99 067 506',
    price: 40000,
    capacity: 8,
    allowMen: true,
    place: { hy: 'Տաճարից 700 մ', ru: '700 м от храма', en: '700 m from the temple' },
    features: ['yard', 'bbq', 'parking', 'wifi'],
    note: 'ready',
    photos: ['tsiran-1.jpg']
  },
  {
    id: 'dzor',
    chatId: '6803966973',
    name: { hy: 'Ձորի պատշգամբ', ru: 'Терраса над ущельем', en: 'Gorge Terrace' },
    owner: { hy: 'Կարեն', ru: 'Карен', en: 'Karen' },
    phone: '+374 77 487 757',
    price: 70000,
    capacity: 14,
    allowMen: true,
    place: { hy: 'Ձորի տեսարանով', ru: 'С видом на ущелье', en: 'Overlooking the gorge' },
    features: ['terrace', 'sauna', 'bbq', 'breakfast', 'parking'],
    note: 'view',
    photos: ['dzor-2.jpg', 'dzor-1.jpg']
  }
];
