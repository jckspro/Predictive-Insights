# Dashboard Component Justification

Every component in the Syslog Predictive Insights platform, with **what** it shows,
**why** it exists, and **how an engineer actually uses it**.

Read this alongside `DASHBOARD_OVERVIEW.md` — that document is the executive summary,
this one is the working reference.

---

## Part A — Shell & Framework Components

### Header
- **What:** Product title, live Neo4j connection status pill, tab switcher, manual refresh.
- **Why:** A dashboard that silently falls back to cached or synthetic data is dangerous — an
  engineer could make a maintenance decision on stale numbers. The status pill makes the data
  provenance visible at all times.
- **How to use:** Check the pill is `CONNECTED` before trusting any number. Use refresh after
  a change window to bypass the 15-second query cache and confirm an intervention worked.

### ConnectionModal
- **What:** Editable Bolt URI, user, password, database, and a demo-fallback toggle.
- **Why:** Lets the same build point at prod, staging, or the offline synthetic dataset without
  a rebuild. Essential for demos and for validating queries against a copy before prod.
- **How to use:** Point at a restored snapshot when you want to explore aggressively without
  loading the live instance.

### FilterBar — Date & Time
- **What:** Presets (7 / 30 / 90 days, All Time) plus a custom From/To datetime range.
- **Why:** Almost every question on this dashboard is *"compared to when?"*. Presets answer
  "is this normal?"; the custom range answers "what happened during the change window?".
- **How to use:** Set the custom range to the exact maintenance window to isolate the blast
  radius of a config push. Toggle 7d vs 30d on any card to separate a live incident (visible
  only in 7d) from chronic degradation (visible in both).

### FilterBar — Location (Region → Country → City → Store)
- **What:** A cascading four-column menu. Picking a level scopes every card to the sites
  underneath it.
