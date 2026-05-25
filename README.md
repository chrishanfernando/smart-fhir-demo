# Heidi SMART on FHIR demo

A ~100-line SMART on FHIR app that launches inside a sandbox EHR, reads the patient and their recent observations, and writes a clinical note (`DocumentReference`) back — either as a new note or as an addendum to the most recent one.

Built against the public [SMART Health IT sandbox](https://launch.smarthealthit.org). No backend, no build step — single page app served as static files.

## Why this exists

Built as an artefact for a Product Manager (Integrations) application at [Heidi](https://heidihealth.com). The JD calls out:

- **SMART on FHIR launches inside the chart** — this app does exactly that.
- **Structured write-back into Epic, Cerner, Athena…** — most demos read; this one writes.
- **Addendum vs edit** — the write-back flow surfaces this explicitly via `DocumentReference.relatesTo.code = appends`, which is the FHIR mechanism for the addendum conversation.

The goal is not to be production code — it's to demonstrate working knowledge of the SMART launch flow, scopes, the FHIR resources that matter for an ambient scribe (Patient, Observation, DocumentReference), and the addendum-vs-edit distinction.

## Run it

1. Host the three files (`launch.html`, `index.html`, `app.js`) somewhere public. Easiest is GitHub Pages — push this repo and enable Pages on `main` / root.
2. Open the SMART App Launcher: <https://launch.smarthealthit.org>
3. Pick **Provider EHR Launch**, FHIR version **R4**, leave the rest default.
4. In **App Launch URL**, paste your hosted `launch.html` URL.
5. Click **Launch**. Pick a patient and a provider when prompted.
6. After auth, you'll see Patient + Observations, plus a textarea to write a note back.

To run locally:

```bash
npx http-server -p 8080
# then use http://localhost:8080/launch.html as your App Launch URL
```

(The sandbox can reach `localhost` because the redirect happens in your browser.)

## Files

| File | What it does |
| --- | --- |
| `launch.html` | Initiates the SMART OAuth flow via `FHIR.oauth2.authorize(...)`. Requests `patient/Patient.read`, `patient/Observation.read`, `patient/DocumentReference.write`. |
| `index.html` | Post-auth landing page. Renders patient header, observations table, and the write-back form. |
| `app.js` | Calls `FHIR.oauth2.ready()` to get a client, fetches resources, and posts the `DocumentReference`. |

## The addendum-vs-edit bit

When the "addendum" checkbox is ticked, the new `DocumentReference` is created with:

```json
"relatesTo": [{
  "code": "appends",
  "target": { "reference": "DocumentReference/<previous-id>" }
}]
```

This is the FHIR-canonical way to say "this note appends the previous one" rather than replacing it (`replaces`) or transforming it (`transforms`). Different EHRs interpret these codes differently in their UIs (Cerner's addendum behaviour is the classic example), which is exactly the kind of EMR-reality-vs-spec gap a platform PM needs to be able to reason about.

## What this deliberately doesn't do

- No backend — the sandbox lets you use a public client, so there's no token exchange to protect.
- No production EHR vendor quirks — that's the whole point of the sandbox; this is the spec-clean baseline you'd then layer Epic/Cerner/Athena-specific handling on top of.
- No FHIR resource validation beyond what the server enforces.

## Stack

- [fhirclient.js](https://github.com/smart-on-fhir/client-js) (the official SMART client library) — handles the OAuth dance and gives you a typed-ish client for FHIR requests.
- Vanilla HTML/CSS/JS. No framework.

## Licence

MIT.
