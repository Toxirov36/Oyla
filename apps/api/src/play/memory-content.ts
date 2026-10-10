import { createHash } from 'node:crypto';

export type MemorySubject = 'mathematics' | 'english' | 'informatics';
export type MemoryPair = { id: string; left: string; right: string; level: number };
type RawPair = [string, string];
type Levels = [RawPair[], RawPair[], RawPair[]];

const bank: Record<MemorySubject, Record<number, Levels>> = {
  mathematics: {
    5: [
      [['1/2', 'Ikki teng bo‘lakdan biri'], ['1/3', 'Uch teng bo‘lakdan biri'], ['1/4', 'To‘rt teng bo‘lakdan biri'], ['2/3', 'Uch bo‘lakdan ikkitasi'], ['3/4', 'To‘rt bo‘lakdan uchtasi']],
      [['1/5', '0,2'], ['2/5', '0,4'], ['3/5', '0,6'], ['4/5', '0,8'], ['1/10', '0,1']],
      [['12 ÷ 3', '4'], ['18 ÷ 3', '6'], ['21 ÷ 3', '7'], ['32 ÷ 4', '8'], ['27 ÷ 3', '9'], ['44 ÷ 4', '11']],
    ],
    6: [
      [['1/2', '50%'], ['1/4', '25%'], ['3/4', '75%'], ['1/5', '20%'], ['1/10', '10%']],
      [['10% of 100', '10'], ['20% of 100', '20'], ['25% of 120', '30'], ['50% of 80', '40'], ['10% of 500', '50']],
      [['3 : 1 nisbatda 12 ta buyumning katta qismi', '9'], ['2x = 6', 'x = 3'], ['3x = 12', 'x = 4'], ['4x = 20', 'x = 5'], ['5x = 30', 'x = 6'], ['2x = 14', 'x = 7']],
    ],
    7: [
      [['2²', '4'], ['3²', '9'], ['4²', '16'], ['5²', '25'], ['6²', '36']],
      [['x + 4 = 5', 'x = 1'], ['2x = 4', 'x = 2'], ['3x = 9', 'x = 3'], ['2x − 2 = 6', 'x = 4'], ['3x − 5 = 10', 'x = 5']],
      [['2x + 1 = 13', 'x = 6'], ['3x − 2 = 19', 'x = 7'], ['4x + 4 = 36', 'x = 8'], ['5x − 5 = 40', 'x = 9'], ['2x + 6 = 26', 'x = 10'], ['3x − 3 = 30', 'x = 11']],
    ],
  },
  english: {
    5: [
      [['cat', 'mushuk'], ['dog', 'it'], ['rabbit', 'quyon'], ['fox', 'tulki'], ['bird', 'qush']],
      [['book', 'kitob'], ['pen', 'ruchka'], ['desk', 'parta'], ['teacher', 'o‘qituvchi'], ['school', 'maktab']],
      [['I am happy', 'Men xursandman'], ['She is a student', 'U o‘quvchi qiz'], ['We are friends', 'Biz do‘stmiz'], ['This is my bag', 'Bu mening sumkam'], ['They are at home', 'Ular uyda'], ['He has a ball', 'Uning to‘pi bor']],
    ],
    6: [
      [['go', 'went'], ['see', 'saw'], ['eat', 'ate'], ['write', 'wrote'], ['buy', 'bought']],
      [['take', 'took'], ['give', 'gave'], ['make', 'made'], ['find', 'found'], ['think', 'thought']],
      [['I visited yesterday', 'Men kecha tashrif buyurdim'], ['She was reading', 'U o‘qiyotgan edi'], ['They went to school', 'Ular maktabga bordi'], ['We played football', 'Biz futbol o‘ynadik'], ['He made dinner', 'U kechki ovqat tayyorladi'], ['I saw a bird', 'Men qushni ko‘rdim']],
    ],
    7: [
      [['go', 'gone'], ['see', 'seen'], ['eat', 'eaten'], ['write', 'written'], ['take', 'taken']],
      [['I have finished', 'Men tugatdim'], ['She has arrived', 'U yetib keldi'], ['We have studied', 'Biz o‘qidik'], ['They have left', 'Ular ketishdi'], ['He has written', 'U yozib bo‘ldi']],
      [['If it rains, I will stay', 'Yomg‘ir yog‘sa, qolaman'], ['I was reading when he called', 'U qo‘ng‘iroq qilganda o‘qiyotgan edim'], ['She has never visited', 'U hech qachon tashrif buyurmagan'], ['We had dinner after school', 'Maktabdan keyin ovqatlandik'], ['The book that I read', 'Men o‘qigan kitob'], ['They were playing at noon', 'Ular tush payti o‘ynayotgan edi']],
    ],
  },
  informatics: {
    5: [
      [['Klaviatura', 'Matn kiritish'], ['Monitor', 'Tasvirni ko‘rsatish'], ['Protsessor', 'Hisoblashni bajarish'], ['Sichqoncha', 'Kursorni boshqarish'], ['Printer', 'Qog‘ozga chiqarish']],
      [['Fayl', 'Saqlangan ma’lumot'], ['Papka', 'Fayllarni guruhlash'], ['Parol', 'Hisobni himoyalash'], ['Brauzer', 'Veb sahifani ochish'], ['Qidiruv tizimi', 'Internetdan ma’lumot topish']],
      [['Noma’lum havola', 'Ochishdan oldin tekshirish'], ['Murakkab parol', 'Harflar va raqamlarni aralashtirish'], ['Zaxira nusxa', 'Ma’lumotni boshqa joyda saqlash'], ['Shaxsiy ma’lumot', 'Begonalarga ulashmaslik'], ['Antivirus', 'Zararli dasturlarni aniqlash'], ['Yangilanish', 'Dastur xatolarini tuzatish']],
    ],
    6: [
      [['Algoritm', 'Amallar ketma-ketligi'], ['Shart', 'Ha yoki yo‘q tekshiruvi'], ['Takrorlash', 'Amalni qayta bajarish'], ['Jadval', 'Satr va ustunlar'], ['Qidirish', 'Kerakli ma’lumotni topish']],
      [['Boshlash bloki', 'Algoritmning kirish nuqtasi'], ['Romb shakli', 'Shartni ifodalash'], ['Strelka', 'Oqim yo‘nalishini ko‘rsatish'], ['Natija bloki', 'Javobni chiqarish'], ['Jarayon bloki', 'Amalni bajarish']],
      [['Agar x > 0', 'Musbatlikni tekshirish'], ['3 marta takrorla', 'Amalni uch bor bajarish'], ['Ro‘yxatni sarala', 'Elementlarni tartibga keltirish'], ['O‘zgaruvchi', 'Qiymat saqlanadigan nom'], ['Kiritish', 'Foydalanuvchidan ma’lumot olish'], ['Tenglikni tekshir', 'Ikki qiymatni solishtirish']],
    ],
    7: [
      [['if', 'Shartni tekshirish'], ['for', 'Takrorlash sikli'], ['function', 'Qayta ishlatiladigan buyruqlar'], ['variable', 'Qiymatni saqlash'], ['array', 'Elementlar to‘plami']],
      [['true', 'Mantiqiy rost'], ['false', 'Mantiqiy yolg‘on'], ['return', 'Funksiyadan qiymat qaytarish'], ['length', 'Elementlar soni'], ['index', 'Element o‘rni']],
      [['x = 2; x = x + 3', 'x qiymati 5 bo‘ladi'], ['2 * 3 + 1', 'Natija 7 bo‘ladi'], ['[4, 5][0]', 'Birinchi element 4'], ['5 > 3', 'Taqqoslash rost'], ['3 == 4', 'Taqqoslash yolg‘on'], ['[1, 2, 3].length', 'Uchta element bor']],
    ],
  },
};

