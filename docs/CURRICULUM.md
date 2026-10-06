# OYLA grade-specific curriculum

The catalog contains **54 original lessons and 324 questions**: six lessons per subject for each of grades 5, 6, and 7. Every lesson has an objective, an Uzbek explanation, a worked example, four practice questions, and two challenge questions. Correct answers, explanations, hints where relevant, and question difficulty are stored in PostgreSQL and scored by the existing server engine.

| Grade | Mathematics                                                                                | English                                                                                                      | Informatics                                                                              |
| ----- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 5     | Place value, operation order, fractions, decimals, measurement, perimeter/area             | Pronouns, be, possessives, have got, plurals, daily routines                                                 | Information forms, devices, files/folders, keyboard, graphics, digital safety            |
| 6     | Fraction multiplication/division, ratios, signed numbers, percentage problems, coordinates | Past Simple, Present Continuous, countable nouns, comparisons, plans, directions                             | Text formatting, tables, sequential algorithms, block programming, search, presentations |
| 7     | Expressions, equations, powers, polynomial expansion, linear functions, triangles          | Present Perfect, Past Continuous, conditional sentences, relative clauses, obligation, reading comprehension | Binary numbers, bits/bytes, spreadsheet formulas, conditions, loops, source evaluation   |

The material is an independently authored MVP learning sequence, not a reproduction of a textbook or a claim to cover the entire current national annual syllabus. Topic orientation was checked against available official Eduportal textbook records: [grade 5 mathematics (2020)](https://old.eduportal.uz/Umumiyfiles/darsliklar/5/matematika_1qism_5_uzb.pdf), [grade 7 algebra (2017)](https://old.eduportal.uz/Umumiyfiles/darsliklar/7/algebra_7_uzb.pdf), [grade 6 English (2018)](https://old.eduportal.uz/Umumiyfiles/darsliklar/6/ingliz_tili_6_uzb.pdf), and [grade 6 informatics (2017)](https://old.eduportal.uz/Umumiyfiles/darsliklar/6/informatika_6_uzb.pdf). These are historical editions; catalog prose, worked examples, and questions are original. Full PDF fetches for two records were unavailable, so current-year official alignment is not asserted.

The bit/byte lesson distinguishes decimal and binary prefixes: one byte is eight bits, while KiB and kB differ. Reference: [NIST binary prefixes](https://physics.nist.gov/cuu/Units/binary.html).

## Safe catalog installation

Run `npm run db:seed` against the local development database. New lessons use deterministic versioned IDs. Repeated seeds add missing items without overwriting administrator edits or answer keys.

An old starter lesson is archived only if it exactly matches the original seed and has no attempt, daily-question snapshot, progress, or assignment reference. Referenced or edited lessons remain available, preserving results, XP, and existing assignments. The same protections apply to every grade. Consequently, an upgraded development database may have additional preserved starter lessons beyond the 54 catalog lessons; a fresh database contains the 54 grade-specific lessons.

Review and extend the material through the admin editor for a school-specific program. Source modules are under `apps/api/prisma/curriculum/`. Automated checks enforce lesson/question completeness, distinct grade sequences, answer-option integrity, representative independently calculated answers, and preservation rules. Browser tests verify grade visibility and the real answer → result → XP flow.
