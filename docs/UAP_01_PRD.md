**UPSA ASSEMBLY PLATFORM**  
**Product Requirements Document**  
An internal operations system for the UPSA computer assembly unit: imports and procurement, stores, assembly, quality control, internal sales and dispatch, finance, warranty and repairs.

<table><tbody><tr><td><strong>Project</strong></td><td>UPSA Assembly Platform (UAP) — internal operations ERP</td></tr><tr><td><strong>Document</strong></td><td>PRD</td></tr><tr><td><strong>Version</strong></td><td>2.0 — Draft for UPSA review (internal-use scope)</td></tr><tr><td><strong>Date</strong></td><td>3 October 2026</td></tr><tr><td><strong>Prepared by</strong></td><td>Codey Dev (Aka Brown), software &amp; security</td></tr><tr><td><strong>Prepared for</strong></td><td>University of Professional Studies, Accra — Computer Assembly Unit</td></tr></tbody></table>

_Colours follow UPSA’s published Navy Blue (Pantone 281C) and Gold (Pantone 1245C); hex values are screen approximations to confirm against UPSA’s brand guide._  
**Contents**  
01 Executive summary  
02 Problem, goals and success metrics  
03 Roles and responsibilities  
04 Benchmark: what was adopted, adapted and rejected  
05 Scope and release plan  
06 Functional requirements  
07 Business rules  
08 Non-functional requirements  
09 Compliance and regulatory notes  
10 Assumptions, risks and open items  
11 Release acceptance criteria

1\. Executive summary
=====================

The assembly unit imports components, builds computers, tests them, supplies them to UPSA departments and staff, and supports them under warranty. The UPSA Assembly Platform (UAP) is one system of record for that whole chain, used only by internal staff. There is no point of sale and no public website in this release.

*   **Imports and procurement:** suppliers, requisitions, purchase orders, shipment tracking, customs entries, clearing-agent costs and landed cost.
*   **Stores:** an append-only stock ledger across several locations with lot and serial tracking.
*   **Production:** assembly orders, per-unit checklists, tests, quality inspection and a full component genealogy for every computer.
*   **Internal sales and dispatch:** orders from departments and staff, approvals, reserved serial units, dispatch notes, invoices to named accounts.
*   **Finance and service:** payments, expenses, budgets, a lightweight ledger with period lock and export, warranty register, repair tickets and supplier claims.
*   **Management view:** approvals, KPIs and reports across all of it.

<table><tbody><tr><td><strong>The idea the whole system rests on</strong><br>Every finished computer carries a <strong>genealogy</strong>: the exact component serials and lots, the shipment and landed cost behind them, the technician, the tests and the inspector. Costing, warranty, supplier claims and recalls all read from that one trail.</td></tr></tbody></table>

<table><tbody><tr><td><strong>Built to grow</strong><br>The API is designed so other clients can be added later (a public storefront, a POS, a mobile app) without changing business rules. They are explicitly out of scope now.</td></tr></tbody></table>

2\. Problem, goals and success metrics
======================================

2.1 Problems being solved
-------------------------

*   Import costs (freight, duty, clearing, demurrage) are not tied to the goods, so unit cost and margin are guesses.
*   Shipments are tracked in messages and spreadsheets; nobody can say what is on the water or held at customs.
*   Stock and component costs are unreliable, so ordering and pricing suffer.
*   No provable link from a delivered computer to its parts, so warranty disputes and supplier claims cannot be settled with evidence.
*   Approvals happen informally; there is no record of who allowed what.
*   Sales, production, warranty and finance are separate records, so month-end is manual.

2.2 Goals and targets (12 months after go-live)
-----------------------------------------------

| **Goal** | **Metric** | **Target** |
| --- | --- | --- |
| True unit cost | Shipments with landed cost allocated within 5 working days of clearance | ≥ 95%; every finished unit carries actual cost |
| Shipment visibility | Open shipments with current status and ETA | 100%; delay alerts raised ≥ 3 days before ETA slips |
| Stock trust | Cycle-count accuracy; serialised parts reconciled | ≥ 98% of SKUs in tolerance; 100% of serials |
| Traceability | Finished units with full component genealogy | 100% |
| Quality | First-pass QC yield; defects coded | ≥ 95%; 100% coded |
| Control | Approvals recorded for in-scope actions | 100% with approver, time and reason |
| Speed of build | Assembly order released to finished-goods receipt | Baseline in month 1, then 20% faster |
| After-sales | Warranty claims acknowledged and resolved within SLA | ≥ 90% |
| Finance | Month-end close time | ≤ 3 working days |

