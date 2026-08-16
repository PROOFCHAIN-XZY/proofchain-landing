/*
 * ProofChain landing page behaviour.
 *
 * Three small things, no dependencies: the pipeline stepper, the verification
 * command tabs, and copy-to-clipboard. Content lives in data below so the
 * markup stays readable and the copy stays in one place.
 */

/* ── Content ───────────────────────────────────────────────────────── */

const TX = '3fb0f496f209507098e6439c646a60d6a576de856a28afbb4f44598b77dc512f';

const PIPELINE = [
  {
    name: 'Capture',
    where: 'apps/capture · apps/mobile',
    image: {
      src: 'plate-weighin',
      w: 262,
      h: 288,
      alt: 'A collector at a platform scale with a bagged load of PET, holding a handheld device.',
      caption: 'The moment the record is made, and the only point in the chain with a physical referent.',
    },
    lead: 'The collector photographs a weigh-in. The device builds a canonical payload and signs it with an ed25519 key that has never left the phone.',
    body: 'Canonical encoding — deterministic JSON, fixed field order — is shared by every signer so the signature is verifiable anywhere. With no signal the event queues in IndexedDB and drains on reconnect.',
    tags: ['ed25519', 'canonical JSON', 'IndexedDB queue', 'offline-first'],
    file: 'weigh-in.payload.json',
    code: `{
  <span class="c-key">"schema"</span>: <span class="c-str">"proofchain.weighin.v1"</span>,
  <span class="c-key">"collectorId"</span>: <span class="c-str">"c8f1…a204"</span>,
  <span class="c-key">"hubId"</span>: <span class="c-str">"nairobi-pilot"</span>,
  <span class="c-key">"deviceId"</span>: <span class="c-str">"d31b…77e0"</span>,
  <span class="c-key">"weightKg"</span>: <span class="c-num">14.280</span>,
  <span class="c-key">"material"</span>: <span class="c-str">"PET"</span>,
  <span class="c-key">"lat"</span>: <span class="c-num">-1.286389</span>,
  <span class="c-key">"lng"</span>: <span class="c-num">36.817223</span>,
  <span class="c-key">"capturedAt"</span>: <span class="c-str">"2026-08-10T09:14:22.108Z"</span>,
  <span class="c-key">"photoHash"</span>: <span class="c-str">"9f2c…b17d"</span>,
  <span class="c-key">"nonce"</span>: <span class="c-str">"0a7e41c9d5b83f26"</span>
}

<span class="c-dim">signature (base64, ed25519)</span>
<span class="c-str">MEUCIQDf9k…8Qw==</span>  <span class="c-dim">← key stays on device</span>`,
  },
  {
    name: 'Ingest',
    where: 'POST /events',
    lead: 'The server verifies the signature against the enrolled public key, then hashes the canonical payload.',
    body: 'The payload hash carries a UNIQUE constraint in Postgres, so a replay is rejected at the database layer even if it wins a race against the duplicate check. Changing the nonce means re-signing — and the attacker does not hold the key.',
    tags: ['signature verify', 'sha256 payload hash', 'UNIQUE replay guard'],
    file: 'ingest.log',
    code: `<span class="c-dim">POST</span> <span class="c-cmd">/events</span>  <span class="c-dim">→</span> <span class="c-ok">201 Created</span>

payloadHash  <span class="c-str">4c1f9ad0…e88b</span>
signature    <span class="c-ok">valid</span>  <span class="c-dim">(device d31b…77e0)</span>
receivedAt   <span class="c-str">2026-08-10T09:14:22.407Z</span>
clock delta  <span class="c-num">+0.299s</span>  <span class="c-dim">(tolerance ±15s)</span>

<span class="c-dim">replay attempt, same payload</span>
<span class="c-dim">POST</span> <span class="c-cmd">/events</span>  <span class="c-dim">→</span> <span class="c-bad">409 Conflict</span>  duplicate payloadHash`,
  },
  {
    name: 'Integrity',
    where: 'events/integrity.ts',
    image: {
      src: 'stage-integrity',
      w: 193,
      h: 250,
      alt: 'A worker in a hi-vis vest entering a reading on a handheld device beside a bagged load of PET.',
      caption:
        'What the checks are about. Five of the seven examine this moment — the device, the place, the weight, the clock, the photograph.',
    },
    lead: 'Seven pure checks run at ingest. Any failure quarantines the event permanently — it can never enter a batch.',
    body: 'The verdict is written once and never revised, so the audit trail records what we knew at the moment of receipt rather than a later reinterpretation.',
    tags: ['7 checks', 'quarantine on fail', 'verdict frozen at ingest'],
    file: 'integrity.verdict.json',
    code: `{
  <span class="c-key">"outcome"</span>: <span class="c-str">"pass"</span>,
  <span class="c-key">"findings"</span>: [
    { <span class="c-key">"check"</span>: <span class="c-str">"device_enrolled"</span>,  <span class="c-key">"result"</span>: <span class="c-ok">"pass"</span> },
    { <span class="c-key">"check"</span>: <span class="c-str">"signature_valid"</span>,  <span class="c-key">"result"</span>: <span class="c-ok">"pass"</span> },
    { <span class="c-key">"check"</span>: <span class="c-str">"geofence_ok"</span>,      <span class="c-key">"result"</span>: <span class="c-ok">"pass"</span>, <span class="c-key">"distanceM"</span>: <span class="c-num">61</span> },
    { <span class="c-key">"check"</span>: <span class="c-str">"weight_in_range"</span>,  <span class="c-key">"result"</span>: <span class="c-ok">"pass"</span> },
    { <span class="c-key">"check"</span>: <span class="c-str">"not_duplicate"</span>,    <span class="c-key">"result"</span>: <span class="c-ok">"pass"</span> },
    { <span class="c-key">"check"</span>: <span class="c-str">"clock_plausible"</span>,  <span class="c-key">"result"</span>: <span class="c-ok">"pass"</span> },
    { <span class="c-key">"check"</span>: <span class="c-str">"photo_present"</span>,    <span class="c-key">"result"</span>: <span class="c-ok">"pass"</span> }
  ],
  <span class="c-key">"quarantined"</span>: <span class="c-ok">false</span>
}

<span class="c-dim">the tampered weigh-in from the same run</span>
<span class="c-key">"weightKg"</span>: <span class="c-num">950</span> <span class="c-dim">(hub max 500)</span> → <span class="c-bad">fail: weight_in_range</span> → <span class="c-bad">quarantined</span>`,
  },
  {
    name: 'Batch',
    where: 'POST /batches/:id/seal',
    image: {
      src: 'stage-batch',
      w: 426,
      h: 490,
      alt: 'Mixed PET discharging from a tipper into a sorting facility.',
      caption: 'Many weigh-ins aggregate into one batch, the way the material itself does.',
    },
    lead: 'An operator opens a batch for one hub and material, adds the clean events, then seals it.',
    body: 'Sealing computes a Merkle tree over the event hashes and freezes both membership and order. There is no rollback: a sealed batch cannot gain, lose, or reorder an event.',
    tags: ['open → sealed → processed', 'Merkle tree', 'no rollback'],
    file: 'batch.sealed.json',
    code: `{
  <span class="c-key">"id"</span>: <span class="c-str">"b7d2…19ac"</span>,
  <span class="c-key">"hub"</span>: <span class="c-str">"nairobi-pilot"</span>,
  <span class="c-key">"material"</span>: <span class="c-str">"PET"</span>,
  <span class="c-key">"status"</span>: <span class="c-str">"sealed"</span>,
  <span class="c-key">"eventCount"</span>: <span class="c-num">9</span>,
  <span class="c-key">"totalWeightKg"</span>: <span class="c-num">125.300</span>,
  <span class="c-key">"totalWeightTonnes"</span>: <span class="c-num">0.1253</span>,
  <span class="c-key">"merkleRoot"</span>: <span class="c-str">"e1a4…7f30"</span>,
  <span class="c-key">"sealedAt"</span>: <span class="c-str">"2026-08-10T09:31:04.882Z"</span>
}

<span class="c-dim">      root e1a4…7f30
      ├── h(0,3) ────┬── h(0,1) ── ev#1 ev#2
      │              └── h(2,3) ── ev#3 ev#4
      └── h(4,8) ──── …</span>`,
  },
  {
    name: 'Anchor',
    where: 'services/anchor-worker',
    image: {
      src: 'stage-anchor',
      w: 358,
      h: 134,
      alt: 'The curve of the Earth at night, seen from orbit.',
      caption: 'The root leaves the building. From here the record is outside our control.',
    },
    lead: 'The worker submits a Stellar transaction carrying the Merkle root, then reads it back off the ledger before recording the transaction ID.',
    body: 'The root travels twice — as a manageData entry and as memo.hash — so it is readable from the operation body and from the transaction envelope. Confirming from Horizon before persisting means a recorded anchor is an anchor that actually landed.',
    tags: ['manageData', 'memo.hash(root)', 'read-back confirmation', '100 stroops'],
    file: 'anchor.result.json',
    code: `{
  <span class="c-key">"network"</span>: <span class="c-str">"testnet"</span>,
  <span class="c-key">"txHash"</span>: <span class="c-str">"${TX}"</span>,
  <span class="c-key">"ledger"</span>: <span class="c-num">4033690</span>,
  <span class="c-key">"memoHash"</span>: <span class="c-str">"e1a4…7f30"</span>,
  <span class="c-key">"feeCharged"</span>: <span class="c-num">100</span>,
  <span class="c-key">"confirmedFromHorizon"</span>: <span class="c-ok">true</span>
}

<span class="c-ok">memoHash === batch.merkleRoot</span>  <span class="c-dim">← the anchor means something</span>`,
  },
  {
    name: 'Report',
    where: 'GET /batches/:id/report',
    lead: 'The audit artifact is public. It carries every event, every Merkle proof, the sealed root, and the Stellar reference.',
    body: 'A buyer needs nothing from us beyond the batch ID — no account, no key, no rate-limited API. They recompute the root, walk one proof path, and compare against Horizon themselves.',
    tags: ['no auth required', 'per-event proofs', 'events.csv', 'reconciliation'],
    file: 'report.json',
    code: `<span class="c-dim">$</span> <span class="c-cmd">jq 'keys' report.json</span>
[ <span class="c-str">"reportVersion"</span>, <span class="c-str">"batch"</span>, <span class="c-str">"events"</span>,
  <span class="c-str">"proof"</span>, <span class="c-str">"onChain"</span>, <span class="c-str">"reconciliation"</span> ]

<span class="c-dim">$</span> <span class="c-cmd">jq '.proof' report.json</span>
{
  <span class="c-key">"sealedRoot"</span>:     <span class="c-str">"e1a4…7f30"</span>,
  <span class="c-key">"recomputedRoot"</span>: <span class="c-str">"e1a4…7f30"</span>,
  <span class="c-key">"rootsMatch"</span>:     <span class="c-ok">true</span>,
  <span class="c-key">"allProofsValid"</span>: <span class="c-ok">true</span>
}`,
  },
];

