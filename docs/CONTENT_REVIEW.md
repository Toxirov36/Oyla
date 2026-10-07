# OYLA content review — 7 October 2026

Reviewed the original MVP catalog of **54 lessons and 324 questions**: grades 5–7, mathematics, English and informatics. Checked objectives, lesson explanations, worked examples, prompts, answer keys, options, units and the server grading contract. This is a correctness/clarity review of the MVP sequence, not a current national annual syllabus certification or educator sign-off.

## Corrections

| Area                                                 | Finding                                                                                           | Applied clarification                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Grade 5 mathematics, perimeter/area                  | Three prompts described a generic quadrilateral even though the rectangle formulas were intended. | Specify a rectangle, side lengths in metres, and square metres for area. Keys remain 24, 8 and 24.            |
| Grade 5 mathematics, worked example                  | `yuz` used ambiguously in the floor-covering explanation.                                         | Use `yuza`.                                                                                                   |
| Grade 6 English, Present Continuous                  | A declarative question could also be conversationally valid.                                      | Require the question beginning with `Are`.                                                                    |
| Grade 6 English, some/any                            | The unrestricted gap permitted many words; `a water` can describe a serving in some contexts.     | Restrict the gap to some/any and the offer to uncountable water with some.                                    |
| Grade 7 English, Present Perfect and Past Continuous | Gap prompts could fit another tense or verb.                                                      | Explicitly request have/has or was/were in the named tense.                                                   |
| Grade 7 English, Past Continuous explanation         | A sentence about an interrupted action was incomplete.                                            | Correct the Uzbek wording.                                                                                    |
| Grade 7 English, relative clauses                    | A gap allowed additional grammatical preposition phrases beyond the configured key.               | Explicitly request one of who/which/where; previously accepted `in which` remains accepted for compatibility. |
| Grade 6 informatics, formatting                      | General editing does not always require selection.                                                | Ask specifically about making an existing text selection bold.                                                |
| Grade 7 informatics, conditional algorithms          | An equivalent description could be marked wrong.                                                  | Accept both `shartli` and `tarmoqlanuvchi`.                                                                   |

The manifest contains **11 question corrections and two lesson-text corrections**. No multiple-choice option, reward or earlier accepted answer is removed. Numeric answer keys were correct; no scoring recalculation was needed.

## Verification

The curriculum tests check all 324 keys against the actual grader, valid boolean/numeric keys, unique choices, complete explanations and distinct grade sequences. Every numerical question has an independent worked calculation: arithmetic, decimal measurements, areas/perimeters, ratios/percentages, signed values, equations/powers/functions/angles, binary conversions, bit/byte units, tables, conditional paths, loops and the reading-club duration. Fraction answers are checked against independent rational values, with separate binary arithmetic checks. An additional regression test verifies that each correction matches the catalog, preserves previous accepted keys and refuses original-fingerprint matching after administrator changes.

Grammar checks used [British Council Present Perfect](https://learnenglishkids.britishcouncil.org/grammar-vocabulary/grammar-practice/present-perfect-experiences) and [British Council some/any](https://learnenglishteens.britishcouncil.org/grammar/a1-a2-grammar/some-any-every-no). The bit/byte and binary-prefix distinctions were verified with [NIST binary prefixes](https://physics.nist.gov/cuu/Units/binary.html). Source prose and questions remain original; the reference pages are not reproduced.

## Existing databases

`curriculum/reviewed-corrections.ts` stores exact original and revised fingerprints. `applyReviewedCorrections` locks each question and updates only unchanged published catalog rows with original options, difficulty, hint, tolerance and reward settings. Administrator edits are preserved. Questions used in a recent active attempt are deferred. Lesson text updates also require the exact original published lesson fields and defaults. Repeated seeds report already-current records without rewriting them.

Applied to the local `oyla` database on port 5432: **13 corrected, zero preserved/deferred**. A second application reported **zero corrected, 13 current**. Attempt/progress counts and the XP ledger count/sum were identical before and after. Completed attempt snapshots, submitted answers, assignments and progress are never recomputed by the correction routine.

Before a school rollout, an educator should map the six lessons per subject/grade to the school's current program, add missing annual topics and pilot wording with students. Administrator-authored content and preserved legacy lessons require their own review; the 54/324 review count describes the versioned MVP catalog only.
