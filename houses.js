/*
  Ազատ է — դեմոյի տվյալներ
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
    chatId: '',
    name: { hy: 'Ծիրանի տուն', ru: 'Абрикосовый дом', en: 'Apricot House' },
    owner: { hy: 'Արամ', ru: 'Арам', en: 'Aram' },
    phone: '+374 91 000 001',
    price: 40000,
    capacity: 8,
    allowMen: true,
    place: { hy: 'Տաճարից 700 մ', ru: '700 м от храма', en: '700 m from the temple' },
    features: ['yard', 'bbq', 'parking', 'wifi'],
    note: 'ready',
    photos: ['images/tsiran-1.jpg']
  },
  {
    id: 'dzor',
    chatId: '',
    name: { hy: 'Ձորի պատշգամբ', ru: 'Терраса над ущельем', en: 'Gorge Terrace' },
    owner: { hy: 'Դավիթ', ru: 'Давид', en: 'Davit' },
    phone: '+374 93 000 002',
    price: 70000,
    capacity: 14,
    allowMen: true,
    place: { hy: 'Ձորի տեսարանով', ru: 'С видом на ущелье', en: 'Overlooking the gorge' },
    features: ['terrace', 'sauna', 'bbq', 'breakfast', 'parking'],
    note: 'view',
    photos: ['images/dzor-2.jpg', 'images/dzor-1.jpg']
  }
];
