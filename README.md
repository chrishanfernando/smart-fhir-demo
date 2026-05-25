# SMART on FHIR demo

A ~100-line SMART on FHIR app that launches inside a sandbox EHR, reads the patient and their recent observations, and writes a clinical note (`DocumentReference`) back — either as a new note or as an addendum to the most recent one.

Built against the public [SMART Health IT sandbox](https://launch.smarthealthit.org). No backend, no build step — single page app served as static files.

## Why this exists

A working reference for the parts of SMART on FHIR that matter for ambient clinical apps: the launch + OAuth flow, the FHIR resources a scribe-style product actually touches (Patient, Observation, DocumentReference), and the addendum-vs-edit distinction that EHRs handle differently in the wild.

Most public SMART demos only read. This one also writes back, which is where the interesting integration questions live.

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

This is the FHIR-canonical way to say "this note appends the previous one" rather than replacing it (`replaces`) or transforming it (`transforms`). Different EHRs interpret these codes differently in their UIs (Cerner's addendum behaviour is the classic example), which is exactly the kind of EMR-reality-vs-spec gap a real integration has to deal with.

## What this deliberately doesn't do

- No backend — the sandbox lets you use a public client, so there's no token exchange to protect.
- No production EHR vendor quirks — that's the whole point of the sandbox; this is the spec-clean baseline you'd then layer Epic / Cerner / Athena-specific handling on top of.
- No FHIR resource validation beyond what the server enforces.

## Stack

- [fhirclient.js](https://github.com/smart-on-fhir/client-js) (the official SMART client library) — handles the OAuth dance and gives you a typed-ish client for FHIR requests.
- Vanilla HTML / CSS / JS. No framework.

## Licence

MIT.