- **Why:** The graph only stores a flat `e.site`. Engineers think geographically ("is this an
  EMEA problem or a Frankfurt problem?"), so the hierarchy is derived from the site naming
  convention in `src/lib/locations.ts` and resolved back to a `e.site IN $siteScope` predicate.
- **How to use:** Start at region level to see if a fault is regional (likely WAN or upstream
  provider) or a single site (likely local hardware). Then drill to the store to confirm.
- **Caveat:** Region/country/city are *inferred* from the site name, not stored in Neo4j. The
  current dataset has 11 sites and one store per city, so the deeper levels look sparse.

### FilterBar — Device Type & Severity
- **What:** Filters by `Device.type` and `Event.severity`.
- **Why:** Separates "the routers are unhealthy" from "the access points are unhealthy" — very
  different remediation teams and budgets.
- **Caveat:** Cards that hard-code a severity set (1.7, and others filtering `MAJOR/CRITICAL`)
  will go empty if you select a conflicting severity. That is expected behaviour.

### KPI Strip
- **What:** Four always-visible headline counters — Total Events, Critical Events,
  Denied/Blocked, Devices At Risk — each with a click-through Top-10 drill-down.
- **Why:** Gives a five-second health read before any analysis. The drill-downs mean the KPI is
  an entry point, not a dead end.
- **How to use:**
  - *Total Events* — a sudden collapse usually means a collector or syslog relay died, not that
    the network got healthier. Treat a sharp drop as an alarm.
  - *Critical Events* — click for the Top 10 critical sources; that list is your triage queue.
  - *Denied / Blocked* — this going **up** is usually the controls working. It going to zero on
    an internet-facing site is suspicious.
  - *Devices At Risk* — the number that should drive this week's field work.

### CardWrapper
- **What:** Standard shell giving each card its own loading, error, retry, empty state and CSV export.
- **Why:** One failing query must not blank the page. Independent error states mean an engineer
  can trust the cards that *did* load.
- **How to use:** Export any card to CSV to attach evidence to a change ticket or vendor RMA.

### DataTable
- **What:** Sortable, paginated table (TanStack Table) used by all list-style cards.
- **Why:** Charts show shape; tables give the exact device names and counts you need for a ticket.
- **How to use:** Sort by the count column to find the worst offender, then click the device name.

### DeviceDrawer
- **What:** Unified device detail panel — event history and trend — opened by clicking any
  device name anywhere in the dashboard.
- **Why:** Closes the loop between "this device ranks badly" and "here is why". Without it,
  every card would be a dead end requiring a manual Cypher query.
- **How to use:** The last step of nearly every investigation. Confirm the failure mode before
  raising an RMA or scheduling a swap.

### useCypher hook
- **What:** Shared query hook with 15-second response caching and in-flight deduplication.
- **Why:** ~31 cards changing filters simultaneously would otherwise hammer Neo4j with duplicate
  round-trips.
- **How to use:** Be aware numbers can be up to 15 seconds stale; use the header refresh to force
  a bypass.

### FilterContext
- **What:** Single source of truth for the filter state, exposing `queryParams` to every card.
- **Why:** Guarantees that all cards on screen describe the *same* slice of data. Cards drifting
  out of sync would make cross-card correlation invalid.

### mockEngine (demo fallback)
- **What:** Synthetic responses used when the demo toggle is on or the driver is unavailable.
- **Why:** Enables offline demos and UI development without a database.
- **Caveat:** Never present mock numbers as operational fact — confirm the connection pill first.

---

## Part B — Tab 1: Network Anomalies

*Purpose of the tab: operational stability and traffic health. Answers "is the network behaving?"*

### 1.1 Network Event Volume by Severity
- **What:** Stacked area of daily event counts split by INFO / MINOR / MAJOR / CRITICAL.
- **Why:** Establishes the baseline. Everything else is judged against "what does normal look like".
- **How to use:** Look for the *shape*, not the total. A rising CRITICAL band under a flat total
  means severity is escalating without more volume — the classic pre-failure signature. A cliff
  edge in total volume means telemetry loss, not improvement.

### 1.2 Interface Flap Leaderboard
- **What:** Top interfaces by down/flap state-change events.
- **Why:** Flapping links are the single most common cause of intermittent, hard-to-reproduce
  user complaints, and they poison routing convergence.
- **How to use:** The top 3 entries are your cabling/SFP/duplex checklist. Cross-reference with
  3.10 (Optics Watchlist) — a flapping port that also shows optical attenuation is a failing
  transceiver, not a config problem.

### 1.3 Routing Adjacency Failures
- **What:** Neighbor state changes grouped by routing protocol (OSPF, BGP, EIGRP…).
- **Why:** Adjacency churn causes traffic black-holing and reconvergence storms that users
  experience as brief total outages.
- **How to use:** Concentration in one protocol points to a timer/MTU/authentication
  misconfiguration. Spread across protocols on the same devices points to a physical layer
  problem — go back to 1.2.

### 1.4 Routing Peer Failure Topology
- **What:** A React Flow graph of failing peer relationships (`RoutingTopologyGraph`).
- **Why:** Adjacency failures are inherently relational; a list cannot show that six failures all
  radiate from one core router.
- **Status:** ⚠️ The query (`q1_4`) runs and `RoutingTopologyGraph` is imported, but the card is
  **not currently rendered** in the tab. This is an outstanding gap, not a design decision.

### 1.5 Site-to-Site VPN Tunnel Failures
- **What:** Table of gateway, peer, failure mode, protocol, failure count for IPsec/IKE outages.
- **Why:** Branch and store connectivity usually rides these tunnels — a tunnel failure is a
  site-down event for the business, even if the "network" is technically up.
- **How to use:** Group by failure mode. Repeated `IKE_SA_TIMEOUT` on one peer implicates that
  peer or the path to it; the same mode across many peers implicates the hub gateway or its ISP.

### 1.6 Wireless AP Disconnects by Controller
- **What:** Stacked bar of AP dissociation events per controller, split by cause.
- **Why:** Wireless is where users notice problems first, and controller-level clustering
  distinguishes a bad AP from a bad controller.
- **How to use:** One controller dominating = controller capacity, firmware, or its uplink. Even
  spread = environmental (RF interference, PoE budget, power events).

### 1.7 Anomaly Hotspot — Site × Zone Heatmap
- **What:** Top 16 site×zone combinations by MAJOR/CRITICAL count across five stability event types.
- **Why:** Answers *where* before *what*. Converts thousands of events into one glance at the
  worst network segments.
- **How to use:** A site repeating across zones = site-wide fault (uplink/power/core). A zone
  repeating across sites = systemic zone issue (e.g. guest wireless capacity, DMZ policy churn).
- **Caveat:** Colour intensity is **relative to the hottest tile currently on screen** and counts
  are raw — large sites naturally rank higher. Read the numbers, not just the shade.

### 1.8 Noisiest Devices
- **What:** Top telemetry producers across all event types.
- **Why:** Extreme log volume is itself a fault signal (loops, crash-restart cycles, misconfigured
  logging levels) and it drives ingest cost and storage.
- **How to use:** Two different findings hide here — genuinely sick devices, and devices with
  logging misconfigured to debug level. Open the drawer to tell which.

### 1.9 Silent Devices (No Telemetry ≥ 14 days)
- **What:** Devices with no logs in 14+ days, with last-seen timestamp.
- **Why:** **The most under-appreciated card on the dashboard.** A silent device is invisible to
  every other card and every alert rule. It is either decommissioned-but-not-recorded, or it is
  down and nobody knows, or its logging is broken — all three are monitoring gaps.
- **How to use:** Treat this as an inventory reconciliation list. Every entry should be resolved
  to "decommissioned" or "fix logging". Silence is not health.

### 1.10 Failed Communications by Protocol
- **What:** Failed socket attempts grouped by protocol.
- **Why:** Distinguishes application-layer failures from link-layer failures. A healthy link with
  failing communications points at firewall policy, DNS, or a dead service — not the network.
- **How to use:** Use it to defend the network team's position: if 1.2/1.3 are clean but 1.10 is
  spiking, the fault is above layer 3.

---

## Part C — Tab 2: Security Events

*Purpose of the tab: threat and access posture. Answers "who is pushing on us, and is anything giving way?"*

### 2.1 Authentication Outcome Trend
- **What:** Daily successes, failures, and policy denials over time.
- **Why:** The ratio matters more than the counts. A rising failure:success ratio is the earliest
  visible signal of credential stuffing or a broken auth dependency.
- **How to use:** A failure spike with a *matching* success spike is worse than failures alone —
  that pattern means someone eventually got in.

### 2.2 Top Risky Users
- **What:** Users ranked by failures, privilege escalation attempts, distinct source IPs and
  distinct countries.
- **Why:** The multi-dimensional score is deliberate. High failures alone is usually a forgotten
  password; high failures **plus** many distinct countries is account compromise.
- **How to use:** Sort by distinct countries first, not by failure count. That column is the
  strongest compromise indicator on the card.

### 2.3 Denial Reason Breakdown
- **What:** Distribution of the primary security rejection triggers.
- **Why:** Separates "controls working as designed" from "controls misconfigured and blocking
  legitimate work". Both look like denials in a raw log.
- **How to use:** A reason that suddenly dominates after a change window usually means an
  over-broad rule was pushed — check 2.12.

### 2.4 Top External Attacker IPs
- **What:** Source IP, country, block count, distinct ports probed, top reasons.
- **Why:** Ports-probed is the discriminator between background internet noise (1–2 ports) and
  targeted reconnaissance (many ports from one IP).
- **How to use:** High blocks + high distinct ports = candidate for a permanent blocklist entry
  and a threat-intel submission.

### 2.5 Blocked Traffic by Target Port
- **What:** Most-probed service ports.
- **Why:** Tells you what attackers *think* you are running. Probes concentrating on a port you
  actually expose is a prioritised patching signal.
- **How to use:** Cross-check the top ports against your real exposed service inventory. Overlap
  is urgent; no overlap is just noise.

### 2.6 Attack Origin by Country
- **What:** Geo-IP distribution of security blocks.
- **Why:** Supports geo-blocking policy decisions and highlights impossible-travel scenarios when
  read next to 2.2.
- **Caveat:** Geo-IP is easily defeated by VPNs and proxies. Use it for policy shaping and trend
  detection, never as attribution.

### 2.7 Most-Triggered Policies
- **What:** Firewall and ACL rules ranked by denial count.
- **Why:** Rule hit counts are how you find both the rules doing the real work and the shadowed
  or over-broad rules causing false positives.
- **How to use:** A rule with an enormous hit count is a rule worth tuning — either it should be
  earlier in the chain for performance, or it is too broad.

### 2.8 Privilege Escalation Attempts
- **What:** Interactive audit log of sudo/root escalation attempts with user, source IP, target,
  result and reason.
- **Why:** This is the lateral-movement and insider-risk card. Escalation is the step between
  "someone got a foothold" and "someone owns the estate".
- **How to use:** Read it row by row, not in aggregate. Any *successful* escalation from an
  unexpected source IP or outside change hours warrants an immediate conversation.

### 2.9 SIEM Anomaly Signatures
- **What:** Behavioural detection signatures with detection counts and average confidence.
- **Why:** Catches the things signature-free — behaviour that no explicit rule covers.
- **How to use:** Weight by confidence, not count. A handful of high-confidence detections beats
  thousands of low-confidence ones.

### 2.10 Port-Security Violations by Switch
- **What:** Sticky-MAC and err-disabled tripwires per switch, port, violation type and offending MAC.
- **Why:** Physical-layer access control. This is how you detect unauthorised devices plugged into
  the estate — a real risk in retail and store environments.
- **How to use:** Repeat violations on the same port with different MACs suggests a rogue switch
  or hub; the same MAC repeatedly suggests a legitimate device needing an exception.

### 2.11 DNS Sinkhole Hits
- **What:** Requests to known malicious C2 domains.
- **Why:** A sinkhole hit means something **inside** your network tried to call out. This is one
  of the highest-fidelity compromise indicators available.
- **How to use:** Treat any hit as an infected-host investigation, not a blocked-threat success
  story. The block worked; the infection is still there.

### 2.12 Configuration Change Audit
- **What:** Administrative device edits and rollbacks with admin, target device, and result.
- **Why:** The majority of "sudden" network faults are self-inflicted. This card is the first
  place to look when something breaks with no external cause.
- **How to use:** When any Tab 1 card spikes, set the Date & Time filter to that window and read
  this card. `failed_rollback` entries are your highest-risk rows — the device is in an unknown state.

---

## Part D — Tab 3: Predictive Maintenance

*Purpose of the tab: hardware health and failure prediction. Answers "what breaks next?"*

### 3.1 Device Risk Score Matrix
- **What:** Top 25 devices by weighted composite score:
  `10·hwFaults + 6·unplannedReboots + 4·criticalHealth + 1.5·degradedHealth + interfaceErrors/5000`,
  banded Critical / High / Medium / Low.
- **Why:** The centrepiece of the platform. Individual signals are noisy; the weighted composite
  ranks devices by *probability of imminent failure* so field work can be prioritised objectively.
  Planned maintenance reloads are excluded so scheduled work does not inflate risk.
- **How to use:** This is the maintenance queue. Work top-down. Click through to the drawer to
  confirm the dominant contributor before ordering parts — a score driven by reboots needs a
  different fix from one driven by optics errors.
- **Caveat:** Scores are **raw sums, not normalised by time window**. Widening the date range
  inflates every score. Only compare devices within the *same* window.

### 3.2 Health Threshold Breaches by Metric
- **What:** Normal vs degraded vs threshold_exceeded distribution per metric.
- **Why:** Shows which *metric* is failing across the estate — a fleet-wide thermal problem is a
  facilities issue, a fleet-wide memory problem is a firmware issue.
- **How to use:** Use it to decide whether a problem is per-device (go to 3.1) or systemic.

### 3.3 Metric Averages vs Threshold Limits
- **What:** Radial gauges of current averages against configured limits.
- **Why:** Context for 3.2. A metric at 60% of limit is fine; the same absolute value at 95% is not.
- **How to use:** Anything above ~80% of limit should be on the capacity plan, even with no faults yet.
- **Caveat:** Some metrics currently average only 1–2 readings per device per window. Low sample
  counts mean low confidence — do not over-read thermal and fan averages.

### 3.4 Interface Error Degradation Trend
- **What:** Cumulative PHY bit-error slope over time.
- **Why:** **The most genuinely predictive card here.** Optics and cabling degrade gradually; the
  *slope* is the failure signal, and it appears days to weeks before the link actually drops.
- **How to use:** Ignore the absolute value, watch the gradient. A steepening curve is a
  scheduled-swap trigger. Flat-but-high is a device that already failed and stabilised.

### 3.5 Hardware Faults by Component
- **What:** PSU, SFP, fan, DRAM and ASIC failure counts.
- **Why:** Drives spares inventory and identifies bad batches — the same component failing across
  many devices of the same model is a vendor problem, not bad luck.
- **How to use:** Feed the top component into your spares stocking level. Escalate clusters to
  the vendor with the CSV export attached.

### 3.6 Fault Rate Normalized by Device Type
- **What:** Average hardware faults per installed device of each type.
- **Why:** Corrects the volume bias in 3.5. If you own 500 switches and 20 routers, switches will
  always dominate raw counts even when routers are far less reliable per unit.
- **How to use:** This is the card for platform/vendor decisions and refresh-cycle planning. 3.5
  tells you what to stock; 3.6 tells you what to stop buying.

### 3.7 Unexpected Reboot Ranking
- **What:** Devices ranked by crash loops and kernel resets.
- **Why:** Unplanned reboots are the strongest single predictor of imminent total failure and
  carry the heaviest weight after hardware faults in the 3.1 model.
- **How to use:** Anything rebooting more than once in a window should be drained of traffic
  before it fails hard. Check 2.12 first to rule out a config push as the cause.

### 3.8 Reboot Cause Distribution
- **What:** Watchdogs, panics, brownouts vs planned maintenance.
- **Why:** Separates the device's fault from the environment's fault. Brownouts are a facilities
  and UPS problem; watchdog resets and panics are firmware or hardware.
- **How to use:** Read immediately after 3.7 — same devices, different question. Brownout-dominated
  sites need a power review, not a hardware swap.

### 3.9 Thermal & Fan Outliers
- **What:** Peak temperature (°C) and peak fan speed (RPM) by device type on a dual axis.
- **Why:** Heat is the primary accelerant of electronic failure. The pairing is the insight: high
  temp **with** high RPM means cooling is working but losing; high temp with **low** RPM means the
  fan has failed and the device is minutes-to-hours from thermal shutdown.
- **How to use:** High temp + low RPM is an emergency. High temp + high RPM is a rack airflow or
  ambient problem — check neighbouring devices at the same site.

### 3.10 Optics / SFP Degradation Watchlist
- **What:** Transceiver signal attenuation and laser fault watchlist.
- **Why:** Optics fail gradually and predictably, making them the ideal proactive-replacement
  target. A cheap SFP swapped on schedule prevents an expensive unplanned link outage.
- **How to use:** Cross-reference with 1.2. A port on both the flap leaderboard and this watchlist
  is a confirmed failing transceiver — swap it, do not troubleshoot it further.

### 3.11 Maintenance Backlog by Site
- **What:** Major and critical maintenance items grouped by site.
- **Why:** Converts device-level risk into a dispatch plan. Engineer travel is the expensive part
  of field maintenance, so batching by site is where the real cost saving is.
- **How to use:** Plan one visit per site covering every item, rather than one visit per device.
  Combine with the Location filter to build a regional route.

---

## Part E — Recommended Investigation Workflows

**"Users at a site report intermittent problems"**
1. Location filter → that site. Date & Time → 7d.
2. 1.7 heatmap — which zone?
3. 1.2 flaps and 1.3 adjacency — link or routing?
4. 3.10 optics — is the flapping port a failing transceiver?
5. Device drawer to confirm, then 3.11 to batch the fix with other work at that site.

**"Something broke this morning"**
1. Date & Time → custom range covering the last 12 hours.
2. 2.12 Configuration Change Audit — was it us?
3. 3.7 Unexpected Reboots — did something crash?
4. 1.1 severity trend — is it escalating or already recovering?

**"Plan next quarter's hardware spend"**
1. Date & Time → 90d for a stable sample.
2. 3.6 normalised fault rate — which platform is unreliable?
3. 3.5 component faults — what to stock.
4. 3.1 risk matrix — which specific units to replace first.
5. 3.11 backlog by site — build the dispatch route.

**"Weekly security review"**
1. 2.11 DNS sinkhole hits — any internal compromise? (highest priority)
2. 2.8 privilege escalation — any *successful* unexpected escalations?
3. 2.2 risky users, sorted by distinct countries.
4. 2.4 / 2.5 external pressure — anything new worth blocklisting.
5. 2.10 port-security — any unauthorised physical connections.

---

## Part F — Known Limitations to Keep in Mind

1. **Credentials are bundled into the browser build.** Anyone loading the page can read the Neo4j
   credentials. Move to a server-side API layer before wider rollout.
2. **Risk scores are not time-normalised.** Only compare 3.1 scores within the same date range.
3. **Location hierarchy is inferred**, not stored. Region/country/city come from site-name parsing
   in `src/lib/locations.ts`.
4. **Card 1.4 (routing topology) is not rendered** despite its query and component existing.
5. **Sparse health telemetry** limits confidence in 3.3 thermal and fan averages.
6. **Cache is 15 seconds.** Use the header refresh after any intervention.
7. **Cards with hard-coded severity filters** will show empty states when a conflicting global
   severity filter is applied — this is expected, not a failure.
