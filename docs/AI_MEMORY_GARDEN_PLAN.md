# Bilim bog‘i: avtomatik Gemini karta to‘plamlari

Sana: 2026-yil 10-oktabr. Holat: dastlabki ishlaydigan versiya.

## Ishlaydigan oqim

`/games/memory` endi serverdagi raund bilan ishlaydi. O‘quvchi ingliz tili, matematika yoki informatika fanini tanlaydi; sinf ro‘yxatdan o‘tgan profilidan olinadi. To‘rtta, beshta va oltita juftlikli 1–3-bosqichlar ketma-ket ochiladi. Bosqich shu sinf doirasida qoladi; 3-bosqichdan keyin shu qiyinlikdagi yangi variantlar beriladi. O‘quvchi ochilgan bosqichni qayta o‘ynashi mumkin; ko‘p urinishdan keyin bu tavsiya qilinadi. Natija sahifa yangilanganda saqlanadi, ammo XP va reytingga ta’sir qilmaydi.

Raund boshlanganda API keyingi bosqich havzasini tekshiradi va Gemini fon ishini navbatga qo‘yadi. Model javobini bola kutmaydi. `MemoryGenerationJob` PostgreSQL’da saqlanadi; bir sinf/fan/bosqich uchun bitta ish yuradi, ishchi qayta ishga tushganda to‘xtab qolgan ishni oladi. Gemini ishlamasa, kodda tayyorlangan to‘plam bazaga yozilib o‘ynaladi. Bir to‘plam ko‘p bolaga xizmat qiladi; o‘quvchiga yaqinda ko‘rmagan variant tanlanadi.

Model har sinf, fan va bosqichning o‘quv maqsadiga mos **yangi juftlik matnlarini** yaratadi. Server karta soni, uzunligi, bir to‘plamdagi bir xil yorliqlar va oxirgi 12 to‘plamga o‘xshashlikni tekshiradi; avvalgi to‘plamdagi bittadan ortiq chap karta takrorlansa, natijani qabul qilmaydi. So‘ng alohida Gemini chaqiruvi juftliklarning to‘g‘riligi, tarjimasi, bir ma’noliligi, yoshga mosligi va qiyinligini tekshiradi. Faqat ikkala tekshiruvdan o‘tgan to‘plam `READY` bo‘ladi. Tekshiruv xato javob ehtimolini kamaytiradi, lekin uni nolga tushirmaydi; bola xabar yuborishi, admin esa AI to‘plamini arxivlashi mumkin.

Oldingi AI versiyasi kichik tasdiqlangan bankdagi kartalarni qayta tartiblab, deyarli bir xil to‘plamlar bergan. `20261010150000_memory_garden_fresh_content` migratsiyasi o‘sha AI to‘plamlarini arxivlaydi; tarixiy raundlar saqlanadi. Tasdiqlangan bank endi faqat Gemini kechiksa yoki xato bersa ishlatiladigan zaxira manbadir. Faol havza 12 to‘plam bilan cheklanadi: o‘quvchi ularni ko‘rib bo‘lganda yangi variant navbatga qo‘yiladi va eng eski AI varianti arxivlanadi.

## O‘yin va boshqaruv

- `POST /memory/rounds` raundni boshlaydi yoki faol raundni qaytaradi. So‘rovdagi ixtiyoriy `stage` faqat avval ochilgan bosqichni takrorlashga ruxsat beradi. `POST /memory/rounds/:id/guesses` ikki karta IDsi va takroriy yuborishni ajratadigan `requestId` oladi. Juftlik kalitlari brauzerga berilmaydi; server moslik, urinish va yakunni hisoblaydi.
- `POST /memory/rounds/:id/report` orqali bola xato kartalar haqida xabar beradi. Admin `/admin/memory` sahifasida xabarlar, tayyor to‘plamlar va fon ishlarini ko‘radi; AI to‘plamini olib tashlashi va generatsiyani to‘xtatishi mumkin. Har to‘plam uchun admin tasdig‘i talab qilinmaydi.
- `GEMINI_API_KEY` faqat API serverida saqlanadi. `GEMINI_MODEL` va `MEMORY_AI_DAILY_LIMIT` sozlanadi; limit so‘nggi 24 soatdagi API chaqiruvlarini cheklaydi. Bitta yangi to‘plam uchun yaratish va mustaqil tekshirish sabab odatda ikki chaqiruv ketadi. Noto‘g‘ri javob yoki vaqtinchalik xatodan so‘ng ish cheklangan marta qayta bajariladi. Kalit bo‘lmasa, zaxira to‘plamlar bilan o‘yin ishlayveradi.
- Kartalardagi matnlar hozir o‘zbek tilida. Rus va ingliz interfeysida shu haqda bildirishnoma ko‘rsatiladi. Rasm/audio kartalar va boshqa mavzular keyingi kontent kengayishi hisoblanadi.

## Ma’lumotlar modeli

`MemoryDeck` to‘plam va juftliklar JSON nusxasini, `MemoryGenerationJob` fon ishini, `MemoryRound` kartalar tartibi/urinishlarni, `MemoryGuess` takroriy so‘rov kalitini, `MemoryProgress` o‘quvchi bosqichini, `MemoryReport` xato xabarini, `MemorySetting` esa AI yoqilganini saqlaydi. Nashr qilingan to‘plam o‘zgartirilmaydi; xato topilsa arxivlanadi. Migratsiyalar: `20261010120000_memory_garden_ai`, `20261010130000_memory_reports`, `20261010140000_memory_setting`, `20261010150000_memory_garden_fresh_content`.

## Chegaralar va keyingi ish

- AI yangi matn yaratadi va boshqa AI chaqiruvi uni tekshiradi. Ikkalasi ham xato qilishi mumkin; fan mutaxassisi tomonidan tanlama audit va xato xabarlari monitoringi zarur. Rasm va audio kartalar hali yo‘q.
- Uch bosqichdan so‘ng qiyinlik oshmaydi. Keyingi mavzuga o‘tish, xatolar turiga qarab shaxsiy mashq tanlash va ko‘proq tushuncha banklari keyingi o‘quv mazmuni ishidir.
- Kunlik so‘rov limiti bor; token va pul bo‘yicha alohida hisoblagich hozir yo‘q. Ishlab chiqarishda Google AI Studio kvota/xarajat kuzatuvi ham yoqilishi kerak.
- Gemini xato yoki kvota sabab javob bermasa, o‘yin to‘xtamaydi, ammo vaqtincha cheklangan zaxira bank kartalari takrorlanishi mumkin. Juda tez tugagan raund uchun fon generatsiyasi hali bitmagan bo‘lishi ham mumkin.

Mahalliy tekshiruv: Prisma migratsiyalari, TypeScript typecheck, API testlari, haqiqiy brauzerda raund/progress/yangilash/idempotent taxmin, hamda sozlangan kalit bilan Gemini fon ishining `DONE` holati tekshirildi. 6-sinf ingliz tili 3-bosqichida V2 orqali yaratilgan ketma-ket ikki to‘plamning oltitadan chap kartasi o‘zaro takrorlanmadi.

Manbalar: [Google GenAI SDK](https://ai.google.dev/gemini-api/docs/libraries), [strukturali JSON chiqishi](https://ai.google.dev/gemini-api/docs/structured-output), [Gemini thinking sozlamasi](https://ai.google.dev/gemini-api/docs/thinking), [rate limitlar](https://ai.google.dev/gemini-api/docs/rate-limits), [kalit xavfsizligi](https://ai.google.dev/gemini-api/docs/api-key).
