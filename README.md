# Preamble — South Africa 2026 local elections

The Preamble website for South Africa's 4 November 2026 local government elections.

- **2026 Results** (`index.html`): national vote, ward map, who won each council, results by municipality, live refresh.
- **Coalitions Tracker** (`coalitions.html`): coverage of the coalition talks from South African and international outlets, grouped into stories with AI-written summaries and links to every original, plus what key journalists and politicians are saying.
- **Mayors** (`mayors.html`): every mayor of the eight metros, with a timeline.

Static site, no build step. Hosted on Netlify from this repository; every push to `main` goes live.

## Updating
- Coalitions Tracker stories, people and coverage: `data/coalition-feed.json`
- Results data: `data/`
- Sign-ups: `js/signup.js` (`SIGNUP_URL`) and `google-apps-script/signup.gs`

## Data
- Results: IEC certified results.
- Boundaries: Municipal Demarcation Board.
