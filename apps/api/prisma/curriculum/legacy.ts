import { mc, tf, num, txt, type SeedLesson } from './types';
export const legacyCurriculum: {
  slug: string;
  title: string;
  description: string;
  lessons: SeedLesson[];
}[] = [
  {
    slug: 'mathematics',
    title: 'Matematika',
    description: 'Mantiqiy fikrlang, masalalarni tushuning va yechim toping.',
    lessons: [
      {
        title: 'Kasrlarni qo‘shish',
        topic: 'Oddiy kasrlar',
        explanation:
          'Kasr butunning bir qismini ifodalaydi. Yuqoridagi son — surat, pastdagi son — maxraj.\n\nMaxrajlari bir xil kasrlarni qo‘shishda suratlar qo‘shiladi, maxraj esa saqlanadi. Masalan, 1/5 + 2/5 = 3/5.\n\nMaxrajlar turlicha bo‘lsa, avval umumiy maxraj topamiz. 1/2 = 2/4, shuning uchun 1/2 + 1/4 = 3/4. Natijani imkon bo‘lsa qisqartiramiz.',
        example:
          'Pitsaning 2/8 qismini Ali, 3/8 qismini Madina yedi. Jami: 2/8 + 3/8 = 5/8. Pitsaning 3/8 qismi qoldi.',
        questions: [
          mc(
            '1/5 + 2/5 nechaga teng?',
            ['2/5', '3/5', '3/10', '1/5'],
            '3/5',
            'Maxrajlar bir xil: 1 + 2 = 3. Maxraj 5 bo‘lib qoladi.',
          ),
          tf('2/7 + 3/7 = 5/14.', false, 'Maxrajlar qo‘shilmaydi. To‘g‘ri javob 5/7.'),
          num(
            '1/8 + 3/8 kasrining surati nechaga teng?',
            4,
            'Suratlar: 1 + 3 = 4, natija 4/8 = 1/2.',
          ),
          txt(
            '1/2 + 1/4 javobini a/b shaklida yozing.',
            '3/4',
            '1/2 ni 2/4 ga aylantiramiz. 2/4 + 1/4 = 3/4.',
          ),
          mc(
            '3/6 + 2/6 javobini toping.',
            ['5/12', '1/6', '5/6', '6/5'],
            '5/6',
            '3 + 2 = 5. Umumiy maxraj 6.',
          ),
          num('4/9 + 2/9 kasrining surati nechaga teng?', 6, '4 + 2 = 6. Natija 6/9 = 2/3.'),
        ],
      },
      {
        title: 'Foizlarni hisoblash',
        topic: 'Foizlar',
        explanation:
          'Foiz — yuzdan bir ulush. 1% = 1/100. Foizlarni kundalik hayotda chegirma, baholar va statistikani tushunish uchun ishlatamiz.\n\nSonning p foizini topish uchun sonni p ga ko‘paytirib, 100 ga bo‘lamiz. 200 ning 15% i: 200 × 15 ÷ 100 = 30.\n\n25% = 1/4, 50% = 1/2, 75% = 3/4. Chegirmadan keyingi narx: dastlabki narx − chegirma miqdori.',
        example:
          'Kitob 40 000 so‘m turadi. 10% chegirma — 4 000 so‘m. Yakuniy narx: 40 000 − 4 000 = 36 000 so‘m.',
        questions: [
          num('100 ning 25% i nechaga teng?', 25, '100 × 25 ÷ 100 = 25.'),
          mc(
            '50% qaysi kasrga teng?',
            ['1/4', '1/2', '3/4', '1/5'],
            '1/2',
            '50/100 ni qisqartirsak 1/2 bo‘ladi.',
          ),
          tf('200 ning 10% i 20 ga teng.', true, '200 × 10 ÷ 100 = 20.'),
          num('80 ning 25% i nechaga teng?', 20, '25% chorakni anglatadi: 80 ÷ 4 = 20.'),
          txt(
            'Yuzdan bir ulush qanday ataladi? Bir so‘z yozing.',
            'foiz|percent',
            'Foiz so‘zi yuzdan bir ulushni anglatadi.',
          ),
          num(
            '50 000 so‘mlik buyum 20% chegirma bilan necha so‘m turadi?',
            40000,
            'Chegirma 10 000 so‘m. 50 000 − 10 000 = 40 000.',
          ),
        ],
      },
      {
        title: 'To‘g‘ri to‘rtburchak yuzi',
        topic: 'Geometriya',
        explanation:
          'To‘g‘ri to‘rtburchakning qarama-qarshi tomonlari teng, barcha burchaklari 90°. Uzunlikni a, enini b deb belgilaymiz.\n\nYuz formulasi: S = a × b. Yuz kvadrat birliklarda o‘lchanadi: cm² yoki m².\n\nPerimetr — shakl chegarasi uzunligi. P = 2 × (a + b). Yuz va perimetrni aralashtirmang: biri ichki maydonni, ikkinchisi chegarani o‘lchaydi.',
        example:
          'Uzunligi 6 cm, eni 4 cm bo‘lgan to‘rtburchak: S = 6 × 4 = 24 cm². P = 2 × (6 + 4) = 20 cm.',
        questions: [
          num('Uzunlik 5, en 3 bo‘lsa, yuz nechaga teng?', 15, 'S = 5 × 3 = 15.'),
          mc(
            'Yuzning o‘lchov birligi qaysi?',
            ['cm', 'cm²', 'kg', 'soniya'],
            'cm²',
            'Yuz kvadrat birlikda o‘lchanadi.',
          ),
          tf('S = 2 × (a + b) — yuz formulasi.', false, 'Bu perimetr formulasi. Yuz S = a × b.'),
          num('Tomoni 4 bo‘lgan kvadratning yuzi?', 16, 'Kvadratda a = b = 4: S = 4 × 4 = 16.'),
          txt(
            'S = a × b formulasi nimani hisoblaydi?',
            'yuz|yuzi|maydon',
            'Uzunlik va en ko‘paytmasi yuzni hisoblaydi.',
          ),
          num('8 × 5 to‘rtburchakning perimetri?', 26, 'P = 2 × (8 + 5) = 26.'),
        ],
      },
    ],
  },
  {
    slug: 'english',
    title: 'Ingliz tili',
    description: 'Yangi so‘zlar, grammatika va amaliy ingliz tili.',
    lessons: [
      {
        title: 'Present Simple',
        topic: 'Grammar basics',
        explanation:
          'Present Simple odatlar va muntazam takrorlanadigan harakatlar uchun ishlatiladi. I, you, we, they bilan fe’l oddiy shaklda: I read books.\n\nHe, she, it bilan fe’lga -s yoki -es qo‘shiladi: She reads books. He goes to school.\n\nInkor: I do not (don’t) play. She does not (doesn’t) play. Does ishlatilganda asosiy fe’lga -s qo‘shilmaydi. Savol: Do you read? Does she read?',
        example:
          'I study every day. — Men har kuni o‘qiyman.\nShe studies every day. — U har kuni o‘qiydi.\nDoes he study? — U o‘qiydimi?',
        questions: [
          mc(
            'She ___ to school every day.',
            ['go', 'goes', 'going', 'gone'],
            'goes',
            'She bilan fe’lga -es qo‘shiladi: goes.',
          ),
          tf(
            'I plays football — grammatik jihatdan to‘g‘ri.',
            false,
            'I bilan oddiy play ishlatiladi.',
          ),
          txt(
            'He ___ books. (read fe’lini to‘g‘ri shaklda yozing)',
            'reads',
            'He bilan read + s = reads.',
          ),
          mc(
            '___ you like music?',
            ['Does', 'Do', 'Is', 'Are'],
            'Do',
            'You bilan savolda Do ishlatiladi.',
          ),
          txt(
            'She does not ___ football. (play fe’lini yozing)',
            'play',
            'Does not dan keyin fe’l oddiy shaklda bo‘ladi.',
          ),
          tf(
            'Present Simple odatlar uchun ishlatiladi.',
            true,
            'Har kuni, odatda va muntazam bajariladigan harakatlar Present Simple bilan ifodalanadi.',
          ),
        ],
      },
      {
        title: 'My school day',
        topic: 'Everyday vocabulary',
        explanation:
          'Kundalik maktab hayotini ingliz tilida tasvirlaymiz. School — maktab, lesson — dars, homework — uy vazifasi, teacher — o‘qituvchi, library — kutubxona.\n\nI go to school at eight. — Men soat sakkizda maktabga boraman. I do my homework after school. — Maktabdan keyin uy vazifasini bajaraman.\n\nVaqt uchun at ishlatiladi: at nine. Hafta kunlari uchun on: on Monday. In the morning — ertalab.',
        example:
          'My school day starts at eight. I have six lessons. After school, I do my homework and read in the library.',
        questions: [
          txt('“Maktab” so‘zini ingliz tilida yozing.', 'school', 'School — maktab.'),
          mc(
            '“Homework” nimani anglatadi?',
            ['Kutubxona', 'Uy vazifasi', 'Tanaffus', 'Sinf'],
            'Uy vazifasi',
            'Homework — uyga berilgan vazifa.',
          ),
          tf('Teacher — o‘qituvchi.', true, 'Teacher o‘qituvchi degani.'),
          txt(
            '“Kutubxona” ingliz tilida?',
            'library',
            'Library — kitoblarni o‘qish va olish mumkin bo‘lgan joy.',
          ),
          mc(
            'I go to school ___ eight.',
            ['on', 'in', 'at', 'of'],
            'at',
            'Aniq soat uchun at ishlatiladi.',
          ),
          txt(
            'On ___ — dushanba kuni. Inglizcha kun nomini yozing.',
            'Monday',
            'Monday — dushanba. Hafta kunlari on bilan ishlatiladi.',
          ),
        ],
      },
      {
        title: 'Comparatives',
        topic: 'Describing the world',
        explanation:
          'Ikki narsani taqqoslash uchun qiyosiy sifat ishlatamiz. Qisqa sifatlarga -er qo‘shiladi: tall → taller, small → smaller.\n\nUzun sifatlar bilan more: interesting → more interesting. Y bilan tugagan sifatlarda y → i: happy → happier.\n\nTaqqoslashda than ishlatiladi: This book is smaller than that book. Noto‘g‘ri fe’l emas, maxsus sifat shakllari: good → better, bad → worse.',
        example:
          'A bicycle is cheaper than a car. — Velosiped mashinadan arzonroq.\nThis lesson is more interesting. — Bu dars qiziqroq.',
        questions: [
          txt('Tall sifatining qiyosiy shaklini yozing.', 'taller', 'Tall + er = taller.'),
          mc(
            'Good → ?',
            ['gooder', 'better', 'best', 'more good'],
            'better',
            'Good ning maxsus qiyosiy shakli better.',
          ),
          tf(
            'More interesting — to‘g‘ri qiyosiy shakl.',
            true,
            'Uzun interesting sifati more bilan ishlatiladi.',
          ),
          txt('Small → ?', 'smaller', 'Small ga -er qo‘shiladi.'),
          mc(
            'This bag is bigger ___ that bag.',
            ['then', 'than', 'that', 'to'],
            'than',
            'Taqqoslash uchun than ishlatiladi.',
          ),
          txt(
            'Happy sifatining qiyosiy shakli?',
            'happier',
            'Y o‘rniga i qo‘yib, -er qo‘shamiz: happier.',
          ),
        ],
      },
    ],
  },
  {
    slug: 'informatics',
    title: 'Informatika',
    description: 'Algoritmlar, raqamli savodxonlik va dasturlashga ilk qadam.',
    lessons: [
      {
        title: 'Algoritm nima?',
        topic: 'Algoritmik fikrlash',
        explanation:
          'Algoritm — maqsadga erishish uchun bajariladigan aniq va tartibli ko‘rsatmalar ketma-ketligi. Algoritm qadamlari tushunarli, chekli va bajariladigan bo‘lishi kerak.\n\nKetma-ket algoritmda qadamlar navbat bilan bajariladi. Shartli algoritmda natijaga qarab yo‘l tanlanadi: agar yomg‘ir bo‘lsa, soyabon ol. Takrorlashda bir amal bir necha marta bajariladi.\n\nYaxshi algoritmni boshqa odam ham ko‘rsatmaga amal qilib bajara oladi. “Yaxshilab tayyorla” kabi noaniq qadam o‘rniga aniq amal yozamiz.',
        example:
          'Choy tayyorlash: 1. Suvni qaynat. 2. Piyolaga choy sol. 3. Issiq suv quy. 4. Uch daqiqa kut.\nTartib muhim: avval suvni qaynatamiz.',
        questions: [
          mc(
            'Algoritm nima?',
            ['Tasodifiy fikr', 'Aniq qadamlar ketma-ketligi', 'Faqat kompyuter', 'Rasm turi'],
            'Aniq qadamlar ketma-ketligi',
            'Algoritm masalani hal qiladigan aniq tartibli qadamlar.',
          ),
          tf(
            'Algoritmdagi qadamlar tartibi muhim emas.',
            false,
            'Qadamlar noto‘g‘ri tartibda bajarilsa natija o‘zgaradi.',
          ),
          txt(
            'Bir amalni bir necha marta bajarish nima deyiladi?',
            'takrorlash|sikl',
            'Takrorlash yoki sikl bir amalni qayta bajaradi.',
          ),
          num(
            '1 dan 5 gacha sonlarni chiqarish necha marta takrorlanadi?',
            5,
            '1, 2, 3, 4, 5 — jami beshta son.',
          ),
          mc(
            '“Agar yomg‘ir bo‘lsa...” qaysi tuzilma?',
            ['Ketma-ketlik', 'Shart', 'Son', 'Fayl'],
            'Shart',
            'Agar — shartga qarab harakat tanlash.',
          ),
          tf(
            'Algoritm kompyutersiz ham bajarilishi mumkin.',
            true,
            'Masalan, taom retsepti ham algoritm.',
          ),
        ],
      },
      {
        title: 'Internetda xavfsizlik',
        topic: 'Raqamli savodxonlik',
        explanation:
          'Internetda shaxsiy ma’lumotlarni himoya qilamiz. Parol, uy manzili va telefon raqamini begonalarga yubormang. Kuchli parol uzun va noyob bo‘ladi. Bir parolni barcha saytlarda ishlatmang.\n\nShubhali havolalar yoki “sovrin yutdingiz” xabarlarida parol kiritmang. Phishing — haqiqiy xizmatga o‘xshab, ma’lumotni o‘g‘irlashga urinish. Sayt manzilini tekshiring.\n\nNoqulay xabar olsangiz, ishonchli katta odamga yoki o‘qituvchiga murojaat qiling. Hisobga imkon bo‘lsa ikki bosqichli tasdiqlashni yoqing.',
        example:
          'Notanish odam sizga “parolingizni yuborsangiz, sovrin beraman” deb yozdi. Parolni yubormang. Xabarni kattalarga ko‘rsating va yuboruvchini bloklang.',
        questions: [
          tf('Parolni do‘stlarga yuborish xavfsiz.', false, 'Parol faqat hisob egasiga tegishli.'),
          mc(
            'Kuchli parolning xususiyati?',
            ['Faqat ism', '123456', 'Uzun va noyob', 'Tug‘ilgan sana'],
            'Uzun va noyob',
            'Uzun va har bir xizmatda alohida parol xavfsizroq.',
          ),
          txt(
            'Soxta xabarlar orqali ma’lumot o‘g‘irlash usuli nima?',
            'phishing|fishing|fishing hujumi',
            'Phishing hujumida soxta xabar yoki sayt yordamida ma’lumot o‘g‘irlanadi.',
          ),
          tf(
            'Shubhali havolada parol kiritmaslik kerak.',
            true,
            'Sayt manzilini va yuboruvchini avval tekshiring.',
          ),
          mc(
            'Noqulay xabar kelganda kimga murojaat qilasiz?',
            ['Begona odamga', 'Ishonchli kattaga', 'Hech kimga', 'Xabarni tarqating'],
            'Ishonchli kattaga',
            'Katta odam yoki o‘qituvchi yordam beradi.',
          ),
          num(
            'Ikki bosqichli tasdiqlash nechta tekshirish bosqichiga ega?',
            2,
            'Odatda parol va qo‘shimcha tasdiqlash kodi.',
          ),
        ],
      },
      {
        title: 'O‘zgaruvchilar va hisoblash',
        topic: 'Dasturlash asoslari',
        explanation:
          'O‘zgaruvchi — qiymatni nom bilan saqlaydigan joy. Masalan, x = 5 bo‘lsa, x qiymati 5. O‘zgaruvchi qiymatini o‘zgartirish mumkin.\n\nDasturdagi amallar: + qo‘shish, − ayirish, * ko‘paytirish, / bo‘lish. Ko‘paytirish va bo‘lish qo‘shishdan oldin bajariladi. Qavslar tartibni o‘zgartiradi.\n\nx = x + 1 degani eski qiymatga bir qo‘shib, yangi qiymatni x ga saqlash. O‘zgaruvchi nomi ma’noli bo‘lsin: age, score, total.',
        example:
          'x = 5\ny = 3\ntotal = x + y\nNatija: total = 8.\nKeyin x = x + 1 bajarilsa, x = 6 bo‘ladi.',
        questions: [
          num('x = 4, y = 3. x + y = ?', 7, '4 + 3 = 7.'),
          tf(
            'O‘zgaruvchining qiymati o‘zgarishi mumkin.',
            true,
            'Yangi qiymat o‘zgaruvchiga qayta saqlanadi.',
          ),
          mc(
            'Ko‘paytirish belgisi qaysi?',
            ['+', '*', '/', '='],
            '*',
            'Dasturlashda * ko‘paytirishni bildiradi.',
          ),
          num('2 + 3 * 4 natijasi?', 14, 'Avval 3 × 4 = 12, keyin 2 + 12 = 14.'),
          txt(
            'Qiymatni nom bilan saqlash uchun nima ishlatiladi?',
            "o‘zgaruvchi|o'zgaruvchi|variable",
            'O‘zgaruvchi nomlangan qiymatni saqlaydi.',
          ),
          num(
            'x = 5. x = x + 1 dan keyin x nechaga teng?',
            6,
            'Eski 5 qiymatiga bir qo‘shiladi: 6.',
          ),
        ],
      },
    ],
  },
];