/*
 * One line each. The long-form rationale for every check lives in
 * docs/architecture.md — repeating it here turned the section into
 * documentation and cost the page a full screen.
 */
const CHECKS = [
  {
    name: 'device_enrolled',
    verdict: 'fail',
    defends: 'A key that was never enrolled, has been revoked, or belongs to another collector.',
  },
  {
    name: 'signature_valid',
    verdict: 'fail',
    defends: 'Editing the payload after signing. One changed byte breaks the signature.',
  },
  {
    name: 'geofence_ok',
    verdict: 'fail',
    defends: 'Weigh-ins claimed from outside the hub — GPS spoofing or an unapproved site.',
  },
  {
    name: 'weight_in_range',
    verdict: 'fail',
    defends: 'Implausible weights: 950 kg in one weigh-in against a hub maximum of 500 kg.',
  },
  {
    name: 'not_duplicate',
    verdict: 'fail',
    defends: 'Replaying a signed weigh-in to mint credit from nothing.',
  },
  {
    // The only check with two outcomes, so it carries two badges. Showing just
    // "warn" understated it — an unparseable or future-dated capturedAt is a
    // hard fail in events/integrity.ts and quarantines the event.
    name: 'clock_plausible',
    verdict: ['fail', 'warn'],
    defends: 'Forged timestamps. Future-dated fails; backdated warns, since offline sync is normal.',
  },
  {
    name: 'photo_present',
    verdict: 'fail',
    defends: 'Missing or malformed photo hashes, signalling a misconfigured device.',
  },
];