3\. Roles and responsibilities
==============================

Seven roles. Access is controlled by scopes grouped into role templates, so a role can be adjusted without code changes. Only the Super Admin holds the administrator flag. Students are not users of this system.

| **#** | **Role** | **Primary responsibility** | **Main modules** |
| --- | --- | --- | --- |
| 1 | **Super Admin** | System administration, users, roles and scopes, configuration, security, audit review | Admin console, settings, audit |
| 2 | **Management** | Approvals, oversight, KPIs, reports, business decisions | Approvals, dashboards, all reports (read), budgets |
| 3 | **Procurement & Imports Officer** | Suppliers, purchasing, shipments, customs, clearing, landed costs, supplier claims | Procurement, imports, landed cost |
| 4 | **Inventory & Sales Officer** | Warehouse and stock, goods receipt, stock counts, internal sales and order processing, dispatch, build planning | Inventory, internal orders, dispatch, assembly planning |
| 5 | **Finance & Service Officer** | Finance, payments, expenses, invoices, ledger, warranty, repairs, after-sales service | Finance, warranty register, service tickets |
| 6 | **Assembly Technician** | Builds units, logs checklist steps and tests, performs repairs on assigned tickets | Production bench, assigned repairs |
| 7 | **QC Inspector** | Inspects incoming goods and finished units, records defects, passes or fails, retests after repair | Quality control |

Roles 6 and 7 were added to the original five because production and quality need their own accountability. Segregation of duties is enforced in code: the inspector of a unit cannot be the technician who built it, and a requester cannot approve their own request.

4\. Benchmark: what was adopted, adapted and rejected
=====================================================

Systems studied: ERPNext, Odoo (manufacturing, inventory, repairs and RMA), SAP Business One, Microsoft Dynamics 365 Business Central, and lightweight MRP tools. The aim was to take proven ideas, not to copy a product.

| **Idea from established systems** | **Decision** | **Why** |
| --- | --- | --- |
| Landed cost vouchers allocating freight, duties and handling to received goods | **Adopted** (core) | Imports are central to this unit; valuation must reflect real cost |
| Serial and batch traceability in both directions | **Adopted** (core) | Warranty, recalls and supplier claims depend on it |
| Versioned BOM, work orders, job-card style steps | **Adopted**, simplified | One unit type family and a short routing; no machine capacity planning |
| Quality inspection at receipt and in production | **Adopted** | Rejects are caught before they enter stock |
| Warranty check against delivery date with zero-charge internal costing of covered repairs | **Adopted** | Gives the true cost of after-sales support |
| Spare-part warranty and supplier RMA | **Adopted** | Recovers value from faulty components |
| Approval workflows with thresholds and delegation | **Adopted** | Management oversight requires evidence |
| Budget versus actual by cost centre; period closing | **Adopted**, light | Finance control without a full ERP finance suite |
| Full MRP with demand forecasting and capacity planning | **Deferred** | A buildable-quantity view and reorder suggestions cover current needs |
| Full chart-of-accounts, fixed assets, payroll, HR | **Rejected** | UPSA finance remains the system of record; UAP exports |
| POS, e-commerce storefront, customer portal, online payments | **Removed** for now | Internal-only scope; API stays ready for them |
| Subcontracting, multi-company, multi-warehouse routing rules | **Rejected** | Not applicable at this scale |
| Helpdesk with customer self-service | **Rejected**; staff-logged tickets only | No external users |

<table><tbody><tr><td><strong>Build versus adopt</strong><br>ERPNext covers a large share of this scope without licence fees. UAP is custom because the unit’s import workflow, serial genealogy rules, UPSA approvals and brand fit are specific, and because UPSA will own the code and can extend it. If time-to-go-live ever outweighs fit, ERPNext remains a credible alternative.</td></tr></tbody></table>

5\. Scope and release plan
==========================

5.1 In scope
------------

Web application for the seven roles, background jobs, in-app and email notifications, document generation (PO, GRN, dispatch note, invoice, warranty certificate, labels), Excel/CSV import wizard, reports with export, audit trail, lightweight ledger with period lock, and a versioned API ready for other clients.

5.2 Out of scope (this release)
-------------------------------

