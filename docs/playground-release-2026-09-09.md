# Playground and user email display

- Playground loads configured, enabled models for the current user's group from `/api/playground/models`, proxied to backend `/api/user/models`. The built-in channel editor catalog remains unchanged.
- Settings are grouped into connection, system prompt, generation, and images. Desktop headers remain visible while settings scroll. Mobile settings use a drawer.
- Model menus fit the viewport, keep search visible while scrolling, and wrap long names. The composer accounts for the dashboard header and mobile safe areas.
- User lists read fresh data and display `No email linked` for missing emails. Existing email values are displayed, with the full address available on hover on desktop. Historical emails discarded by the old registration endpoint cannot be reconstructed; users must verify and link an email again.

Validation: TypeScript, targeted Next.js lint, and an isolated production `next build` pass (existing warnings only). Playwright checked 1440px desktop and 390px/320px mobile with mocked models and API keys: dropdown bounds, search, model selection, drawer closing, composer visibility, no horizontal overflow or page errors. Backend regression tests cover configured models and registered email visibility in list/search responses.

Deployment: publish backend v0.1.18 before the frontend, since the new available-models endpoint is required. No database migration is needed.
