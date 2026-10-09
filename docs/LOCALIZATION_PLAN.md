# Bilify: o‘zbek, rus va ingliz tillarini qo‘shish rejasi

Holati: til infratuzilmasi, asosiy interfeys va qolgan barcha sahifalarning interfeys tarjimalari qo‘shildi. O‘quv kontentining to‘liq tarjimasi alohida bosqichda.

Kelishilgan tillar: **O‘zbekcha (`uz`), Русский (`ru`), English (`en`)**. Boshlang‘ich va zaxira til — o‘zbekcha.

## Birinchi ishchi to‘plam

Qo‘shilgan imkoniyatlar:

- Login/register/parol tiklash sahifalari va topbardagi til tanlagich.
- i18next orqali uch til resurslari. Rus va ingliz lug‘atlari kerak bo‘lganda yuklanadi; saqlangan til dastlabki renderdan oldin yuklanadi.
- Mehmon tanlovi uchun `bilify.locale` va qo‘lda tanlanganini bildiruvchi `bilify.locale.manual`. Brauzer storage’i bloklansa, joriy sahifada tanlov xotirada ishlaydi.
- Hisob tanlovi uchun `User.preferredLocale`, qo‘shimcha PostgreSQL migratsiyasi va profil API’sidagi tekshiriladigan yangilash maydoni.
- Sidebar/topbar, avatar menyusi, profil, parolni almashtirish, avatar/rasm dialoglari, dashboard, fanlar va dars/natija oynalarining asosiy interfeysi.
- 18 mashq turining ko‘rinadigan nomlari, mashq boshqaruvi, audio/nutq/koordinata ko‘rsatmalari va bildirishnoma panelining boshqaruv matnlari.
- `html.lang`, sahifa title/description, sana va raqam formatlari, ruscha kun/minut ko‘plik shakllari.
- `Accept-Language`, login/sessiya xatolarining barqaror kodlari va mahalliylashtirilgan API validatsiya xabarlari.
- Til almashganda profilning saqlanmagan qiymatlari, boshlangan mashq va uning drafti saqlanishini tekshiradigan testlar.

## Sahifalar ichidagi tarjimalar

- Admin: umumiy ko‘rsatkichlar, foydalanuvchilar, sinflar, kontent daraxti, gamifikatsiya, avatarlar, videolar, mashqlar katalogi va barcha muharrirlar.
- O‘qituvchi: sinflar, topshiriq yaratish, topshirilgan ishlar, mavzu va mashq turlari bo‘yicha tahlil.
- O‘quvchi: do‘stlar, sinfdoshlar, progress, nishonlar, reyting, topshiriqlar, bildirishnomalar, o‘yinlar va Brain Ring boshqaruvi.
- Jadvallar, filtrlar, bo‘sh holatlar, tugmalar, tanlovlar, forma ko‘rsatmalari va accessibility matnlari.
- Standart fan/kurs/mavzu/dars/video sarlavhalari, daraja, nishon va avatar nomlari. Muallif o‘zgartirgan yoki yangi kiritgan matn uchun asl qiymat saqlanadi.
- Avval bazada saqlangan tizim bildirishnomalari ham ko‘rsatishda tarjima qilinadi. Ism, email va o‘qituvchi kiritgan topshiriq nomi o‘z holicha qoladi.
- Backendning ma’lum biznes xatolari frontendda mahalliylashtiriladi; Zodning standart validatsiya xabarlari ham tanlangan tilga mos.
- Modul darajasida yaratilgan tanlovlar til almashganda yangilanadi. Xotira o‘yinidagi ochilgan kartalar va juftliklar saqlanadi. 320 px ekranda til tanlagich sig‘ishi tuzatildi.

Qolgan kontent ishlari:

- Yangi tizim bildirishnomalarini bazada matn o‘rniga hodisa kalitlari bilan saqlash va tarjima qilingan matnlar bo‘yicha server qidiruvi.
- Kontent tarjima jadvallari va admin tarjima muharriri; dars, savol, variant, hint, izoh va media matnlarining tekshirilgan rus/ingliz tarjimalari.
- Tarjima versiyalarini urinish snapshotlari bilan bog‘lash va Brain Ring kontenti tilini belgilash.

