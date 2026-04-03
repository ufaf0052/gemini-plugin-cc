# Changelog

## [1.0.1] - 2026-04-03

### Fixed

- **Review schema mismatch**: Inline the full JSON schema into the adversarial-review prompt via `{{OUTPUT_SCHEMA}}` placeholder. Previously the prompt said "matching the provided schema" but never included it, causing Gemini to return non-conforming field names (e.g. `assessment` instead of `verdict`).
- Wire existing dead code (`readOutputSchema`, `REVIEW_SCHEMA`) into `buildAdversarialReviewPrompt()` so the schema is actually injected at runtime.

## [1.0.0] - 2026-03-28

### Added

- Initial release: review, adversarial-review, rescue, setup, status, result, cancel commands.
- Background job tracking with status/result/cancel lifecycle.
- Stop-time review gate hook.
- Structured prompt engineering framework (XML blocks, recipes, anti-patterns).
