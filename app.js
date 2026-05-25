FHIR.oauth2.ready().then(async (client) => {
  const patientEl = document.getElementById("patient");
  const obsEl = document.getElementById("observations");
  const noteEl = document.getElementById("note");
  const addendumEl = document.getElementById("addendum");
  const writeBtn = document.getElementById("write");
  const writeStatus = document.getElementById("writeStatus");

  let mostRecentDocRef = null;

  try {
    const patient = await client.patient.read();
    const name = patient.name?.[0];
    const display = name ? `${(name.given || []).join(" ")} ${name.family || ""}`.trim() : "(no name)";
    patientEl.innerHTML = `
      <strong>${display}</strong><br>
      ID: <code>${patient.id}</code> &middot;
      Gender: ${patient.gender || "—"} &middot;
      DOB: ${patient.birthDate || "—"}
    `;
  } catch (e) {
    patientEl.innerHTML = `<span class="err">Failed to load patient: ${e.message}</span>`;
  }

  try {
    const bundle = await client.request(
      `Observation?patient=${client.patient.id}&_sort=-date&_count=20`,
      { flat: true }
    );
    if (!bundle.length) {
      obsEl.textContent = "No observations found for this patient.";
    } else {
      const rows = bundle.map((o) => {
        const code = o.code?.text || o.code?.coding?.[0]?.display || o.code?.coding?.[0]?.code || "—";
        const value = o.valueQuantity
          ? `${o.valueQuantity.value} ${o.valueQuantity.unit || ""}`.trim()
          : o.valueString || o.valueCodeableConcept?.text || "—";
        const when = o.effectiveDateTime || o.issued || "—";
        return `<tr><td>${code}</td><td>${value}</td><td>${when}</td></tr>`;
      }).join("");
      obsEl.innerHTML = `<table>
        <thead><tr><th>Observation</th><th>Value</th><th>When</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    }
  } catch (e) {
    obsEl.innerHTML = `<span class="err">Failed to load observations: ${e.message}</span>`;
  }

  // Used by the addendum flow to point relatesTo at an existing note.
  try {
    const docs = await client.request(
      `DocumentReference?patient=${client.patient.id}&_sort=-date&_count=1`,
      { flat: true }
    );
    mostRecentDocRef = docs[0] || null;
  } catch {
    mostRecentDocRef = null;
  }

  writeBtn.addEventListener("click", async () => {
    const text = noteEl.value.trim();
    if (!text) {
      writeStatus.innerHTML = `<span class="err">Enter some note text first.</span>`;
      return;
    }
    writeBtn.disabled = true;
    writeStatus.textContent = "Writing...";

    const docRef = {
      resourceType: "DocumentReference",
      status: "current",
      docStatus: "final",
      type: {
        coding: [{ system: "http://loinc.org", code: "11506-3", display: "Progress note" }],
        text: "Progress note"
      },
      subject: { reference: `Patient/${client.patient.id}` },
      date: new Date().toISOString(),
      content: [{
        attachment: {
          contentType: "text/plain",
          data: btoa(unescape(encodeURIComponent(text)))
        }
      }]
    };

    if (addendumEl.checked && mostRecentDocRef) {
      docRef.relatesTo = [{
        code: "appends",
        target: { reference: `DocumentReference/${mostRecentDocRef.id}` }
      }];
    }

    try {
      const created = await client.create(docRef);
      const linkBase = client.state.serverUrl.replace(/\/$/, "");
      writeStatus.innerHTML = `<span class="ok">Wrote DocumentReference/${created.id}</span> &middot;
        <a href="${linkBase}/DocumentReference/${created.id}" target="_blank" rel="noopener">view on server</a>`;
      noteEl.value = "";
    } catch (e) {
      writeStatus.innerHTML = `<span class="err">Write failed: ${e.message}</span>`;
    } finally {
      writeBtn.disabled = false;
    }
  });
}).catch((e) => {
  document.body.insertAdjacentHTML("beforeend",
    `<p class="err">SMART launch failed: ${e.message}</p>`);
});