Hozirgi dars kontenti o‘zbekcha qoladi. Rus/ingliz interfeysida dars va fan yo‘li ochilganda bu haqda izoh beriladi. Mavjud javoblar va baholash mezonlari tarjima qilinmaydi.

Yakuniy interfeys tekshiruvi: lint, barcha typecheck va production build o‘tdi. 32 ta frontend unit test va 49 ta browser test o‘tdi (2026-10-09). Oldingi API bosqichida 58 ta backend testi o‘tgan; sahifa tarjimalari bosqichida backend logikasi o‘zgarmadi. 1 206 ta tarjima kaliti uch tilda bir xil; manbadagi 1 067 ta bevosita tarjima chaqirig‘ida yetishmayotgan kalit topilmadi. Til tanlash, boshqa qurilmada hisob tilini tiklash, 320 px mobil ko‘rinish, saqlanmagan profil qiymati va boshlangan mashq draftining til almashganda/refreshda saqlanishi tekshirildi. Admin, o‘qituvchi va o‘quvchining barcha asosiy sahifalari rus/ingliz rejimida browser test bilan tekshirildi; ruscha admin sahifasi vizual ko‘rikdan o‘tdi. Standart validatsiya tillari alohida chunkka ajratildi; asosiy production JS chunk 489 kB.

## Maqsad va hozirgi holat

O‘quvchi, o‘qituvchi va administrator platformadan tanlangan tilda foydalanadi. Interfeys, xabarlar va o‘quv kontenti tarjima qilinadi; til almashishi mavjud hisob, dars natijasi yoki XP uchun yangi yozuv yaratmaydi.

Reja tuzilishidan oldingi kod tekshiruvida aniqlangan holatlar:

- Frontendda i18n kutubxonasi yo‘q; 56 ta TSX fayl bor. Bu tarjima hajmi emas, tekshiriladigan interfeys doirasini bildiradi.
- `apps/web/index.html` hozir `lang="uz"` ishlatadi.
- `apps/web/src/lib/locale.ts` sana uchun o‘zbekcha oy va hafta kunlarini qo‘lda saqlaydi. Raqamlar ayrim sahifalarda brauzerning standart tili bilan formatlanadi.
- Navigatsiya, login, profil, forma validatsiyasi, dialoglar va accessibility matnlari komponentlar ichida yozilgan.
- Backendning exception filtri, validatsiyasi va xizmatlarida foydalanuvchiga ko‘rsatiladigan o‘zbekcha xabarlar mavjud.
- Fan, kurs, mavzu, dars, savol, javob varianti va bildirishnoma matnlari bazada bitta tilda saqlanadi.
- Mashqlarda `config`, `grading`, `feedback` va urinish boshlanganidagi `questionsSnapshot` bor. Tarjima ular bilan mos ishlashi kerak.
- Animatsion videolar ovozli o‘qishda `uz-UZ` ishlatadi; mashqning audio tili alohida `config.language` orqali belgilanadi. Hozir mashq DTO’sida `ru-RU` ruxsat etilmagan.

## Asosiy qarorlar

| Masala | Taklif qilinayotgan yechim |
|---|---|
| Frontend tarjimasi | `i18next` va `react-i18next`; matnlar mavzular bo‘yicha JSON lug‘atlarga chiqariladi. |
| Til tanlagich | Topbarda avatar yonida ixcham tanlagich; login, ro‘yxatdan o‘tish va parol tiklash sahifalarining yuqori qismida ham mavjud. Til nomlari o‘z yozuvida ko‘rsatiladi. |
| Boshlang‘ich til | Saqlangan tanlov bo‘lmasa `uz`. Birinchi versiyada brauzer tili tanlovni avtomatik almashtirmaydi. |
| Mehmonning tanlovi | `localStorage`dagi `bilify.locale`. Bu sozlama login tokenlariga bog‘liq emas. |
| Hisobning tanlovi | `User.preferredLocale` orqali bazada saqlanadi; boshqa qurilmada login qilinganda tiklanadi. Joriy qurilmada foydalanuvchi aniq tanlagan til login vaqtida yo‘qolmaydi. |
| Manzillar | `/login`, `/profile`, `/subjects` kabi mavjud yo‘llar saqlanadi; til uchun URL prefiksi talab qilinmaydi. |
| Yetishmayotgan tarjima | Vaqtinchalik o‘zbekcha matn ko‘rsatiladi. Dars uchun bu holat foydalanuvchiga bildiriladi; to‘liq uch tilli relizda kelishilgan kontent tarjimalari tugallangan bo‘lishi kerak. |
| Hisoblash | XP, reyting, streak, progress va javob tekshirish tilga bog‘liq bo‘lmaydi. Sana ko‘rinishi lokalizatsiya qilinadi, mavjud `Asia/Tashkent` vaqt qoidalari saqlanadi. |
| Foydalanuvchi yozgan matn | Ism, email, sinf nomi va foydalanuvchi kiritgan xabarlar avtomatik tarjima qilinmaydi. |

