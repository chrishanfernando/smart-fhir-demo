# SMART on FHIR demo

A ~100-line SMART on FHIR app that launches inside a sandbox EHR, reads the patient and their recent observations, and writes a clinical note (`DocumentReference`) back — either as a new note or as an addendum to the most recent one.

Built against the public [SMART Health IT sandbox](https://launch.smarthealthit.org). No backend, no build step — single-page app served as static files.

## Why this exists

A working reference for the parts of SMART on FHIR that matter for ambient clinical apps: the launch + OAuth flow, the FHIR resources a scribe-style product actually touches (`Patient`, `Observation`, `DocumentReference`), and the addendum-vs-edit distinction that EHRs handle differently in the wild.

Most public SMART demos only read. This one also writes back, which is where the interesting integration questions live.

## Architecture

```mermaid
flowchart LR
    user(["Clinician<br/>browser"])

    subgraph pages["GitHub Pages (this repo)"]
        launch["launch.html"]
        index["index.html + app.js"]
    end

    subgraph sandbox["SMART Health IT sandbox"]
        launcher["Launcher<br/>launch.smarthealthit.org"]
        auth["OAuth 2.0<br/>authorize + token"]
        fhir[("FHIR R4 server<br/>Patient · Observation<br/>DocumentReference")]
    end

    user -->|1. Open launcher| launcher
    launcher -->|2. Redirect to app| launch
    launch -->|3. Authorize| auth
    auth -->|4. Redirect with code| index
    index <-->|5. Read + Write| fhir
```

Only three files run in the browser. Everything on the right (launcher, auth server, FHIR server) is the sandbox simulating what a real EHR would expose. In production this same app would point at Epic / Cerner / Athena's SMART endpoints instead.

## Run it

1. Host the three files (`launch.html`, `index.html`, `app.js`) on any static host. GitHub Pages on `main` / root works out of the box.
2. Open the SMART App Launcher: <https://launch.smarthealthit.org>
3. Pick **Provider EHR Launch**, FHIR version **R4**, leave the rest default.
4. In **App Launch URL**, paste your hosted `launch.html` URL.
5. Click **Launch**. Pick a patient and a provider when prompted.
6. After auth, you'll see Patient + Observations, plus a textarea to write a note back.

## Files

| File | What it does |
| --- | --- |
| `launch.html` | Initiates the SMART OAuth flow via `FHIR.oauth2.authorize(...)`. Requests `patient/Patient.read`, `patient/Observation.read`, `patient/DocumentReference.write`. |
| `index.html` | Post-auth landing page. Renders patient header, observations table, and the write-back form. |
| `app.js` | Calls `FHIR.oauth2.ready()` to get a client, fetches resources, and posts the `DocumentReference`. |

## Launch flow

What actually happens between clicking Launch and seeing the patient data, with every redirect spelled out:

```mermaid
sequenceDiagram
    actor U as Clinician
    participant L as Sandbox launcher
    participant App as App (GitHub Pages)
    participant A as Sandbox auth + FHIR

    U->>L: Open launcher, paste launch.html URL, click Launch
    L->>App: GET launch.html?iss=...&launch=...
    Note over App: launch.html runs<br/>FHIR.oauth2.authorize(...)
    App->>A: Redirect /authorize<br/>(client_id, scope, redirect_uri=index.html)
    A->>U: Pick patient + provider, approve scopes
    A->>App: Redirect index.html?code=...&state=...
    Note over App: app.js runs<br/>FHIR.oauth2.ready()
    App->>A: POST /token (exchange code)
    A-->>App: access_token + patient context
    App->>A: GET Patient/{id}
    A-->>App: Patient resource
    App->>A: GET Observation?patient={id}&_sort=-date&_count=20
    A-->>App: Bundle of observations
    U->>App: Type note, click Write
    App->>A: POST DocumentReference<br/>(optional relatesTo.code=appends)
    A-->>App: 201 Created
```

The two HTML files exist because SMART splits the flow in two: `launch.html` only fires `authorize()`; the browser then bounces through the auth server and lands on `index.html`, where `ready()` completes the token exchange and hands back a client. `fhirclient.js` persists the in-between state in `sessionStorage`.

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