*   POS and cashier sessions; public website, customer portal and online payments; SMS and WhatsApp.
*   Payroll, HR, fixed assets, and replacement of UPSA’s institutional finance system.
*   Native mobile apps (the web app is responsive for tablets at the bench and store).
*   Student accounts of any kind.

5.3 Release plan
----------------

_Indicative, assuming 2–3 engineers and a designer; fixed after discovery._

| **Phase** | **Focus** | **Length** |
| --- | --- | --- |
| 0 Discovery | Workshops, confirm tax and customs rules, approval limits, warranty terms; collect Excel data; hardware audit; hosting latency test; brand asset collection | 2 weeks |
| 1 Core | Identity and roles, catalogue and BOM, suppliers, requisitions and POs, shipments and customs, goods receipt and landed cost, stock ledger with lots and serials, assembly orders with checklists and tests, QC, internal orders and dispatch, invoices and payment recording, warranty register, basic repairs, approvals, audit, import wizard, core reports | 12–14 weeks |
| 2 Depth | Supplier RMA and scorecards, cycle counts, lightweight ledger and period lock with export, budgets, full repair workflow with SLA, licence and OS imaging records, buildable-quantity and reorder suggestions, scheduled report emails, e-waste register | 8 weeks |
| 3 Intelligence and reach | Forecasting, repair knowledge base, UPSA system integrations, GRA e-invoicing if mandated, first additional client (for example a department request portal) on the existing API | Ongoing |

6\. Functional requirements
===========================

_Priority: M must, S should, C could. Phase refers to section 5.3. Roles: SA, MG, PI, IS, FS, AT, QI._

6.1 Identity, administration and approvals
------------------------------------------

| **ID** | **Requirement** | **Pri** | **Ph** |
| --- | --- | --- | --- |
| FR-ID-01 | Invite-only accounts; email and password with mandatory TOTP multi-factor authentication for all roles; optional single sign-on later. | M | 1 |
| FR-ID-02 | Seven role templates mapped to scopes; the Super Admin can adjust scopes per user; only the Super Admin has the administrator flag. | M | 1 |
| FR-ID-03 | Immediate suspension of a user; sessions revoked; leaver checklist. | M | 1 |
| FR-ID-04 | Every create, update, approve, void and price or cost change is written to an append-only audit log with actor, time, before and after. | M | 1 |
| FR-ID-05 | Configurable approval rules by action and amount (PO, stock write-off, discount or price override, refund, expense, period close) with named approvers, delegation and escalation after a time limit. | M | 1 |
| FR-ID-06 | Management approves from an inbox showing requester, amount, reason, history and attachments; rejection needs a comment. | M | 1 |
| FR-ID-07 | Settings console for tax rates, exchange rates, document numbering, warranty defaults, approval limits, locations, cost centres and email templates. | M | 1 |
| FR-ID-08 | API clients (service credentials with limited scopes) for future integrations; disabled by default. | S | 2 |

6.2 Catalogue, bill of materials and master data
------------------------------------------------

| **ID** | **Requirement** | **Pri** | **Ph** |
| --- | --- | --- | --- |
| FR-CT-01 | Items of kinds: finished good, component, accessory, consumable, packaging; categories, brands, specifications, HS code, weight, tracking mode (none, lot, serial) and default warranty. | M | 1 |
| FR-CT-02 | Item families (for example a laptop model) with variants. | M | 1 |
| FR-CT-03 | Versioned BOM per finished item; one active version; assembly orders snapshot the version they use. | M | 1 |
| FR-CT-04 | Approved alternative components on a BOM line with automatic fallback when the primary is short. | S | 2 |
| FR-CT-05 | Internal price list with default selling price per item, and optional department or staff rates; margin guardrail against current cost. | M | 1 |
| FR-CT-06 | Customs tariff table (HS code, duty and levy rates, effective dates) used to estimate duty on shipments. | S | 2 |
| FR-CT-07 | Named customer accounts (departments, staff, units, external organisations) with contact, cost centre and credit limit. | M | 1 |
| FR-CT-08 | Locations: warehouse, assembly WIP, repair bench, quarantine, in-transit, dispatch. | M | 1 |

6.3 Procurement and suppliers
-----------------------------

