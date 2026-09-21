# Guidance discussions and transformations

Implemented in the development codebase; live acceptance is tracked in BACKLOG.md.

Open a completed guidance card. **Discuss with AI** opens a GPT Live 1 discussion
grounded in the selected card, not sibling cards or unrelated memories. Microphone
access starts only with **Start voice**. The original Interactive Mode remains
available from the dashboard. Neither voice flow authorizes research or email.

**Transform To** supports Article, Brief/Meeting Notes, Business/Work Notes,
MP3, Infographic and Custom. Help icons work on hover and keyboard focus.
Luna prepares short formats; Terra handles articles/custom writing via OpenRouter.
Media uses the existing backend OpenAI key with `gpt-4o-mini-tts` and `gpt-image-2`.
No credentials are exposed to the browser.

The Workflow component runs preparation and rendering without automatic paid
retries. Records live in guidanceTransformations; files live in Convex storage.
Owner-scoped history is paginated. Reopening the card restores saved outputs.
Text and genuine Word (.docx) downloads are available. Deleting a transformation
deletes its stored files without deleting the original guidance. Application JSON
export includes transformation records; media files are downloaded separately.

MP3 preparation is limited to 180 words, and generated audio duration is checked:
unknown duration or anything above 120 seconds is rejected. Images include an
AI-generated notice. Review all outputs before sharing.

Daily media attempt limits reset at midnight UTC: Free 1 MP3 and 1 infographic;
Premium 3 each; Premium Plus 5 each. Deletion does not restore allowance.
Failed admitted attempts may count. Global safety limits apply. Text transformations
use the existing tier's light/heavy AI allowance. These are not provider dollar caps.

## Acceptance still needed

- Real OpenRouter-to-export workflow; actual TTS duration and image output.
- Browser download/delete, nested dialog focus, small-screen scrolling.
- Both voice entry points: microphone, audible reply, interruption, Stop and hangup.
- Deletion/retention lifecycle and provider-usage reconciliation before public launch.