/*
 * The chain of custody, as four linked states rather than six process steps.
 *
 * The stepper below it answers "what happens"; this answers "what exists
 * afterwards, and what does it commit to". Every value here is real and comes
 * from the same testnet run as the hero receipt — a diagram of made-up hashes
 * would be the illustration this page keeps promising it is not.
 *
 * `link` is the operation that carries one state into the next, and is what
 * makes the sequence a chain rather than four unrelated cards.
 */
const CHAIN = [
  {
    step: 'Signed',
    where: 'on the device',
    label: 'payload hash',
    value: '4c1f9ad0…e88b',
    note: 'ed25519, key never left the phone',
    link: 'submitted',
  },
  {
    step: 'Checked',
    where: 'at ingest',
    label: 'integrity verdict',
    value: '7 / 7 pass',
    note: 'any fail quarantines permanently',
    link: 'transferred',
  },
  {
    step: 'Reconciled',
    where: 'in custody',
    label: 'reconciled gap',
    value: '0.000 kg',
    note: 'a gap must carry a stated reason to be written at all',
    link: 'batched',
  },
  {
    step: 'Sealed',
    where: 'at batch close',
    label: 'merkle root',
    value: 'e1a4…7f30',
    note: '9 events, membership and order frozen',
    link: 'anchored',
  },
  {
    step: 'On the ledger',
    where: 'stellar testnet',
    label: 'transaction',
    value: `${TX.slice(0, 6)}…${TX.slice(-4)}`,
    note: 'ledger 4033690, memo hash = the sealed root',
    href: `https://stellar.expert/explorer/testnet/tx/${TX}`,
    link: 'published',
  },
  {
    step: 'Audit-ready',
    where: 'public report',
    label: 'endpoint',
    value: 'GET /report',
    note: 'events, proofs, reconciliation — no account required',
  },
];