| **ID** | **Requirement** | **Pri** | **Ph** |
| --- | --- | --- | --- |
| FR-PR-01 | Supplier directory with country, contacts, payment terms, lead time, currency, rating, status; bank details stored encrypted and changes require approval. | M | 1 |
| FR-PR-02 | Requisitions raised manually, from reorder rules, or from production shortages; approval by rule. | M | 1 |
| FR-PR-03 | Purchase orders in the supplier’s currency with exchange-rate capture, incoterm, shipping mode, expected dates; approval by amount; PDF to supplier; partial deliveries. | M | 1 |
| FR-PR-04 | Supplier invoices with three-way match (PO, receipt, invoice) and variance flags; payments recorded against them. | S | 2 |
| FR-PR-05 | Supplier RMA for items rejected on receipt, failed in production or in service, with credit or replacement tracking. | S | 2 |
| FR-PR-06 | Supplier scorecards: on-time delivery, reject rate, defect rate by lot, price trend. | C | 3 |
| FR-PR-07 | Warranty terms per supplier and item category (months, start basis, claim window) so component coverage is known per serial and lot. | S | 2 |

6.4 Imports, shipments, customs and landed cost
-----------------------------------------------

| **ID** | **Requirement** | **Pri** | **Ph** |
| --- | --- | --- | --- |
| FR-IM-01 | Shipment record for sea, air, road or courier with bill of lading or air waybill, containers, carrier, forwarder, clearing agent, ports, ETD, ETA and actual arrival. | M | 1 |
| FR-IM-02 | A shipment can carry lines from several POs, and a PO can ship in several shipments. | M | 1 |
| FR-IM-03 | Timeline of shipment events (booked, departed, arrived, customs lodged, assessed, paid, released, delivered, held) with source and note; delay alerts when ETA slips. | M | 1 |
| FR-IM-04 | Customs entry per shipment: declaration number, regime, customs value, duty, VAT and levies, status, agent, dates, inspection outcome. | M | 1 |
| FR-IM-05 | Charges captured against a shipment: freight, insurance, duty, port charges, clearing fees, inspection, local transport, demurrage and storage, each with currency, rate, vendor, invoice reference and recoverability (for example recoverable VAT is not cost). Estimated charges can be replaced by actuals. | M | 1 |
| FR-IM-06 | Landed-cost allocation across received lines by value, weight, volume, quantity or manual split; posting updates lot cost and moving-average cost; a run can be reversed and re-run. | M | 1 |
| FR-IM-07 | Document vault per shipment (invoice, packing list, bill of lading, customs entry, release order, photos) with required-document checklist before closing. | M | 1 |
| FR-IM-08 | Duty estimator at PO stage from HS codes and the tariff table; estimated versus actual variance report. | S | 2 |
| FR-IM-09 | Demurrage and storage exposure view: free days remaining per container or consignment. | S | 2 |

6.5 Inventory and stores
------------------------

| **ID** | **Requirement** | **Pri** | **Ph** |
| --- | --- | --- | --- |
| FR-IN-01 | Stock is an append-only ledger of movements; on-hand and available stock are always derived, never typed. | M | 1 |
| FR-IN-02 | Goods receipt against PO and shipment: scan or key quantities, lot numbers and component serials; accepted and rejected quantities with photos; rejects go to quarantine. | M | 1 |
| FR-IN-03 | Incoming inspection by a QC Inspector before goods are released to stock where an item or supplier requires it. | M | 1 |
| FR-IN-04 | Serial capture for high-value components (CPU, motherboard, SSD, RAM) and lot tracking for the rest; configurable per item. | M | 1 |
| FR-IN-05 | Moving-average cost with append-only history; landed cost included. | M | 1 |
| FR-IN-06 | Reservations hold stock or specific units for orders and assembly orders with release and expiry. | M | 1 |
| FR-IN-07 | Transfers between locations with an in-transit state and receipt confirmation. | M | 1 |
| FR-IN-08 | Adjustments and write-offs with reason code; approval above the limit; posted as ledger entries. | M | 1 |
| FR-IN-09 | Cycle counts and full stock takes with scanner or keyboard entry; variances approved before posting. | S | 2 |
| FR-IN-10 | Reorder policies and low-stock alerts; reorder suggestions that account for open POs and shipments in transit. | M | 1 |
| FR-IN-11 | Barcode and QR labels for items, bins and units on standard sheets or label printers. | M | 1 |
| FR-IN-12 | Excel/CSV import wizard (items, suppliers, accounts, BOMs, opening stock) with validation report before commit and rollback. | M | 1 |

