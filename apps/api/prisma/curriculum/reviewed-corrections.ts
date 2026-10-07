// Reviewed 2026-10-07. Exact original fingerprints protect administrator edits.
import type { ContentCorrection } from './corrections';
export const reviewedCorrections: ContentCorrection[] = [
  {
    kind: 'lesson',
    id: '82cd30ab-514c-4050-ae74-caee6af1520e',
    position: 5,
    before: {
      title: 'Perimetr va yuzani farqlash',
      explanation:
        'Dars maqsadi: To‘rtburchakning chegarasi va ichki maydonini alohida hisoblang.\n\nPerimetr — shaklning barcha tomonlari uzunliklari yig‘indisi. To‘g‘ri to‘rtburchakda qarama-qarshi tomonlar teng: P = 2 × (a + b). Yuz esa shakl ichki maydonini bildiradi: S = a × b.\n\nPerimetr cm yoki m da, yuz cm² yoki m² da o‘lchanadi. 8 m va 3 m tomonli xonaning yuzi 24 m², perimetri esa 22 m. Ikkala natija bir xil miqdor emas.\n\nKvadratning barcha tomonlari teng: P = 4a, S = a². Yuza va bitta tomon ma’lum bo‘lsa, ikkinchi tomonni bo‘lish orqali topamiz. Masalan, S = 48 m², b = 6 m bo‘lsa, a = 48 ÷ 6 = 8 m.',
      example:
        'Xona 10 m × 4 m.\nPolning yuzi: 10 × 4 = 40 m².\nDevorlar bo‘ylab umumiy uzunlik: 2 × (10 + 4) = 28 m.\nPolni qoplash uchun yuz kerak, chegara bo‘ylab lenta uchun perimetr kerak.',
    },
    after: {
      title: 'Perimetr va yuzani farqlash',
      explanation:
        'Dars maqsadi: To‘rtburchakning chegarasi va ichki maydonini alohida hisoblang.\n\nPerimetr — shaklning barcha tomonlari uzunliklari yig‘indisi. To‘g‘ri to‘rtburchakda qarama-qarshi tomonlar teng: P = 2 × (a + b). Yuz esa shakl ichki maydonini bildiradi: S = a × b.\n\nPerimetr cm yoki m da, yuz cm² yoki m² da o‘lchanadi. 8 m va 3 m tomonli xonaning yuzi 24 m², perimetri esa 22 m. Ikkala natija bir xil miqdor emas.\n\nKvadratning barcha tomonlari teng: P = 4a, S = a². Yuza va bitta tomon ma’lum bo‘lsa, ikkinchi tomonni bo‘lish orqali topamiz. Masalan, S = 48 m², b = 6 m bo‘lsa, a = 48 ÷ 6 = 8 m.',
      example:
        'Xona 10 m × 4 m.\nPolning yuzi: 10 × 4 = 40 m².\nDevorlar bo‘ylab umumiy uzunlik: 2 × (10 + 4) = 28 m.\nPolni qoplash uchun yuza kerak, chegara bo‘ylab lenta uchun perimetr kerak.',
    },
  },
  {
    kind: 'question',
    id: '691f3450-d328-4f95-a507-1477c47e3daf',
    position: 0,
    before: {
      text: '8 va 3 tomonli to‘rtburchakning yuzi?',
      answer: '24',
      explanation: 'S = 8 × 3 = 24.',
      type: 'NUMERICAL',
    },
    after: {
      text: 'Tomonlari 8 m va 3 m bo‘lgan to‘g‘ri to‘rtburchakning yuzi necha m²?',
      answer: '24',
      explanation: 'S = 8 × 3 = 24.',
      type: 'NUMERICAL',
    },
  },
  {
    kind: 'question',
    id: 'e8b14565-2d00-4e39-a819-1c9bb99d3782',
    position: 3,
    before: {
      text: 'Yuzi 48, eni 6 bo‘lgan to‘rtburchak uzunligi?',
      answer: '8',
      explanation: 'a = S ÷ b = 48 ÷ 6 = 8.',
      type: 'NUMERICAL',
    },
    after: {
      text: 'Yuzi 48 m², eni 6 m bo‘lgan to‘g‘ri to‘rtburchakning uzunligi necha metr?',
      answer: '8',
      explanation: 'a = S ÷ b = 48 ÷ 6 = 8.',
      type: 'NUMERICAL',
    },
  },
  {
    kind: 'question',
    id: 'cab3691b-577e-4c6c-aa6d-33fc5a128639',
    position: 5,
    before: {
      text: 'Uzunligi 7, eni 5 bo‘lgan to‘rtburchak perimetri?',
      answer: '24',
      explanation: 'P = 2 × (7 + 5) = 24.',
      type: 'NUMERICAL',
    },
    after: {
      text: 'Uzunligi 7 m, eni 5 m bo‘lgan to‘g‘ri to‘rtburchakning perimetri necha metr?',
      answer: '24',
      explanation: 'P = 2 × (7 + 5) = 24.',
      type: 'NUMERICAL',
    },
  },
  {
    kind: 'question',
    id: 'f3b97097-c7fb-43a0-a264-8c6e78ef02f0',
    position: 4,
    before: {
      text: 'They are studying. Savol shaklini tanlang.',
      options: [
        'Are they studying?',
        'Do they studying?',
        'Is they studying?',
        'They are studying?',
      ],
      answer: 'Are they studying?',
      explanation: 'Are egadan oldinga chiqadi.',
      type: 'MULTIPLE_CHOICE',
    },
    after: {
      text: 'They are studying. Are bilan boshlanadigan savol shaklini tanlang.',
      options: [
        'Are they studying?',
        'Do they studying?',
        'Is they studying?',
        'They are studying?',
      ],
      answer: 'Are they studying?',
      explanation: 'Are egadan oldinga chiqadi.',
      type: 'MULTIPLE_CHOICE',
    },
  },
  {
    kind: 'question',
    id: '585dd2d4-b6be-4151-a0ea-c00eec271d06',
    position: 2,
    before: {
      text: 'There are ___ apples. (tasdiq gap)',
      answer: 'some',
      explanation: 'Tasdiq gaplarda odatda some.',
      type: 'TEXT',
    },
    after: {
      text: 'There are ___ apples. Tasdiq gap uchun some yoki any ni tanlang.',
      answer: 'some',
      explanation: 'Tasdiq gaplarda odatda some.',
      type: 'TEXT',
    },
  },
  {
    kind: 'question',
    id: '0d76bd37-0970-4cbf-a540-bfaaec3c515f',
    position: 5,
    before: {
      text: 'Suv taklif qilayotgan gapni tanlang.',
      options: [
        'Would you like some water?',
        'Would you like many water?',
        'Would you like a water?',
        'Would you like an water?',
      ],
      answer: 'Would you like some water?',
      explanation: 'Taklif savollarida some ishlatilishi mumkin.',
      type: 'MULTIPLE_CHOICE',
    },
    after: {
      text: 'Water sanalmaydigan ot bo‘lgan, some bilan suv taklif qilayotgan gapni tanlang.',
      options: [
        'Would you like some water?',
        'Would you like many water?',
        'Would you like a water?',
        'Would you like an water?',
      ],
      answer: 'Would you like some water?',
      explanation: 'Taklif savollarida some ishlatilishi mumkin.',
      type: 'MULTIPLE_CHOICE',
    },
  },
  {
    kind: 'question',
    id: 'f8b85343-df2c-43ad-a051-23ee7c31937a',
    position: 0,
    before: {
      text: 'She ___ finished her homework.',
      answer: 'has',
      explanation: 'She bilan has + finished.',
      type: 'TEXT',
    },
    after: {
      text: 'She ___ finished her homework. Present Perfect uchun have yoki has ni yozing.',
      answer: 'has',
      explanation: 'She bilan has + finished.',
      type: 'TEXT',
    },
  },
  {
    kind: 'lesson',
    id: 'eaac3e76-3bb7-4a75-aa3c-cdf25bb4a0cd',
    position: 1,
    before: {
      title: 'Past Continuous va uzilgan harakat',
      explanation:
        'Dars maqsadi: O‘tmishda davom etayotgan ishni was/were + -ing bilan ayting.\n\nPast Continuous o‘tmishdagi ma’lum paytda davom etayotgan harakatni bildiradi. Tuzilishi: was/were + fe’l-ing. I was reading at eight last night. They were playing at five.\n\nI, he, she, it bilan was; you, we, they bilan were ishlatiladi. Davom etayotgan harakatni boshqa qisqa harakat bo‘lishi mumkin: I was reading when the phone rang. Reading davom etayotgan ish, rang esa shu paytda sodir bo‘lgan voqea.\n\nWhile ko‘pincha ikki davomiy ishni bog‘laydi: While I was reading, my sister was drawing. When va while ni tarjimasi bilangina emas, gapdagi harakatlar vazifasiga qarab tushuning.',
      example:
        'At seven, Madina was doing homework. Her brothers were playing.\nShe was writing when the phone rang.\nRang Past Simple, was writing Past Continuous.',
    },
    after: {
      title: 'Past Continuous va uzilgan harakat',
      explanation:
        'Dars maqsadi: O‘tmishda davom etayotgan ishni was/were + -ing bilan ayting.\n\nPast Continuous o‘tmishdagi ma’lum paytda davom etayotgan harakatni bildiradi. Tuzilishi: was/were + fe’l-ing. I was reading at eight last night. They were playing at five.\n\nI, he, she, it bilan was; you, we, they bilan were ishlatiladi. Davom etayotgan harakatni boshqa qisqa harakat to‘xtatishi mumkin: I was reading when the phone rang. Reading davom etayotgan ish, rang esa shu paytda sodir bo‘lgan voqea.\n\nWhile ko‘pincha ikki davomiy ishni bog‘laydi: While I was reading, my sister was drawing. When va while ni tarjimasi bilangina emas, gapdagi harakatlar vazifasiga qarab tushuning.',
      example:
        'At seven, Madina was doing homework. Her brothers were playing.\nShe was writing when the phone rang.\nRang Past Simple, was writing Past Continuous.',
    },
  },
  {
    kind: 'question',
    id: '6e88f8ea-715e-43bd-ac34-f96fa06efc17',
    position: 5,
    before: {
      text: 'While I was reading, she ___ drawing.',
      answer: 'was',
      explanation: 'She bilan was drawing.',
      type: 'TEXT',
    },
    after: {
      text: 'While I was reading, she ___ drawing. Past Continuous uchun was yoki were ni yozing.',
      answer: 'was',
      explanation: 'She bilan was drawing.',
      type: 'TEXT',
    },
  },
  {
    kind: 'question',
    id: 'a63d49ae-d979-4bb1-af8e-a21c1de1589e',
    position: 2,
    before: {
      text: 'This is the library ___ we read.',
      answer: 'where|in which',
      explanation: 'Joy uchun where; in which ham mos keladi.',
      type: 'TEXT',
    },
    after: {
      text: 'This is the library ___ we read. Joyni bildiradigan who, which yoki where dan birini yozing.',
      answer: 'where|in which',
      explanation: 'Joy uchun where; in which ham mos keladi.',
      type: 'TEXT',
    },
  },
  {
    kind: 'question',
    id: '1452b8f4-fa37-4255-adbe-62bb40726d64',
    position: 2,
    before: {
      text: 'Matnni o‘zgartirishdan oldin kerakli qismini nima qilish kerak? Bir so‘z yozing.',
      answer: 'tanlash',
      explanation: 'Amal tanlangan matnga qo‘llanadi.',
      type: 'TEXT',
    },
    after: {
      text: 'Mavjud matnning kerakli qismini qalin shriftga o‘tkazishdan oldin uni nima qilish kerak? Bir so‘z yozing.',
      answer: 'tanlash',
      explanation: 'Amal tanlangan matnga qo‘llanadi.',
      type: 'TEXT',
    },
  },
  {
    kind: 'question',
    id: '7160a7b2-24ca-4188-a98e-c63193455697',
    position: 3,
    before: {
      text: 'Agar—aks holda tuzilmasi algoritmning qaysi turiga tegishli? Bir so‘z yozing.',
      answer: 'shartli',
      explanation: 'Bu shartli algoritm.',
      type: 'TEXT',
    },
    after: {
      text: 'Agar—aks holda tuzilmasi algoritmning qaysi turiga tegishli? Bir so‘z yozing.',
      answer: 'shartli|tarmoqlanuvchi',
      explanation: 'Bu shartli algoritm.',
      type: 'TEXT',
    },
  },
];