## Bosqichlar va yakunlash shartlari

| Bosqich | Ishlar | Tayyorlik sharti |
|---|---|---|
| 1. Matnlar ro‘yxati va terminlar | Sahifalar, komponentlar, validatsiya, API xabarlari, bildirishnomalar, kontent va media matnlarini ro‘yxatlash. Uch til uchun bir xil terminlarni kelishish. | Har bir tarjima qilinadigan qismning manbasi, kaliti va tekshirish mezoni ma’lum. |
| 2. Til infratuzilmasi | i18n sozlash, uch til resurslari, til tanlagich, saqlash va tiklash, `html.lang`, sahifa sarlavhasi va metadata. Hisob tili uchun xavfsiz qo‘shimcha migratsiya. | Login oldidan va keyin til almashadi, refreshdan keyin saqlanadi, eski hisoblar o‘zbekcha ishlaydi. |
| 3. Asosiy interfeys | Login, register, parol tiklash, sidebar, topbar, avatar menyusi, profil, dashboard, fanlar, dars oynasi, umumiy komponentlar va forma xabarlari. | O‘quvchining kirish → dars → natija yo‘li uch tilda ishlaydi. |
| 4. Qolgan interfeys va API | O‘qituvchi va admin panellari, do‘stlar, sinf, reyting, nishonlar, topshiriqlar, o‘yinlar, videolar, API xatolari va tizim bildirishnomalari. | Barcha rollarda odatiy, bo‘sh, yuklanish va xato holatlari tanlangan tilda chiqadi. |
| 5. O‘quv kontenti va media | Tarjima modellari, admin tarjima muharriri, fan/kurs/mavzu/dars/savol/variant/izoh/hint tarjimalari. Animatsiya matnlari va audio tilini moslashtirish. | Rus va ingliz kontenti mutaxassis tomonidan tekshirilgan; bir xil savolning natijasi har bir tilda bir xil. |
| 6. Tekshiruv va reliz | Tarjima to‘liqligi, testlar, mobil va desktop ko‘rinishlari, migratsiya, eski urinishlar va CI tekshiruvi. | Kelishilgan barcha sahifalar va kontent uch tilda tekshirilgan; lint, typecheck, test, build va GitHub Actions o‘tgan. |

Ketma-ketlik: 1 → 2 → 3 → 4 → 5 → 6. Kontent tarjimalarini tayyorlash 1-bosqichda boshlanadi; ular 5-bosqichda tizimga ulanadi.

## Frontend tuzilishi

Rejalashtirilgan yangi fayllar:

```text
apps/web/src/i18n/
  index.ts
  resources/
    uz/
    ru/
    en/
```

Har bir tilda `common`, `auth`, `navigation`, `student`, `teacher`, `admin`, `exercises`, `notifications` va `errors` lug‘atlari bo‘ladi. Fayl nomlari va tarjima kalitlari uch tilda bir xil bo‘ladi.

| Kalit | O‘zbekcha | Ruscha | Inglizcha |
|---|---|---|---|
| `auth.signIn` | Tizimga kirish | Войти | Sign in |
| `navigation.subjects` | Mening fanlarim | Мои предметы | My subjects |
| `profile.title` | Mening profilim | Мой профиль | My profile |
| `common.signOut` | Chiqish | Выйти | Sign out |