6.6 Production and traceability
-------------------------------

| **ID** | **Requirement** | **Pri** | **Ph** |
| --- | --- | --- | --- |
| FR-PD-01 | Assembly orders for stock or for an internal order; priority, planned dates, quantity, routing. | M | 1 |
| FR-PD-02 | Material check against the BOM snapshot, including stock in transit; shortages create requisitions and hold the order at awaiting materials. | M | 1 |
| FR-PD-03 | Buildable-quantity view per model: how many can be built now, what limits it. | S | 2 |
| FR-PD-04 | Release reserves materials; issue to WIP by scanning; returns and scrap recorded against the order. | M | 1 |
| FR-PD-05 | One unit record per planned computer; routing steps with checklists, timestamps and technician; steps cannot be skipped unless marked optional. | M | 1 |
| FR-PD-06 | Test runs (POST, burn-in, stress, battery, display, network, thermal) with pass or fail, metrics and an uploaded log. | M | 1 |
| FR-PD-07 | OS image and licence assignment per unit; licence keys encrypted and visible only to scoped users. | S | 2 |
| FR-PD-08 | Production board showing orders, units by stage, blockers and technician workload. | M | 1 |
| FR-PD-09 | Genealogy: for a serial show components (serials, lots, shipment, supplier, landed cost), steps, tests and inspector; reverse: which units contain lot X. | M | 1 |

6.7 Quality control
-------------------

| **ID** | **Requirement** | **Pri** | **Ph** |
| --- | --- | --- | --- |
| FR-QC-01 | Inspection of finished units with checklist, defect codes and severity, photos; result pass, fail or conditional. | M | 1 |
| FR-QC-02 | The inspector cannot be the technician who built the unit; enforced by the system. | M | 1 |
| FR-QC-03 | Failure creates a rework order; the unit returns to testing; re-inspection required. | M | 1 |
| FR-QC-04 | Pass assigns the final serial, writes the cost snapshot, prints the label, receives the unit into finished goods and prepares the warranty template. | M | 1 |
| FR-QC-05 | Defect analytics by supplier, lot, model, technician and defect code. | S | 2 |

6.8 Internal sales and dispatch
-------------------------------

| **ID** | **Requirement** | **Pri** | **Ph** |
| --- | --- | --- | --- |
| FR-SL-01 | Internal orders for named accounts (departments, staff, units): source document reference (memo, email, LPO), lines, required date, delivery point. | M | 1 |
| FR-SL-02 | Prices, discounts and tax snapshotted at confirmation; price overrides and discounts above limit require approval. | M | 1 |
| FR-SL-03 | Stock check on entry; in-stock lines reserve specific serial units; out-of-stock lines can generate an assembly order and show an honest ready date. | M | 1 |
| FR-SL-04 | Dispatch notes listing units with serials; handover with recipient name, phone and signature or photo; partial dispatch supported. | M | 1 |
| FR-SL-05 | Returns with reason, approval, condition check, restock or quarantine, and credit note. | M | 2 |
| FR-SL-06 | Order status visible to the requesting account contact by email notification only (no login). | C | 2 |

6.9 Finance
-----------

| **ID** | **Requirement** | **Pri** | **Ph** |
| --- | --- | --- | --- |
| FR-FN-01 | Proforma and tax invoices and credit notes with sequential numbering per series; PDF output. | M | 1 |
| FR-FN-02 | Record payments received (cash, bank transfer, mobile money, cheque, internal transfer) and made to suppliers; allocate to invoices; reconciliation view for unallocated payments. | M | 1 |
| FR-FN-03 | Expenses with categories, cost centres, receipts and approval. | S | 2 |
| FR-FN-04 | Budgets by cost centre and period with budget versus actual. | S | 2 |
| FR-FN-05 | Lightweight double-entry ledger with automatic postings (receipt, landed cost, finished unit, dispatch and cost of sales, payment, adjustment), fiscal periods, period lock, trial balance. | M | 2 |
| FR-FN-06 | Multiple currencies: exchange rates by date and source; transactions keep their rate; realised differences posted on settlement. | M | 1 |
| FR-FN-07 | Tax rates configurable with effective dates; VAT summary by period; CSV and Excel export of journals, invoices and payments for UPSA finance. | M | 1 |
| FR-FN-08 | Margin reporting per model and per unit using actual landed and build cost. | M | 1 |

6.10 Warranty and service
-------------------------