export const memorySubjects = Object.keys(bank) as MemorySubject[];
export const pairCount = (stage: number) => stage === 1 ? 4 : stage === 2 ? 5 : 6;
const goals: Record<MemorySubject, Record<number, [string, string, string]>> = {
  mathematics: {
    5: ['oddiy kasrning ma’nosi', 'oddiy kasr va o‘nli kasr', 'ko‘p bosqichli arifmetik hisoblash'],
    6: ['foiz va ulush', 'foizli hisoblash', 'nisbat va sodda tenglamalar'],
    7: ['daraja va amallar tartibi', 'bir noma’lumli tenglama', 'qavsli va ko‘p bosqichli tenglama'],
  },
  english: {
    5: ['kundalik sodda so‘z va ularning o‘zbekcha tarjimasi', 'maktab va kundalik hayotga oid so‘z birikmalari', 'sodda inglizcha gap va o‘zbekcha tarjimasi'],
    6: ['past simple fe’llarining asosiy va o‘tgan zamon shakli', 'murakkabroq irregular fe’llarning asosiy va o‘tgan zamon shakli', 'o‘tgan zamondagi inglizcha gap va o‘zbekcha tarjimasi'],
    7: ['past participle fe’l shakllari', 'present perfect gaplar va o‘zbekcha tarjima', 'shart, davomiy yoki murakkab zamonli gaplar va o‘zbekcha tarjima'],
  },
  informatics: {
    5: ['kompyuter qurilmalari va vazifalari', 'fayl, papka va internet tushunchalari', 'raqamli xavfsizlikdagi vaziyat va to‘g‘ri amal'],
    6: ['algoritmning asosiy tushunchalari', 'blok-sxema qismlari va vazifalari', 'algoritmik buyruq va uning natijasi'],
    7: ['dasturlash tushunchalari', 'mantiqiy va dasturiy atamalar', 'kichik kod ifodasi va aniq natijasi'],
  },
};
export function memoryGoal(grade: number, subject: MemorySubject, stage: number): string {
  const goal = goals[subject]?.[grade]?.[stage - 1];
  if (!goal) throw new Error('Unsupported memory learning goal');
  return goal;
}
export function memoryCatalog(grade: number, subject: MemorySubject): MemoryPair[] {
  const levels = bank[subject]?.[grade];
  if (!levels) throw new Error('Unsupported memory game grade or subject');
  return levels.flatMap((pairs, level) => pairs.map(([left, right], index) => ({
    id: `${level + 1}-${index + 1}`, left, right, level: level + 1,
  })));
}
const norm = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('uz');
function cleanGeneratedLabel(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Memory card text must be a string');
  const cleaned = value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!cleaned || cleaned.length > 100 ||
    [...cleaned].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) ||
    /<\s*\/?[a-z][^>]*>/iu.test(cleaned) || /(?:https?:\/\/|www\.)/iu.test(cleaned))
    throw new Error('Invalid memory card text');
  return cleaned;
}
export function checkedGeneratedMemoryPairs(stage: number, value: unknown): MemoryPair[] {
  if (!Array.isArray(value) || value.length !== pairCount(stage)) throw new Error('Incorrect generated pair count');
  const pairs = value.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid generated pair');
    const pair = item as Record<string, unknown>;
    return { id: `g2-${index + 1}`, left: cleanGeneratedLabel(pair.left), right: cleanGeneratedLabel(pair.right), level: stage };
  });
  const labels = pairs.flatMap((pair) => [norm(pair.left), norm(pair.right)]);
  if (new Set(labels).size !== labels.length) throw new Error('Ambiguous generated card labels');
  return pairs;
}
export function generatedDeckOverlap(pairs: MemoryPair[], previous: MemoryPair[][]): number {
  const lefts = new Set(pairs.map((pair) => norm(pair.left)));
  return previous.reduce((maximum, deck) =>
    Math.max(maximum, deck.filter((pair) => lefts.has(norm(pair.left))).length), 0);
}
export function generatedDeckSignature(grade: number, subject: MemorySubject, stage: number, pairs: MemoryPair[]): string {
  const content = pairs.map((pair) => `${norm(pair.left)}\u0000${norm(pair.right)}`).sort().join('\u0001');
  return createHash('sha256').update(`v2:${grade}:${subject}:${stage}:${content}`).digest('hex');
}
export function checkedMemoryPairs(grade: number, subject: MemorySubject, stage: number, ids: unknown): MemoryPair[] {
  if (!Array.isArray(ids) || ids.length !== pairCount(stage) || ids.some((id) => typeof id !== 'string'))
    throw new Error('Incorrect memory pair count');
  const catalog = memoryCatalog(grade, subject);
  const unique = new Set(ids as string[]);
  if (unique.size !== ids.length) throw new Error('Duplicate memory pairs');
  const pairs = (ids as string[]).map((id) => catalog.find((pair) => pair.id === id));
  if (pairs.some((pair) => !pair || pair.level > stage)) throw new Error('Unknown memory pair');
  const selected = pairs as MemoryPair[];
  const current = selected.filter((pair) => pair.level === stage).length;
  if (current < (stage === 1 ? 4 : stage === 2 ? 3 : 4)) throw new Error('Memory stage too easy');
  const all = selected.flatMap((pair) => [pair.left, pair.right].map(norm));
  if (new Set(all).size !== all.length) throw new Error('Ambiguous memory labels');
  return selected;
}
export function fallbackMemoryIds(grade: number, subject: MemorySubject, stage: number): string[] {
  const catalog = memoryCatalog(grade, subject);
  const current = catalog.filter((pair) => pair.level === stage);
  const previous = catalog.filter((pair) => pair.level === stage - 1);
  return [...current.slice(0, stage === 1 ? 4 : stage === 2 ? 3 : 4), ...previous.slice(0, stage === 1 ? 0 : 2)].map((pair) => pair.id);
}
export function deckSignature(grade: number, subject: MemorySubject, stage: number, ids: string[]) {
  return createHash('sha256').update(`${grade}:${subject}:${stage}:${[...ids].sort().join(',')}`).digest('hex');
}