/*
 * The five-part summary bar, taken from the reference's structure.
 *
 * It earns its place by answering the one question the hero cannot: what is
 * this thing, in five words or fewer, before I commit to reading a screen of
 * argument. The reference put it directly under the hero and that placement is
 * right — it is a table of contents, not a feature list.
 *
 * Icons are drawn here rather than pulled from a set: the page uses one stroke
 * weight and square caps throughout, and no icon library matches that without
 * being overridden into it anyway.
 */
const SUMMARY = [
  {
    title: 'Signed at the scale',
    note: 'ed25519 on the device; we never hold the key',
    icon: '<path d="M12 3 4 6.4v5.1c0 4.4 3.4 8 8 9.5 4.6-1.5 8-5.1 8-9.5V6.4Z"/><path d="M8.6 12.2 11 14.6l4.6-4.8"/>',
  },
  {
    title: 'Checked at ingest',
    note: 'seven integrity checks, quarantine on failure',
    icon: '<path d="M4 5h16v14H4z"/><path d="M7.6 9.4h5.4M7.6 12.8h8.8M7.6 16.2h4"/>',
  },
  {
    title: 'Sealed in a Merkle tree',
    note: 'membership and order frozen at seal time',
    icon: '<path d="M12 3.6v4M6 12.4v3.8M18 12.4v3.8M6 12.4h12"/><path d="M9.6 7.6h4.8v4.8H9.6zM3.6 16.2h4.8V21H3.6zM15.6 16.2h4.8V21h-4.8z"/>',
  },
  {
    title: 'Anchored on Stellar',
    note: 'confirmed back off the ledger before recording',
    icon: '<path d="M4.6 9.6 12 5.4l7.4 4.2v4.8L12 18.6l-7.4-4.2Z"/><path d="M12 10.2v4.2"/>',
  },
  {
    title: 'Checkable by anyone',
    note: 'public report, no account, no rate limit',
    icon: '<circle cx="11" cy="11" r="6.4"/><path d="M15.8 15.8 20.4 20.4"/>',
  },
];

/*
 * How the tree is built.
 *
 * The page has always told a reader to recompute the root, and never told them
 * how — no leaf rule, no node rule, no ordering. Those three facts are exactly
 * what recomputation requires, so without them the central invitation of the
 * page could not actually be taken up.
 *
 * Each rule is stated with the attack it stops, because all three are
 * deviations from the naive Merkle tree and each deviation exists for a reason.
 * Source: packages/shared/src/merkle.ts.
 */
const MERKLE = [
  {
    rule: 'Domain separation',
    spec: 'leaf = sha256(0x00 ‖ payloadHash)\nnode = sha256(0x01 ‖ left ‖ right)',
    stops:
      'Presenting an internal node as if it were a leaf. Without distinct prefixes a 32-byte intermediate hash can be passed off as a weigh-in — the Merkle second-preimage attack.',
  },
  {
    rule: 'Positional pairing',
    spec: 'siblings combined left-then-right\neach proof step records its side',
    stops:
      'Reordering. Sorting the pair instead — the common shortcut — discards position, so a proof would verify against orderings the sealed batch never had.',
  },
  {
    rule: 'Odd nodes promoted',
    spec: 'a lone node at a level is carried up\nunchanged, never duplicated',
    stops:
      'The duplicate-last-node ambiguity, where two different trees produce one root. Known in Bitcoin as CVE-2012-2459.',
  },
  {
    rule: 'Fixed ordering',
    spec: 'events sorted by capturedAt ASC, id ASC',
    stops:
      'A root that depends on the order rows happened to come back in. Anyone recomputing from the report sorts the same way and gets the same tree.',
  },
];

