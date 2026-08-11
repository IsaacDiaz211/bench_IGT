# Prompt Versions

These templates are the versioned prompt contract used by the benchmark.

- `app-compatible/` mirrors the translation, gloss, grammar and system prompts
  consumed by the mobile app.
- `judges/` contains the prompts used to score valid candidate outputs.
- `VERSION` identifies the prompt set stored in each run manifest.

Keep dynamic values as `{{UPPER_SNAKE_CASE}}` placeholders. Do not put API keys
or generated responses in this directory.
