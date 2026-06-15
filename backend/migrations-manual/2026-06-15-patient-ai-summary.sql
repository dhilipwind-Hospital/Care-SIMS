-- AI feature 2: cached patient history summary on the Patient row so the
-- consultation page can show it instantly without a Gemini call every
-- visit. Doctor refreshes explicitly when they want a regeneration.
--
-- Safe to re-run.

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS ai_history_summary     TEXT,
  ADD COLUMN IF NOT EXISTS ai_history_summary_at  TIMESTAMP;