const COMMANDS = [
  {
    label: '1 · download',
    file: 'download the audit report',
    plain: `BATCH_ID="00000000-0000-0000-0000-000000000001"
curl -s "$PROOFCHAIN/batches/$BATCH_ID/report" > report.json
jq '.batch' report.json`,
    code: `<span class="c-dim">$</span> <span class="c-cmd">BATCH_ID=</span><span class="c-str">"00000000-0000-0000-0000-000000000001"</span>
<span class="c-dim">$</span> <span class="c-cmd">curl -s</span> <span class="c-str">"$PROOFCHAIN/batches/$BATCH_ID/report"</span> &gt; report.json
<span class="c-dim">$</span> <span class="c-cmd">jq</span> <span class="c-str">'.batch'</span> report.json

{
  <span class="c-key">"id"</span>: <span class="c-str">"00000000-…-000000000001"</span>,
  <span class="c-key">"material"</span>: <span class="c-str">"PET"</span>,
  <span class="c-key">"totalWeightKg"</span>: <span class="c-num">125.3</span>,
  <span class="c-key">"totalWeightTonnes"</span>: <span class="c-num">0.1253</span>,
  <span class="c-key">"eventCount"</span>: <span class="c-num">9</span>,
  <span class="c-key">"merkleRoot"</span>: <span class="c-str">"e1a4…7f30"</span>
}

<span class="c-dim"># public endpoint — no token, no account</span>`,
  },
  {
    label: '2 · recompute root',
    file: 'rebuild the Merkle tree yourself',
    plain: `jq -r '.events[].leafHash' report.json > leaves.txt
node recompute-root.mjs leaves.txt
jq -r '.proof.sealedRoot' report.json`,
    code: `<span class="c-dim">$</span> <span class="c-cmd">jq -r</span> <span class="c-str">'.events[].leafHash'</span> report.json &gt; leaves.txt
<span class="c-dim">$</span> <span class="c-cmd">node</span> recompute-root.mjs leaves.txt
<span class="c-str">e1a4…7f30</span>

<span class="c-dim">$</span> <span class="c-cmd">jq -r</span> <span class="c-str">'.proof.sealedRoot'</span> report.json
<span class="c-str">e1a4…7f30</span>

<span class="c-ok">✓ identical</span>  <span class="c-dim">— membership and order are unchanged
                since the batch was sealed</span>

<span class="c-dim"># if these differ, reject the batch.
# including if we tell you not to.</span>`,
  },
  {
    label: '3 · check a proof',
    file: 'prove one event is in the tree',
    plain: `EVENT_ID=$(jq -r '.events[0].id' report.json)
curl -s "$PROOFCHAIN/batches/$BATCH_ID/verify/$EVENT_ID" | jq`,
    code: `<span class="c-dim">$</span> <span class="c-cmd">EVENT_ID=</span>$(jq -r <span class="c-str">'.events[0].id'</span> report.json)
<span class="c-dim">$</span> <span class="c-cmd">curl -s</span> <span class="c-str">"$PROOFCHAIN/batches/$BATCH_ID/verify/$EVENT_ID"</span> | jq

{
  <span class="c-key">"eventId"</span>: <span class="c-str">"a19c…4d02"</span>,
  <span class="c-key">"leafHash"</span>: <span class="c-str">"7b30…c5e1"</span>,
  <span class="c-key">"index"</span>: <span class="c-num">0</span>,
  <span class="c-key">"proof"</span>: [
    { <span class="c-key">"side"</span>: <span class="c-str">"right"</span>, <span class="c-key">"hash"</span>: <span class="c-str">"2f8a…91bb"</span> },
    { <span class="c-key">"side"</span>: <span class="c-str">"right"</span>, <span class="c-key">"hash"</span>: <span class="c-str">"c604…7ade"</span> },
    { <span class="c-key">"side"</span>: <span class="c-str">"left"</span>,  <span class="c-key">"hash"</span>: <span class="c-str">"55d1…0f42"</span> }
  ],
  <span class="c-key">"root"</span>: <span class="c-str">"e1a4…7f30"</span>,
  <span class="c-key">"valid"</span>: <span class="c-ok">true</span>
}`,
  },
  {
    label: '4 · read the ledger',
    file: 'compare the root against Horizon',
    plain: `TX=${TX}
curl -s "https://horizon-testnet.stellar.org/transactions/$TX" \\
  | jq '{ledger, memo, memo_type, fee_charged}'`,
    code: `<span class="c-dim">$</span> <span class="c-cmd">TX=</span><span class="c-str">${TX.slice(0, 24)}…</span>
<span class="c-dim">$</span> <span class="c-cmd">curl -s</span> <span class="c-str">"https://horizon-testnet.stellar.org/transactions/$TX"</span> \\
    | <span class="c-cmd">jq</span> <span class="c-str">'{ledger, memo, memo_type, fee_charged}'</span>

{
  <span class="c-key">"ledger"</span>: <span class="c-num">4033690</span>,
  <span class="c-key">"memo"</span>: <span class="c-str">"4aRw…8zA="</span>,        <span class="c-dim">← base64 of the root</span>
  <span class="c-key">"memo_type"</span>: <span class="c-str">"hash"</span>,
  <span class="c-key">"fee_charged"</span>: <span class="c-str">"100"</span>
}

<span class="c-ok">✓ memo hash === the root you recomputed</span>

<span class="c-dim"># the tonne is now proven without a single
# claim from ProofChain being trusted.</span>`,
  },
];

