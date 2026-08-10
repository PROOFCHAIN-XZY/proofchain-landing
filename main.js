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
    name: 'clock_plausible',
    verdict: 'warn',
    defends: 'Forged timestamps. Future-dated fails; backdated warns, since offline sync is normal.',
  },
  {
    name: 'photo_present',
    verdict: 'fail',
    defends: 'Missing or malformed photo hashes, signalling a misconfigured device.',
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
}

function renderChecks() {
  const host = document.querySelector('[data-checks]');
  if (!host) return;

  CHECKS.forEach((check) => {
    host.append(
      el(`
        <article class="check reveal">
          <div class="check__head">
            <span class="check__name">${check.name}</span>
            <span class="check__verdict" data-v="${check.verdict}">${check.verdict}</span>
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
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !on;
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

function wireCopyButtons() {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('button.copy[data-copy]');
    if (!button) return;

    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.dataset.copied = 'true';
      button.textContent = 'Copied';
    } catch {
      // Clipboard is unavailable over file:// in some browsers; say so rather
      // than showing a success state that did not happen.
      button.textContent = 'Copy failed';
    }

    setTimeout(() => {
      button.textContent = original;
      delete button.dataset.copied;
    }, 1600);
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

/** Underline the nav link for whichever section currently owns the viewport. */
function wireNavHighlight() {
  const links = new Map(
    [...document.querySelectorAll('.masthead nav a')].map((a) => [a.getAttribute('href').slice(1), a]),
  );
  const sections = [...links.keys()]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  if (!sections.length || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const link = links.get(entry.target.id);
        if (!link) return;
        link.style.color = entry.isIntersecting ? 'var(--ink)' : '';
        link.style.borderBottomColor = entry.isIntersecting ? 'var(--rule-strong)' : '';
      });
    },
    { rootMargin: '-20% 0px -70% 0px' },
  );

  sections.forEach((section) => observer.observe(section));
}

renderPipeline();
renderChecks();
renderCommands();
wireCopyButtons();
wireReveals();
wireNavHighlight();