| **ID** | **Requirement** | **Pri** | **Ph** |
| --- | --- | --- | --- |
| FR-WR-01 | Warranty record created at dispatch handover from the unit serial; default term from the item (12 months standard); extended terms by approval. | M | 1 |
| FR-WR-02 | Serial lookup shows warranty status, genealogy, components and supplier coverage per component. | M | 1 |
| FR-WR-03 | Service tickets (warranty claim, paid repair, inspection, complaint) with SLA clock, diagnosis, quote, account approval, parts from stock (updating genealogy), retest and collection notice. | M | 1 |
| FR-WR-04 | Covered repairs post at zero charge with true cost captured; billable repairs create an invoice; goodwill coverage requires approval. | M | 2 |
| FR-WR-05 | Faulty component in a covered unit can open a supplier RMA when still within the supplier warranty. | S | 2 |
| FR-WR-06 | Loaner unit assignment during repair. | C | 2 |
| FR-WR-07 | Repair knowledge base with semantic search over past tickets. | C | 3 |

6.11 Reporting, notifications and audit
---------------------------------------

| **ID** | **Requirement** | **Pri** | **Ph** |
| --- | --- | --- | --- |
| FR-RP-01 | Management dashboard: shipments in transit and delayed, landed cost versus estimate, stock health, units by stage, orders awaiting approval or dispatch, open tickets, budget position. | M | 1 |
| FR-RP-02 | Standard reports: stock valuation and ageing, ABC analysis, reorder list, shipment and customs status, supplier performance, production yield, technician productivity, sales by account, margin, warranty exposure, aged receivables and payables, VAT. | M | 1 |
| FR-RP-03 | Export to CSV, Excel and PDF with the same filters as the screen; scheduled report emails. | S | 2 |
| FR-NT-01 | In-app notifications and email for approvals, shipment delays and events, low stock, ready-for-dispatch, warranty expiry, SLA breaches; per-user preferences. | M | 1 |
| FR-SU-01 | E-waste register for scrapped and replaced parts with disposition and recycler reference. | C | 2 |

7\. Business rules
==================

1.  A serialised unit is dispatched at most once; its status changes only through recorded events.
2.  On-hand stock is derived from the ledger; corrections are new ledger rows, never edits.
3.  Prices, tax, exchange rates and discounts on an order, invoice or purchase order are frozen when confirmed.
4.  Landed cost is allocated to received lines and becomes part of lot and unit cost; recoverable taxes are not cost.
5.  An assembly order uses the BOM version captured at release.
6.  A unit cannot receive a final serial or enter sellable stock without passed tests and a passed QC inspection by someone other than its builder.
7.  Warranty starts at handover to the account, not at build or invoice date, and is tied to the unit serial.
8.  A requester cannot approve their own request; approvals above a limit need Management.
9.  Closed fiscal periods are read-only; corrections post in the current period.
10.  Supplier bank detail changes require approval and are logged.
11.  Documents (customs entry, bill of lading, invoice) are retained against the shipment for the configured retention period.

8\. Non-functional requirements
===============================

| **Area** | **Requirement** |
| --- | --- |
| Performance | Lists load in ≤ 2 s for 50k rows (paginated). Document saves ≤ 800 ms p95. Dashboards ≤ 2 s. API reads p95 ≤ 300 ms. Reports of 100k rows export in ≤ 30 s as a background job. |
| Availability and recovery | 99.5% monthly in business hours (planned maintenance outside hours). RPO ≤ 5 minutes with point-in-time recovery; RTO ≤ 4 hours. |
| Capacity baseline | About 30 named users (up to 15 concurrent), a few hundred units per month, about 300 SKUs, 10 years of history. Confirmed in discovery. |
| Security | TLS everywhere, MFA for all, row-level security on every table, least-privilege scopes, encrypted secrets and licence keys, rate limiting, dependency and code scanning in CI. |
| Data integrity | Money as integer minor units with currency; database constraints enforce stock, serial and uniqueness rules; idempotency keys on mutating endpoints. |
| Accessibility | WCAG 2.2 AA; full keyboard operation of data entry and scanning flows. |
| Usability | Primary tasks learnable in under 30 minutes of role-based training; works on 1366×768 laptops and 10" tablets. |
| Localisation | English; GH₵ as base currency; Ghana phone formats and GhanaPostGPS addresses; date format 3 Oct 2026. |
| Observability | Structured logs, traces and error tracking; business alerts for stuck jobs, failed postings and shipment delays. |
| Extensibility | Versioned REST API, typed contracts, modules with clear boundaries so new clients and features do not require rewrites. |