/* ── Rendering ─────────────────────────────────────────────────────── */

const el = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

/**
 * A stage plate. Only the three stages with a physical referent carry one —
 * capture, batch and anchor. Ingest, integrity and report are computations, and
 * an image against those would be decoration rather than evidence.
 *
 * @param {{src: string, w: number, h: number, alt: string, caption: string}} image
 */
function stageImage(image) {
  return `
    <figure class="plate plate--stage">
      <picture>
        <source srcset="assets/${image.src}.webp" type="image/webp" />
        <img src="assets/${image.src}.png" width="${image.w}" height="${image.h}"
             loading="lazy" decoding="async" alt="${image.alt}" />
      </picture>
      <figcaption><b>Illustration</b>${image.caption}</figcaption>
    </figure>
  `;
}

function renderPipeline() {
  const stepsHost = document.querySelector('[data-steps]');
  const panelsHost = document.querySelector('[data-panels]');
  if (!stepsHost || !panelsHost) return;

  PIPELINE.forEach((stage, i) => {
    const id = `stage-${i}`;
    const selected = i === 0;

    stepsHost.append(
      el(`
        <button class="step" role="tab" id="tab-${id}" aria-controls="panel-${id}"
                aria-selected="${selected}" tabindex="${selected ? 0 : -1}">
          <span class="step__num">STEP ${String(i + 1).padStart(2, '0')}</span>
          <span class="step__name">${stage.name}</span>
          <span class="step__where">${stage.where}</span>
        </button>
      `),
    );

    panelsHost.append(
      el(`
        <div class="panel" role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}"
             tabindex="0" ${selected ? '' : 'hidden'}>
          <div class="panel__body">
            <p style="color: var(--ink); font-size: 1.0625rem">${stage.lead}</p>
            <p style="margin-top: 0.85rem">${stage.body}</p>
            <div class="panel__facts">
              ${stage.tags.map((t) => `<span class="tag">${t}</span>`).join('')}
            </div>
            ${stage.image ? stageImage(stage.image) : ''}
          </div>
          <div class="terminal">
            <div class="terminal__bar">
              <span class="terminal__name">${stage.file}</span>
            </div>
            <pre><code>${stage.code}</code></pre>
          </div>
        </div>
      `),
    );
  });

  wireTablist(stepsHost, '.step');

  // The stepper is a scrolling row on narrow screens and a sticky column from
  // 68rem, matching the .steps breakpoint in styles.css. Announcing a fixed
  // orientation would be wrong at one of the two, so it follows the layout.
  const wide = window.matchMedia('(min-width: 68rem)');
  const setOrientation = () =>
    stepsHost.setAttribute('aria-orientation', wide.matches ? 'vertical' : 'horizontal');
  setOrientation();
  wide.addEventListener('change', setOrientation);
}

function renderMerkle() {
  const host = document.querySelector('[data-merkle]');
  if (!host) return;

  MERKLE.forEach((item) => {
    host.append(
      el(`
        <div class="merkle__rule reveal">
          <h3 class="merkle__name">${item.rule}</h3>
          <pre class="merkle__spec"><code>${item.spec}</code></pre>
          <p class="merkle__stops"><b>Stops</b>${item.stops}</p>
        </div>
      `),
    );
  });
}

function renderSummary() {
  const host = document.querySelector('[data-summary]');
  if (!host) return;

  SUMMARY.forEach((item) => {
    host.append(
      el(`
        <li class="summary__item">
          <svg class="summary__icon" width="22" height="22" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.5" stroke-linecap="square"
               stroke-linejoin="miter" aria-hidden="true">${item.icon}</svg>
          <p class="summary__title">${item.title}</p>
          <p class="summary__note">${item.note}</p>
        </li>
      `),
    );
  });
}

/*
 * An ordered list, not a row of divs. The sequence is the whole meaning here:
 * read linearly by a screen reader it should still say signed, then checked,
 * then sealed, then on the ledger. The connectors are decorative and hidden.
 */