Matn ichidagi ism, son va mavzu kabi qiymatlar parametr orqali kiritiladi. Rus tilidagi birlik/ko‘plik shakllari alohida tekshiriladi. `aria-label`, placeholder, tooltip, loading, empty-state, error-state va dinamik Zod validatsiyasi ham shu tizimga o‘tadi. Til almashganda ochiq forma qiymatlari saqlanadi, xato matnlari qayta tarjima qilinadi.

`locale.ts` tanlangan til bilan sana, son va foizni formatlaydigan yagona kirish nuqtasiga aylanadi. `Intl.DateTimeFormat`da `timeZone: 'Asia/Tashkent'` aniq beriladi; til formatiga mos raqam ko‘rinishi bilan mashq javobining ichki qiymati farqlanadi.

## Backend xabarlari va bildirishnomalar

API tanlangan tilni `Accept-Language` orqali oladi, faqat `uz`, `ru`, `en`ni qabul qiladi. `ru-RU` va `en-US` kabi variantlar mos asosiy tilga keltiriladi; qiymat bo‘lmasa o‘zbekcha ishlaydi. Locale uzatilishi, proxy va CORS bilan ishlashi integration test orqali tekshiriladi.

Xatolarda barqaror `code`, zarur `params` va foydalanuvchiga ko‘rsatiladigan `message` beriladi. Masalan, `AUTH_INVALID_CREDENTIALS` har bir tilda bir xil identifikator bo‘ladi. Mavjud `statusCode`, `message` va forma maydonlari bilan moslik migratsiya davomida saqlanadi. Frontend xabarni kod orqali tarjima qiladi; hali ko‘chirilmagan xabarlar uchun mavjud `message` vaqtinchalik ishlaydi.

Yangi tizim bildirishnomalari hodisa kaliti va parametrlari bilan saqlanadi, ko‘rsatilayotganda foydalanuvchi tiliga aylantiriladi. Eski `title`/`body` yozuvlari o‘chirilmaydi; ular uchun mavjud matn zaxira sifatida ishlaydi. Bildirishnoma qidiruvi tanlangan tildagi ko‘rinadigan matnga moslashtiriladi. Administrator yozgan erkin xabarlar alohida muallif matni sifatida saqlanadi.

Tanlangan til tarjima qilinadigan ma’lumotlarning React Query kalitlariga kiradi. Til almashganda tegishli ma’lumot qayta olinadi. Keyinchalik HTTP cache qo‘llansa, uning kaliti ham locale’ni hisobga oladi.

## O‘quv kontenti va ma’lumotlar bazasi

Mavjud o‘zbekcha matn ustunlari migratsiya vaqtida asosiy manba va zaxira sifatida qoladi. Tarjimalar asosiy yozuvga bog‘langan alohida jadvallarda saqlanadi: masalan, `LessonTranslation` va `QuestionTranslation`. Har bir yozuv uchun `(entityId, locale)` yagona bo‘ladi.

Tarjima qatlamiga quyidagilar kiradi:

- Fan, kurs va mavzu nomlari hamda tavsiflari.
- Darsning nomi, tushuntirishi va misollari.
- Savol matni, variantlarning ko‘rinadigan matni, hint, xato sababi, yechim bosqichlari va misollar.
- Strukturali mashqlardagi item/target/slot matnlari, rasm izohlari va audio ko‘rsatmalari.
- Nishon, daraja, avatar va videolarning foydalanuvchiga ko‘rsatiladigan nomlari va tavsiflari.
- Animatsion videoning bo‘lim nomlari va matnlari; tashqi video uchun mavjud ovoz/subtitr tili haqidagi ma’lumot.

Admin muharririda uch til uchun bo‘limlar, tarjima tayyorligi va ko‘rib chiqish holati ko‘rsatiladi. Tarjima manba versiyasiga bog‘lanadi; asosiy savol o‘zgarsa, tegishli tarjima qayta tekshirishga belgilanadi. Seed ishlari mavjud tahrirlar va o‘quvchi natijalarini ustidan yozmaydi.

### Mashq natijalarini saqlash

