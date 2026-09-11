# API Key navigation and client setup

The homepage and model details now take signed-in users to the platform API Keys page. Signed-out users go to platform sign-in with the Keys page as the return destination. Model details offer model ID copying, and Keys explain that one key can access multiple models available to the account.

Each key has a **Set up client** action on desktop and mobile:

- CC Switch imports a provider for Claude Code, Codex or Gemini CLI, with a selected or manually entered model. Claude mappings are optional.
- Cherry Studio imports a LinkInfra OpenAI-compatible provider.
- Chatbox and other compatible clients have field-by-field copying and manual setup instructions.

Import links are generated on click and passed to the local app. API keys remain hidden in the dialog. No backend changes or database migration are required. The server address must be configured, and native imports require the corresponding application to be installed.

Validation: production Next.js build and TypeScript pass; targeted lint passes; 11 catalog and client import tests pass. Browser checks cover desktop and 390px/320px mobile layout, copying, application switching, model loading failure/manual entry/retry, and inactive key handling. Native applications were not launched during automated checks; final import confirmation occurs in the user's client.