function renderChain() {
  const host = document.querySelector('[data-chain]');
  if (!host) return;

  CHAIN.forEach((node, i) => {
    const last = i === CHAIN.length - 1;
    const value = node.href
      ? `<a class="chain__value" href="${node.href}" rel="noopener">${node.value}</a>`
      : `<span class="chain__value">${node.value}</span>`;

    host.append(
      el(`
        <li class="chain__node${last ? ' chain__node--final' : ''}">
          <article class="chain__card reveal">
            <p class="chain__step">
              <span class="chain__num">${String(i + 1).padStart(2, '0')}</span>
              ${node.step}
              <span class="chain__where">${node.where}</span>
            </p>
            <p class="chain__label">${node.label}</p>
            ${value}
            <p class="chain__note">${node.note}</p>
          </article>
          ${
            last
              ? ''
              : `<p class="chain__link" aria-hidden="true"><span>${node.link}</span></p>`
          }
        </li>
      `),
    );
  });
}

function renderChecks() {
  const host = document.querySelector('[data-checks]');
  if (!host) return;

  CHECKS.forEach((check) => {
    const verdicts = [check.verdict].flat();
    host.append(
      el(`
        <article class="check reveal">
          <div class="check__head">
            <span class="check__name">${check.name}</span>
            <span class="check__verdicts">${verdicts
              .map((v) => `<span class="check__verdict" data-v="${v}">${v}</span>`)
              .join('')}</span>
          </div>
          <p class="check__defends"><b>Defends against</b>${check.defends}</p>
        </article>
      `),
    );
  });
}

function renderCommands() {
  const tabsHost = document.querySelector('[data-tabs]');
  const termsHost = document.querySelector('[data-terminals]');
  if (!tabsHost || !termsHost) return;

  COMMANDS.forEach((cmd, i) => {
    const id = `cmd-${i}`;
    const selected = i === 0;

    tabsHost.append(
      el(`
        <button class="tab" role="tab" id="tab-${id}" aria-controls="panel-${id}"
                aria-selected="${selected}" tabindex="${selected ? 0 : -1}">${cmd.label}</button>
      `),
    );

    const panel = el(`
      <div class="panel" role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}"
           tabindex="0" ${selected ? '' : 'hidden'}>
        <div class="terminal">
          <div class="terminal__bar">
            <span class="terminal__name">${cmd.file}</span>
            <button class="copy" type="button">Copy</button>
          </div>
          <pre><code>${cmd.code}</code></pre>
        </div>
      </div>
    `);
    panel.querySelector('.copy').dataset.copy = cmd.plain;
    termsHost.append(panel);
  });

  wireTablist(tabsHost, '.tab');
}

/* ── Behaviour ─────────────────────────────────────────────────────── */

/**
 * Standard tablist keyboard semantics: arrows move and activate, Home/End jump.
 * Panels are siblings elsewhere in the DOM, found by aria-controls.
 */
function wireTablist(host, selector) {
  const tabs = [...host.querySelectorAll(selector)];

  const select = (next) => {
    tabs.forEach((tab) => {
      const on = tab === next;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      // A tab whose panel is missing would otherwise throw here and abort the
      // loop, leaving every remaining tab stuck in its previous state.
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      const map = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1 };
      let target = map[event.key];
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = tabs.length - 1;
      if (target === undefined) return;

      event.preventDefault();
      const next = tabs[(target + tabs.length) % tabs.length];
      select(next);
      next.focus();
    });
  });
}

/** One pending reset timer per button, so a re-click cancels its predecessor. */
const copyTimers = new WeakMap();

/**
 * Speak a message through the polite live region in index.html.
 *
 * The region is cleared first: repeating the identical string is not treated
 * as a change, so copying twice in a row would otherwise be announced once.
 */
function announce(message) {
  const region = document.querySelector('[data-copy-status]');
  if (!region) return;
  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}

function wireCopyButtons() {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('button.copy[data-copy]');
    if (!button) return;

    // Remember the resting label once, on the first click. Reading textContent
    // on every click meant a second click during the 1600 ms window captured
    // "Copied" as the label to restore, and the button never recovered.
    if (button.dataset.label === undefined) button.dataset.label = button.textContent;
    clearTimeout(copyTimers.get(button));

    let message;
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.dataset.copied = 'true';
      button.textContent = 'Copied';
      message = 'Copied to clipboard';
    } catch {
      // Clipboard is unavailable over file:// in some browsers; say so rather
      // than showing a success state that did not happen.
      button.textContent = 'Copy failed';
      message = 'Copy failed — the clipboard is unavailable in this context';
    }
    announce(message);

    copyTimers.set(
      button,
      setTimeout(() => {
        button.textContent = button.dataset.label;
        delete button.dataset.copied;
      }, 1600),
    );
  });
}

