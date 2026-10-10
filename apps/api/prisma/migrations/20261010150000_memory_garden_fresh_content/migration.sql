-- V1 AI decks only rearranged the small curated bank and repeated most cards.
-- Keep their historical rounds intact, but serve newly generated V2 content instead.
UPDATE "MemoryDeck"
SET "status" = 'ARCHIVED', "updatedAt" = CURRENT_TIMESTAMP
WHERE "source" = 'GEMINI' AND "promptVersion" = 1 AND "status" = 'READY';