9\. Compliance and regulatory notes
===================================

<table><tbody><tr><td><strong>Confirm with UPSA legal, finance and the clearing agent</strong><br>These are working assumptions from general knowledge; rules, rates and thresholds change.</td></tr></tbody></table>

*   **Data Protection Act, 2012 (Act 843):** the system holds staff and account-contact personal data; confirm registration, a named data-protection contact and a retention schedule.
*   **Customs:** capture the declaration number and status from the customs system used by the agent; duty, VAT and levy rates sit in dated tables, not in code.
*   **Tax:** VAT and levies configurable by effective date; confirm VAT registration and whether e-invoicing applies to the unit’s invoices.
*   **Public-sector context:** purchases may follow UPSA procurement thresholds; approval limits should reflect them.
*   **E-waste:** confirm disposal and recycler documentation obligations.

10\. Assumptions, risks and open items
======================================

10.1 Decisions already made
---------------------------

| **Topic** | **Decision** |
| --- | --- |
| Roles | Seven roles as in section 3; technician and QC inspector added |
| Internal sales | To departments and staff, invoiced to named accounts |
| Accounting | Lightweight ledger, period lock, CSV/Excel export to UPSA finance |
| Imports | Sea and air, clearing agents, multiple currencies with exchange-rate capture |
| Approvals | POs, stock write-offs, discounts and price overrides, refunds above configurable limits |
| Scale | A few hundred units a month, about 300 SKUs |
| Tracking | Serials for CPU, motherboard, SSD, RAM; lots for the rest |
| Warranty | 12 months standard with supplier back-to-back tracked |
| Locations | Several (warehouse, assembly, repair bench, quarantine, dispatch) |
| Hosting | Cloud in Frankfurt or London after a latency test |
| Data | Excel import wizard |
| Notifications | In-app and email only |
| Future | API designed for later clients |

10.2 Risks
----------

| **Risk** | **Impact** | **Mitigation** |
| --- | --- | --- |
| Poor data at go-live (stock, costs, suppliers) | Wrong valuation, lost trust | Import wizard with validation, supervised stock take, two-week parallel run |
| Landed-cost rules disputed internally | Delays and rework | Agree allocation methods and tax treatment in discovery; keep method per charge configurable |
| Scope growth | Late delivery | Phase gating; Phase 1 limited to M items |
| Exchange-rate sources disputed | Valuation disagreements | Named rate source per currency and date; manual override approved and audited |
| Adoption by bench and store staff | Workarounds, data gaps | Role-based training, scanner-first flows, early pilot with one build line |
| Fraud and insider risk | Financial loss | Approval rules, segregation of duties, immutable audit, supplier bank-change approval |
| Single-vendor dependence | Outage or price change | Standard Postgres, portable code, nightly external backups |

10.3 Items still to confirm in discovery
----------------------------------------

1.  Exact approval limits per action and approver names.
2.  Standard and extended warranty terms and exclusions; supplier warranty terms by category.
3.  Customs process details: agents used, entry system, documents required, and demurrage terms.
4.  Tax treatment: VAT registration, recoverable versus non-recoverable amounts, levies.
5.  Exchange-rate source (bank, central bank, or agent rate) and currencies used.
6.  Official UPSA logo files and brand guide (colours below are approximated from published CMYK/Pantone values).
7.  Printer and label hardware, scanners and tablets available.
8.  Whether UPSA IT or Codey Dev operates production, and who owns the cloud accounts.

11\. Release acceptance criteria
================================

*   All M requirements for the phase pass acceptance tests witnessed by the business owner.
*   End-to-end demonstration: requisition → approved PO → shipment with customs entry and charges → goods receipt and inspection → landed cost allocated → assembly order → tests and QC → internal order and dispatch → invoice and payment → warranty claim → repair and supplier RMA, with genealogy and costs shown for the unit.
*   Reconciliation: system stock equals a supervised count within tolerance; ledger balances; landed cost per shipment equals recorded charges.
*   Security: RLS test suite green, MFA enforced, no open high or critical findings, backup restore rehearsed successfully.
*   Performance budgets in section 8 met with realistic seeded data.
*   Role-based training delivered and one-page runbooks handed over for each role.