function wireReveals() {
  const targets = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    targets.forEach((node) => node.classList.add('is-in'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        // A short stagger so a row of cards resolves as a sequence, not a flash.
        entry.target.style.transitionDelay = `${Math.min(i, 5) * 55}ms`;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.15 },
  );

  targets.forEach((node) => observer.observe(node));
}

/*
 * Collapse the section nav behind a button on narrow screens.
 *
 * The masthead is only marked enhanced from here, so the collapsed state can
 * never exist without the control that undoes it. A reader without JavaScript
 * keeps the open nav from styles.css.
 */
function wireMenuToggle() {
  const masthead = document.querySelector('.masthead');
  const button = document.querySelector('[data-menu-toggle]');
  const nav = masthead?.querySelector('nav');
  if (!masthead || !button || !nav) return;

  masthead.dataset.enhanced = 'true';

  const setOpen = (open) => {
    masthead.toggleAttribute('data-menu-open', open);
    button.setAttribute('aria-expanded', String(open));
  };

  button.addEventListener('click', () => {
    setOpen(!masthead.hasAttribute('data-menu-open'));
  });

  // Following a link is a completed navigation; leaving the panel covering the
  // section the reader just asked for would undo the thing they wanted.
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !masthead.hasAttribute('data-menu-open')) return;
    setOpen(false);
    button.focus();
  });

  document.addEventListener('click', (event) => {
    if (!masthead.hasAttribute('data-menu-open')) return;
    if (!masthead.contains(event.target)) setOpen(false);
  });

  // Crossing into the desktop layout reveals the nav inline. Leaving the open
  // flag set would then strand aria-expanded reporting a panel that is simply
  // the navigation, permanently visible.
  const wide = window.matchMedia('(min-width: 56rem)');
  wide.addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

/*
 * Theme control.
 *
 * The stored choice is applied by an inline script in <head>, before paint.
 * This only wires the button and keeps its label truthful — including when the
 * reader has expressed no preference and the page is following the system,
 * which is the state a naive toggle usually gets wrong.
 */
const THEME_KEY = 'proofchain-theme';

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

/** The theme actually rendering, whether it was chosen or inherited. */
function activeTheme() {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === 'dark' || chosen === 'light') return chosen;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function wireThemeToggle() {
  const button = document.querySelector('[data-theme-toggle]');
  if (!button) return;

  const label = button.querySelector('[data-theme-label]');
  const system = window.matchMedia('(prefers-color-scheme: dark)');

  const sync = () => {
    const active = activeTheme();
    const next = active === 'dark' ? 'light' : 'dark';
    // aria-pressed reports the state; the accessible name reports the outcome,
    // which is what a screen reader user needs before deciding to activate it.
    button.setAttribute('aria-pressed', String(active === 'dark'));
    if (label) label.textContent = `Switch to ${next} theme`;
  };

  button.addEventListener('click', () => {
    const next = activeTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Unwritable storage costs persistence across reloads, not this switch.
    }
    sync();
  });

  // While the reader is still following the system, track it live. Once they
  // have chosen, a system change must not silently override that choice.
  system.addEventListener('change', () => {
    if (!readStoredTheme()) sync();
  });

  sync();
}

/**
 * Underline the nav link for whichever section currently owns the viewport.
 *
 * The detection band is short but not infinitely thin, so two adjacent
 * sections can straddle it at once. Rather than highlight both, keep the set
 * of intersecting sections and mark only the topmost — the one the reader has
 * most recently arrived at.
 */
function wireNavHighlight() {
  const links = new Map(
    [...document.querySelectorAll('.masthead nav a')].map((a) => [a.getAttribute('href').slice(1), a]),
  );
  const sections = [...links.keys()]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (!sections.length || !('IntersectionObserver' in window)) return;

  const visible = new Set();

  const paint = () => {
    const active = sections.find((section) => visible.has(section));
    links.forEach((link, id) => {
      link.classList.toggle('is-current', Boolean(active) && active.id === id);
      // aria-current is what tells a screen-reader user where they are; the
      // underline alone conveys it to sighted users only.
      if (active && active.id === id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
      paint();
    },
    { rootMargin: '-20% 0px -70% 0px' },
  );

  sections.forEach((section) => observer.observe(section));
}

renderMerkle();
renderSummary();
renderChain();
renderPipeline();
renderChecks();
renderCommands();
wireCopyButtons();
wireReveals();
wireMenuToggle();
wireThemeToggle();
wireNavHighlight();