- Savol, variant va strukturali mashq elementlarining ID/value qiymatlari tillar orasida barqaror qoladi. Tarjima ko‘rinadigan matnni o‘zgartiradi.
- Matnli javobning o‘zi tarjima talab qiladigan mashqlar uchun qabul qilinadigan javoblar har bir kontent tilida muallif tomonidan belgilanadi va tekshiriladi.
- Ingliz tili mashqida o‘rganilayotgan inglizcha so‘z, audio yoki to‘g‘ri javob interfeys ruscha bo‘lgani uchun rus tiliga almashtirilmaydi. Tarjima ko‘rsatma va tushuntirishga qo‘llanadi.
- Urinish boshlanganida kontent tili, tarjima versiyasi va tekshirish qoidalari snapshot bilan saqlanadi. Jarayonda interfeys tilini almashtirish boshlangan savolning shartini yoki javob mezonini almashtirmaydi.
- Eski urinishlar o‘zbekcha snapshot va eski feedback bilan davom etadi. Tugallangan natijalar qayta hisoblanmaydi.
- Brain Ring uchun bir o‘yinda savol kontenti tili oldindan belgilanadi va ikkala ishtirokchiga ko‘rsatiladi; ularning interfeys tillari turlicha bo‘lishi mumkin. Savollar va baholash ikkala ishtirokchi uchun bir xil bo‘ladi.
- `config.language` mashqning o‘rganilayotgan yoki audio tilini belgilaydi. Ruscha audio kerak bo‘ladigan kontent uchun DTOga `ru-RU` qo‘shiladi. Animatsion video tanlangan tarjima tilida o‘qiladi; brauzerda mos ovoz bo‘lmasa matn ko‘rinishi ishlaydi.

## Tekshirish mezonlari

| Yo‘nalish | Tekshiruv |
|---|---|
| Tarjima lug‘atlari | Kalitlar, parametrlar va ko‘plik shakllari mos; reliz doirasida yetishmayotgan kalit yo‘q. |
| Til tanlovi | Mehmon, login, refresh, logout va boshqa qurilmada tiklash senariylari. |
| Asosiy yo‘llar | Uch tilda login, profil, dars, natija va avatar orqali chiqish. |
| Rollar | O‘quvchi, o‘qituvchi va admin sahifalari uch tilda. |
| API | Autentifikatsiya, validatsiya, ruxsat, rate-limit va umumiy xatolar tanlangan tilda; kodlari barqaror. |
| Kontent | 18 mashq turi, kunlik challenge, o‘yinlar va Brain Ringda javob tekshirish bir xil natija beradi. |
| Davom ettirish | Boshlangan urinish, draft, feedback va snapshot sahifa yangilanganda buzilmaydi. |
| Ko‘rinish | Mobil/desktop va light/dark rejimda uzun ruscha matnlar kesilmaydi, forma va menyular sig‘adi. |
| Sana va raqamlar | Uch til formatlari, Toshkent yarim tuni, hafta chegarasi va raqamli javob kiritish. |
| CI | Mavjud o‘zbekcha browser testlar tili aniq belgilanadi; asosiy senariylar `uz`, `ru`, `en` bo‘yicha tekshiriladi. |

## Reliz ketma-ketligi

1. Til infratuzilmasi va asosiy interfeys uchun birinchi o‘zgarish to‘plami.
2. Qolgan interfeys, API xabarlari va bildirishnomalar uchun ikkinchi to‘plam.
3. Kontent tarjimalari, admin muharriri va migratsiyalar uchun uchinchi to‘plam.
4. Uch tilni to‘liq tekshirgan testlar va reliz tayyorligi uchun yakuniy to‘plam.

Har bir to‘plam alohida tekshiriladi. Butun platforma uch tilli deb e’lon qilinishi interfeys va kelishilgan o‘quv kontenti tekshiruvi tugaganidan keyin amalga oshiriladi. Aniq muddat va tarjima hajmi 1-bosqichdagi ro‘yxat hamda kontent muharriri ko‘rigi asosida belgilanadi.

## Texnik manbalar

- React komponentlari va til almashtirish: https://react.i18next.com/latest/usetranslation-hook
- Til va namespace bo‘yicha zaxira tarjima: https://www.i18next.com/principles/fallback
- Qo‘llab-quvvatlanadigan tillar va konfiguratsiya: https://www.i18next.com/overview/configuration-options
