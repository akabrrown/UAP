**UPSA ASSEMBLY PLATFORM**  
**User Manual & Standard Operating Procedures (SOP)**  
The definitive operations guide for staff, technicians, inspectors, and administrators across the UPSA Computer Assembly Unit.

<table><tbody><tr><td><strong>Project</strong></td><td>UPSA Assembly Platform (UAP) — internal operations ERP</td></tr><tr><td><strong>Document</strong></td><td>UAP_07_User_Manual (Operational Guide &amp; SOPs)</td></tr><tr><td><strong>Version</strong></td><td>2.0 — Production Reference (Internal-Use Scope)</td></tr><tr><td><strong>Date</strong></td><td>22 October 2026</td></tr><tr><td><strong>Prepared by</strong></td><td>Codey Dev (Aka Brown), software &amp; security</td></tr><tr><td><strong>Prepared for</strong></td><td>University of Professional Studies, Accra — Computer Assembly Unit</td></tr></tbody></table>

_Colours follow UPSA’s published Navy Blue (Pantone 281C) and Gold (Pantone 1245C); hex values are screen approximations to confirm against UPSA’s brand guide._

---

## Table of Contents
1. **System Overview & Operating Principles**
2. **Access Control, Authentication & Navigation Shell**
3. **Role-Based Quick-Start Walkthroughs**
   - 3.1 Super Admin (SA)
   - 3.2 Managing Director / Operations Manager (MG)
   - 3.3 Procurement & Imports Officer (PI)
   - 3.4 Inventory & Stores Officer (IS)
   - 3.5 Assembly Technician (AT)
   - 3.6 Quality Inspector (QI)
   - 3.7 Finance & Service Officer (FS)
4. **Standard Operating Procedures (SOP) by Operational Module**
   - SOP-01: Supplier Registration & Purchase Order Execution
   - SOP-02: International Shipment Tracking & Landed Cost Apportionment
   - SOP-03: Goods Receipt Note (GRN) Inspection & Stores Inward
   - SOP-04: Inventory Transfers, Serialization & Dual-Custody Adjustments
   - SOP-05: Assembly Order Execution & Technician Bench Scanning
   - SOP-06: Quality Control Inspection, Defect Logging & Rework
   - SOP-07: Internal Departmental Sales, Allocation & Physical Dispatch
   - SOP-08: Invoicing, Departmental Chargebacks & Fiscal Period Locking
   - SOP-09: Warranty Verification, RMA Intake & Service Ticket Resolution
   - SOP-10: System Administration, Approval Rule Simulation & Audit Forensics
5. **Thermal Barcode & QR Label Printing Standards**
6. **Multi-Tier Approvals & Governance Thresholds**
7. **Troubleshooting, Validation Safeguards & FAQs**
8. **Disaster Recovery & Offline Fallback Procedures**
9. **Glossary of Operational & Technical Terms**

---

# 1. System Overview & Operating Principles

The UPSA Assembly Platform (UAP) is the custom enterprise resource planning (ERP) system designed exclusively for the University of Professional Studies, Accra (UPSA) Computer Assembly Unit. The facility operates as an integrated manufacturing, procurement, internal supply, and after-sales service facility providing high-performance desktop computers, laptops, and peripherals to UPSA faculties, administrative directorates, and staff members.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           UAP SUPPLY CHAIN & GENEALOGY TRAIL                    │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
    ┌───────────────────────┐            │            ┌───────────────────────┐
    │ 1. IMPORTS & PROC     │ ───────────┼──────────> │ 2. STORES & INVENTORY │
    │ Suppliers, POs,       │            │            │ Append-Only Ledger,   │
    │ Customs Landed Cost   │            │            │ Serial/Lot Tracking   │
    └───────────────────────┘            │            └───────────┬───────────┘
                                         │                        │
    ┌───────────────────────┐            │                        ▼
    │ 4. QUALITY CONTROL    │ <──────────┼─────────── ┌───────────────────────┐
    │ 12-Point Checklist,   │            │            │ 3. BENCH PRODUCTION   │
    │ Rework, Certification │            │            │ Assembly Orders,      │
    └───────────┬───────────┘            │            │ Component Scanning    │
                │                        │            └───────────────────────┘
                ▼                        │
    ┌───────────────────────┐            │            ┌───────────────────────┐
    │ 5. SALES & DISPATCH   │ ───────────┼──────────> │ 6. WARRANTY & SERVICE │
    │ Internal Orders,      │            │            │ Exact Part Genealogy, │
    │ Dispatch Handover     │            │            │ Repair Tickets, RMA   │
    └───────────────────────┘            │            └───────────────────────┘
                                         │
```

### The Core Principle: Complete Component Genealogy
Every computer assembled in the UPSA facility possesses an immutable genealogy trail. From the primary chassis barcode, the system establishes a permanent relational link to:
1. **The Exact Component Serials:** Motherboard, CPU, RAM modules, NVMe/SATA storage drives, Power Supply Unit (PSU), and display panel.
2. **The Inward Customs Lot:** The specific overseas shipment, bill of lading, customs entry declaration (ICUMS), exchange rate, and apportioned landed cost.
3. **The Assembly Technician:** The bench operator who executed the assembly checklist and physical integration.
4. **The Quality Inspector:** The QA officer who completed the 12-point hardware, electrical, and stress-testing protocol.
5. **The Departmental Custodian:** The UPSA faculty, directorate, or staff member who received the allocated unit upon dispatch.
6. **The Service History:** All warranty claims, diagnostic logs, replaced components, and field technician interventions.

---

# 2. Access Control, Authentication & Navigation Shell

### 2.1 Sign-In & Security Standards
- **Application URL:** `https://uap.upsa.edu.gh` (or internal network IP during staging).
- **Credentials:** Staff sign in using their registered UPSA institutional email (`username@upsa.edu.gh`) and password.
- **Session Duration:** Active sessions persist for 8 hours of continuous operation. Sessions automatically terminate after 30 minutes of idle inactivity to protect operational workstations on the assembly floor.
- **Brute Force Protection:** Accounts are locked for 15 minutes following 5 consecutive failed login attempts. An alert is dispatched to the Super Admin audit console.

### 2.2 Global Navigation Shell
Upon authenticating, users enter the standardized UAP dashboard shell:
- **Top Header Bar:**
  - *UPSA Assembly Unit Insignia & Active Environment Badge* (Production / Staging).
  - *Global Search & Command Palette:* Quick launcher (`Ctrl + K` or `Cmd + K`) for instantaneous navigation to SKUs, serial numbers, transfer IDs, or purchase orders.
  - *Perspective Switcher (Management & Admin only):* Real-time drop-down allowing executives to switch between role perspectives (Operations, Stores, Procurement, Production, Quality, Finance, Admin) without altering database privileges.
  - *Notification Drawer (Bell Icon):* Real-time notification feed displaying actionable alerts (pending approvals, quality rejections, customs arrivals, low-stock triggers).
  - *User Profile & Session Menu:* Displays staff name, role badge, location assignment, and secure Sign Out action.
- **Sidebar Navigation:** Context-sensitive navigation menu highlighting authorized modules according to assigned RBAC scopes.
- **Breadcrumb Navigation:** Hierarchical location path situated above every operational table and detail view for 1-click parent navigation.

---

# 3. Role-Based Quick-Start Walkthroughs

The UAP platform enforces strict Role-Based Access Control (RBAC). Staff members are provisioned with one of seven primary functional roles:

### 3.1 Super Admin (SA)
*Primary Focus:* Platform health, user provisioning, sequence number configuration, currency exchange rates, and forensic audit logs.
- **Day-in-the-Life:**
  1. Access `/admin/users` to verify active staff accounts and process role assignments for newly hired technicians.
  2. Review `/admin/settings` to ensure daily Bank of Ghana (BoG) exchange rates for USD, EUR, and GBP are synchronized for landed cost calculations.
  3. Inspect `/admin/audit` to review system-wide administrative interventions, failed login attempts, and permission escalations.

### 3.2 Managing Director / Operations Manager (MG)
*Primary Focus:* High-level operational governance, factory throughput, KPI tracking, and dual-custody authorization.
- **Day-in-the-Life:**
  1. Open `/` (Dashboard) to review the live assembly throughput, first-pass quality yield, and customs shipment pipeline.
  2. Navigate to `/approvals` to review pending dual-custody approval requests (inventory adjustments > GHS 500, purchase orders > GHS 50,000, credit limits).
  3. Use the **Perspective Switcher** in the top bar to inspect operational queues from the viewpoint of Procurement, Stores, or Quality leads.

### 3.3 Procurement & Imports Officer (PI)
*Primary Focus:* Supplier vendor relationships, purchase requisitions, overseas shipment monitoring, and landed cost recalculations.
- **Day-in-the-Life:**
  1. Open `/procurement` to monitor active Purchase Orders and supplier lead times.
  2. Access `/imports/shipments` to check maritime and air cargo tracking milestones, updating Estimated Time of Arrival (ETA) dates and clearing statuses.
  3. Navigate to `/imports/landed-cost` upon receiving final clearing agent invoices to apportion freight, customs duties, port charges, and demurrage across received item lines.

### 3.4 Inventory & Stores Officer (IS)
*Primary Focus:* Warehouse physical custody, goods receipt inspection, inter-warehouse transfers, lot tracking, and thermal barcode printing.
- **Day-in-the-Life:**
  1. Open `/procurement/grn` to execute physical goods receipt intake against arriving supplier shipments.
  2. Generate and affix barcode/QR labels via `/inventory/labels` onto incoming component cartons and internal storage bins.
  3. Process transfer requests via `/inventory/transfers` to dispatch required motherboards, RAM, and CPUs to the assembly floor staging buffer.
  4. Perform weekly cycle counts and record variance adjustments via `/inventory/adjustments`.

### 3.5 Assembly Technician (AT)
*Primary Focus:* Bench assembly execution, hardware component scanning, serialization, and hardware build testing.
- **Day-in-the-Life:**
  1. Open `/production/queue` to view assigned assembly orders and target unit counts for the shift.
  2. Enter the **Technician Bench Workspace** (`/production/units/[id]`) on the workstation touch screen.
  3. Scan the chassis barcode, followed by sequential hardware barcode scans (Motherboard, CPU, RAM 1, RAM 2, Storage SSD, PSU).
  4. Complete the 7-step physical assembly checklist, trigger initial power-on validation, and route the completed unit to Quality Inspection.

### 3.6 Quality Inspector (QI)
*Primary Focus:* Defect prevention, 12-point electrical and performance burn-in certification, rework tracking, and release to finished stock.
- **Day-in-the-Life:**
  1. Open `/quality/inspections` to claim arriving units from the physical inspection buffer.
  2. Execute the standardized hardware and BIOS burn-in protocol, recording benchmark results and port validation checks.
  3. If defects are identified: flag the defect category via `/quality/defects` and issue an immediate Rework Order via `/quality/rework`.
  4. If passed: apply digital quality stamp, print the 25x15 mm tamper-evident QC Pass chassis label, and release the unit into Finished Goods stores.

### 3.7 Finance & Service Officer (FS)
*Primary Focus:* 3-way matching, departmental invoicing, warranty tracking, customer RMA intake, and repair bench management.
- **Day-in-the-Life:**
  1. Navigate to `/finance/invoices` to generate internal debit invoices for UPSA departments requesting completed computers.
  2. Access `/service/warranties` to authenticate device warranty coverage when a university staff member presents a damaged or malfunctioning computer.
  3. Open a Service Ticket via `/service/new`, triage the failure mode, and assign replacement components directly from warranty service stock.

---

# 4. Standard Operating Procedures (SOP) by Operational Module

```
═══════════════════════════════════════════════════════════════════════════════════
STANDARD OPERATING PROCEDURE: SOP-01
TITLE: SUPPLIER REGISTRATION & PURCHASE ORDER EXECUTION
MODULE: PROCUREMENT (proc)
ROLES: Procurement Officer (PI), Operations Manager (MG)
═══════════════════════════════════════════════════════════════════════════════════
```

### Purpose
To ensure all component vendors, overseas OEMs, and clearing partners are vetted, registered with valid tax identification (TIN), and engaged through authorized, auditable purchase commitments.

### Step-by-Step Procedure
1. **Access Supplier Register:**
   - Navigate to `/procurement/suppliers`.
   - Click **+ New Supplier** in the top right header.
2. **Input Vendor Details:**
   - Enter *Legal Company Name*, *Trading Name*, *Country of Origin*, and *Currency* (USD, EUR, GHS).
   - Input the vendor's *Tax Identification Number (TIN)*, primary contact email, telephone, and bank payment instructions.
   - Select supplier category: `Component OEM`, `Local Distributor`, `Freight Forwarder`, or `Clearing Agent`.
   - Click **Save Supplier**.
3. **Drafting a Purchase Order (PO):**
   - Navigate to `/procurement` and click **+ Create Purchase Order**.
   - Select the registered Supplier from the drop-down selector.
   - Set the *Order Date*, expected *Delivery Date*, and target *Receiving Warehouse* (e.g., `Main Component Stores`).
   - In the line items table, click **Add Item Line**:
     - Select SKU / Component from the Master Catalogue.
     - Specify *Quantity Ordered*, *Unit Price* in foreign currency, and applicable supplier discount.
     - The system automatically computes the Line Total and PO Total.
4. **Submitting for Authorization:**
   - Click **Submit for Approval**.
   - *Governance Check:* If PO Total ≤ GHS 50,000, approval requires Procurement Lead signoff. If PO Total > GHS 50,000, the system automatically routes an approval request `[AP]` to the Operations Manager and Finance Director.
5. **Issuing to Supplier:**
   - Once approved, the PO transitions to `Approved` status.
   - Click **Generate PO PDF** to download the official university purchase contract.
   - Click **Send to Supplier** to dispatch an automated email with attached PDF purchase order.

---

```
═══════════════════════════════════════════════════════════════════════════════════
STANDARD OPERATING PROCEDURE: SOP-02
TITLE: INTERNATIONAL SHIPMENT TRACKING & LANDED COST APPORTIONMENT
MODULE: IMPORTS (imp)
ROLES: Imports Officer (PI), Finance Officer (FS)
═══════════════════════════════════════════════════════════════════════════════════
```

### Purpose
To track imported components across maritime and air transit milestones, capture customs clearance duties under the Ghana Integrated Customs Management System (ICUMS), and apportion real landed costs onto component inventory valuations.

### Step-by-Step Procedure
1. **Registering Inbound Shipment:**
   - Navigate to `/imports/shipments` and click **+ New Shipment**.
   - Select associated Purchase Orders (multi-PO consolidation supported).
   - Enter shipping carrier details: *Bill of Lading / Air Waybill Number (BL/AWB)*, *Vessel / Flight Reference*, *Port of Loading*, and *Port of Discharge* (e.g., `Tema Port` or `Kotoka International Airport`).
   - Enter cargo parameters: *Total Gross Weight (kg)*, *Total Volume (CBM)*, and *Container Numbers*.
   - Click **Create Shipment**.
2. **Updating Milestone Tracking:**
   - As cargo advances, update milestone statuses on `/imports/shipments/[id]`:
     - `Booked` ➔ `In Transit` ➔ `Arrived at Port` ➔ `Customs Examination` ➔ `Cleared & Released` ➔ `Received at Warehouse`.
   - Record milestone timestamps and clearing agent operational notes.
3. **Recording Landed Cost Expenditures:**
   - When cargo clears customs, navigate to `/imports/landed-cost` and select **+ New Landed Cost Calculation**.
   - Select the cleared Shipment Reference.
   - Capture the 5 standardized landed cost expenditure components (in GHS):
     1. *International Freight:* Ocean / Air carrier charges.
     2. *Customs Import Duty:* GRA ICUMS assessed import duties.
     3. *Port Handling & Terminal Charges:* MPS / GPHA port terminal handling fees.
     4. *Clearing & Forwarding Agency Fees:* Official agency invoice.
     5. *Demurrage / Storage / Surcharges:* Any exceptional shipping line retention charges.
4. **Selecting Apportionment Methodology:**
   - Choose apportionment basis per item category:
     - **By Value (FOB):** Standard for high-value microelectronics (CPUs, GPUs, RAM).
     - **By Weight:** Standard for chassis, monitors, power supplies, and bulky cabling.
     - **By Volume (CBM):** Standard for full container packaging.
5. **Executing Apportionment:**
   - Click **Calculate Apportionment**. Review the pre-apportionment vs post-apportionment unit cost comparison table.
   - Click **Post Landed Cost to Inventory**.
   - *System Action:* The system updates the Moving Average Cost (MAC) and latest cost records in `inv.stock_ledger` and `catalog.items`, ensuring finished assembly costing reflects true landed expenditure.

---

```
═══════════════════════════════════════════════════════════════════════════════════
STANDARD OPERATING PROCEDURE: SOP-03
TITLE: GOODS RECEIPT NOTE (GRN) INSPECTION & STORES INWARD
MODULE: INVENTORY / PROCUREMENT (inv / proc)
ROLES: Stores Officer (IS), Quality Inspector (QI)
═══════════════════════════════════════════════════════════════════════════════════
```

### Purpose
To inspect physical cartons arriving at the warehouse dock, verify quantities against supplier packing lists and purchase orders, record lot/batch details, and post inward stock movements to the immutable ledger.

### Step-by-Step Procedure
1. **Initiating Goods Receipt:**
   - Navigate to `/procurement/grn` and click **+ Receive Goods**.
   - Select the target Purchase Order number. The system populates all expected lines and quantities.
2. **Physical Verification & Count:**
   - Unload cargo in the receiving staging buffer.
   - For each line item:
     - Input *Quantity Delivered* from the physical count.
     - Input *Quantity Accepted* after checking for exterior transit damage.
     - If damage is detected, input *Quantity Rejected* and select a rejection reason code (`Physical Crush Damage`, `Water Ingress`, `Incorrect SKU Delivered`, `Missing Accessories`).
     - Enter Supplier Batch/Lot Number and Expiry/Manufacturing Date (where applicable).
3. **Attaching Delivery Documentation:**
   - Upload scanned copies or mobile photos of the physical *Supplier Delivery Note* and *Waybill*.
4. **Posting the GRN:**
   - Click **Post Goods Receipt Note [L]**.
   - *System Action:*
     - Writes positive inventory movement rows (`receipt`) into `inv.stock_ledger`.
     - Automatically updates Purchase Order status: transitions to `Received` (if complete) or `Partially Received`.
     - Automatically triggers print prompt for thermal pallet/bin labels.

---

```
═══════════════════════════════════════════════════════════════════════════════════
STANDARD OPERATING PROCEDURE: SOP-04
TITLE: INVENTORY TRANSFERS, SERIALIZATION & DUAL-CUSTODY ADJUSTMENTS
MODULE: INVENTORY (inv)
ROLES: Stores Officer (IS), Operations Manager (MG)
═══════════════════════════════════════════════════════════════════════════════════
```

### Purpose
To execute stock transfers between storage locations (e.g., Raw Materials Warehouse to Production Line Staging), track individual serial numbers, and enforce strict dual-custody approval for inventory adjustments exceeding GHS 500.

### Step-by-Step Procedure

#### Part A: Stock Transfer Workflow (2-Step Dispatch & Receipt)
1. **Creating Transfer Request:**
   - Navigate to `/inventory/transfers` and click **+ New Transfer**.
   - Select *Source Location* (e.g., `Stores Warehouse A`) and *Destination Location* (e.g., `Assembly Floor Staging Buffer`).
   - Add component lines and quantities required for the production run.
   - Click **Dispatch Transfer [L]**.
   - *System Action:* The stock is deducted from the source location and enters `in_transit` status. The transfer function executes `inv.post_transfer_shipment`.
2. **Receiving Transfer at Destination:**
   - The destination warehouse lead navigates to `/inventory/transfers/[id]`.
   - Physically verify arriving carton counts.
   - Click **Confirm & Receive Transfer [L]**.
   - *System Action:* Executes `inv.post_transfer_receipt`, debiting the destination location and updating the transfer status to `received`.

#### Part B: Dual-Custody Stock Adjustments (> GHS 500 Threshold)
1. **Initiating Cycle Count Variance:**
   - Navigate to `/inventory/adjustments` and click **+ New Stock Adjustment**.
   - Select Location and SKU to be adjusted.
   - Select adjustment type: `Cycle Count Variance`, `Scrap / Damaged In-Store`, `Found Stock`, or `Obsolescence`.
   - Input *Quantity Delta* (positive or negative) and input detailed explanation.
2. **Threshold Evaluation:**
   - The system calculates the financial value of the adjustment:
     $$\text{Adjustment Value} = |\text{Quantity Delta}| \times \text{Current Unit Cost}$$
   - **Scenario 1 (≤ GHS 500):** Stores Officer clicks **Post Adjustment**. Movement is posted immediately with ledger movement type `adjustment`.
   - **Scenario 2 (> GHS 500):** Posting is immediately intercepted. The system locks the adjustment in `pending_approval` status and dispatches an immediate high-priority approval ticket to the Operations Manager (`MG`).
3. **Managerial Authorization:**
   - The Operations Manager opens `/approvals` or the linked adjustment page.
   - Reviews variance reason, historical ledger entries, and financial impact.
   - Clicks **Approve Adjustment** (or **Reject with Feedback**).
   - Once approved, the stock ledger is updated and an unalterable audit log entry is recorded with both user IDs.

---

```
═══════════════════════════════════════════════════════════════════════════════════
STANDARD OPERATING PROCEDURE: SOP-05
TITLE: ASSEMBLY ORDER EXECUTION & TECHNICIAN BENCH SCANNING
MODULE: PRODUCTION (prod)
ROLES: Assembly Technician (AT), Assembly Lead (AL)
═══════════════════════════════════════════════════════════════════════════════════
```

### Purpose
To guide assembly technicians through the standardized physical assembly of computers, enforce barcode component scanning to establish 100% component genealogy, and reserve Bill of Materials (BOM) stock.

### Step-by-Step Procedure
1. **Creating Assembly Orders (BOM Allocation):**
   - The Assembly Lead navigates to `/production` and clicks **+ New Assembly Order**.
   - Select the target Computer Model SKU (e.g., `UPSA-DESK-GEN12-I5`).
   - Enter *Batch Quantity* (e.g., 20 units).
   - Select target completion date and assigned technician workcell.
   - Click **Reserve Components & Release to Queue**.
   - *System Action:* Verifies adequate component stock in the staging buffer, reserves required quantities against the active BOM, and generates unit queue items.
2. **Entering the Technician Bench Workspace:**
   - The Assembly Technician navigates to `/production/queue`.
   - Click **Start Next Unit** on the assigned assembly order.
   - The system opens the full-screen **Bench Workspace** (`/production/units/[id]`).
3. **Component Barcode Scanning Sequence:**
   - The technician uses the 2D wireless barcode scanner to register components in strict physical order:
     1. *Chassis Serial / Asset Barcode* (System assigns primary unit identifier).
     2. *Motherboard Serial Number*.
     3. *Processor (CPU) Batch / Serial*.
     4. *Memory (RAM) Module 1 Serial*.
     5. *Memory (RAM) Module 2 Serial* (if dual-channel).
     6. *Storage (SSD / NVMe) Serial Number*.
     7. *Power Supply Unit (PSU) Serial Number*.
     8. *Display Panel Serial* (for All-in-One and Laptop configurations).
   - *Real-Time Validation:* If a scanned serial does not exist in the stock ledger or has already been consumed in another computer, the screen flashes red with an audible alert: `DUPLICATE OR UNRECOGNIZED SERIAL`.
4. **Physical Assembly Checklist Verification:**
   - On the workstation touch screen, the technician checks off physical assembly milestones:
     - [x] Thermal compound evenly spread across CPU IHS.
     - [x] Cooler heatsink torque verified to specification.
     - [x] Front panel USB / Audio / Power switch pinouts seated.
     - [x] Cable management routed away from fan blades and secured with zip-ties.
     - [x] Case grounding screw affixed.
5. **Initial Post & Handover:**
   - Technician executes initial AC power test.
   - Verifies system completes Power-On Self-Test (POST) and displays UEFI BIOS screen.
   - Clicks **Complete Assembly & Route to QC**.
   - *System Action:* Consumes component inventory from staging ledger, transitions unit status to `assembled`, and places the physical unit on the Quality Control conveyor cart.

---

```
═══════════════════════════════════════════════════════════════════════════════════
STANDARD OPERATING PROCEDURE: SOP-06
TITLE: QUALITY CONTROL INSPECTION, DEFECT LOGGING & REWORK
MODULE: QUALITY (qc / prod)
ROLES: Quality Inspector (QI), Rework Technician (AT)
═══════════════════════════════════════════════════════════════════════════════════
```

### Purpose
To subject every assembled computer to rigorous electrical, visual, and diagnostic burn-in testing, enforce zero-defect standards, and systematically manage component rework.

### Step-by-Step Procedure
1. **Claiming Unit from QC Queue:**
   - The Quality Inspector opens `/quality/inspections`.
   - Scans the chassis barcode of the incoming unit to open `/quality/inspections/[id]`.
2. **Executing 12-Point Quality Checklist:**
   - The inspector performs and logs each test criterion:
     1. *Chassis Exterior Integrity:* No scratches, dents, or misaligned panels.
     2. *Port Alignment & Fit:* USB-A, USB-C, HDMI, DisplayPort, RJ-45 LAN, and 3.5mm audio jacks firmly accessible.
     3. *Memory Stress Test:* 15-minute diagnostic RAM pass (0 errors).
     4. *CPU Thermal Throttling Test:* Full load temperature remains ≤ 82°C.
     5. *Storage Health (SMART):* NVMe read/write speeds within spec, 0 bad sectors.
     6. *Power Supply Voltage Stability:* +12V, +5V, +3.3V rail tolerances within ±3%.
     7. *Fan Acoustic & RPM Curve:* No grinding noise; PWM curves respond to heat load.
     8. *BIOS / UEFI Configuration:* Secure Boot enabled, XMP profile active, asset tag set.
     9. *Operating System Imaging:* Clean UPSA corporate Windows 11 Enterprise installation.
     10. *Network Connectivity:* Gigabit Ethernet and Wi-Fi 6 throughput validated.
     11. *Display / Graphic Bench:* No dead pixels, artifacts, or flickering.
     12. *Peripheral Connectivity:* Bundled keyboard and mouse response verified.
3. **Handling Passed Units:**
   - If all 12 criteria pass: click **Certify & Approve Unit**.
   - The system generates an immutable electronic QC certificate linking the inspector's identity.
   - The system automatically triggers printing of the **25x15 mm Tamper-Evident QR Warranty Label** (`/inventory/labels`).
   - The inspector affixes the label over the chassis seam and moves the unit to the Finished Goods warehouse.
4. **Handling Defective Units & Rework Protocol:**
   - If any criterion fails: click **Fail Inspection & Log Defect**.
   - Select defect classification:
     - `Component Failure` (e.g., Bad Memory stick, DOA NVMe drive).
     - `Workmanship Defect` (e.g., Pinched cable, loose screw, missing thermal paste).
     - `Cosmetic Defect` (e.g., Scratched front bezel).
   - Enter diagnostic description and photo evidence.
   - Click **Create Rework Order**.
   - *System Action:* Unit transitions to `in_rework` status. Component replacement logs automatically de-couple the defective serial number, returning it to quarantine stores, and prompt the rework technician to scan a replacement part.
   - Following repair, the unit MUST repeat the complete 12-point inspection from Step 1.

---

```
═══════════════════════════════════════════════════════════════════════════════════
STANDARD OPERATING PROCEDURE: SOP-07
TITLE: INTERNAL DEPARTMENTAL SALES, ALLOCATION & PHYSICAL DISPATCH
MODULE: SALES / DISPATCH (sales / inv)
ROLES: Sales Officer (SO), Stores Officer (IS), Department Representative
═══════════════════════════════════════════════════════════════════════════════════
```

### Purpose
To manage computer allocation requests from UPSA faculties (e.g., Faculty of Accounting and Finance, Faculty of Management Studies), allocate specific serial numbers from finished goods, and execute documented physical handover.

### Step-by-Step Procedure
1. **Registering Internal Requisition:**
   - Navigate to `/orders` and click **+ New Internal Order**.
   - Select the requesting *UPSA Department / Faculty* and input the *Requisitioning Officer Name*, *Staff ID*, and *Official Email*.
   - Select destination campus: `UPSA Main Campus, J.K. Tetteh Block`, `Central Administration`, or `Law Faculty Complex`.
   - Add required computer SKUs and quantities.
   - Click **Submit Requisition**.
2. **Management Approval Gate:**
   - Requisition enters `pending_approval`.
   - Head of Department / Operations Manager reviews budgetary allocation.
   - Upon approval, the order status transitions to `approved`.
3. **Serial Number Allocation:**
   - Stores Officer opens the approved order on `/orders/[id]`.
   - Click **Allocate Stock**.
   - The system displays matching finished computers in stock.
   - Officer scans or selects specific finished unit chassis barcodes.
   - *System Action:* Selected serial numbers transition to `allocated` status, preventing them from being co-allocated to any other order.
4. **Generating Dispatch Waybill:**
   - Click **Generate Dispatch Note & Waybill**.
   - System compiles the official 3-copy handover document detailing computer model, individual serial numbers, component configurations, and warranty start dates.
5. **Physical Handover & Custody Signature:**
   - Department representative inspects boxes at the loading bay.
   - Both Stores Officer and Receiving Officer sign the digital dispatch signature pad (or physical waybill).
   - Click **Confirm Dispatch Handover [L]**.
   - *System Action:* Deducts finished units from `inv.stock_ledger` (`dispatch_out`), activates the 36-month warranty clock in `svc.warranties`, and queues invoice creation in the finance module.

---

```
═══════════════════════════════════════════════════════════════════════════════════
STANDARD OPERATING PROCEDURE: SOP-08
TITLE: INVOICING, DEPARTMENTAL CHARGEBACKS & FISCAL PERIOD LOCKING
MODULE: FINANCE (fin)
ROLES: Finance Officer (FS), Finance Director (FD)
═══════════════════════════════════════════════════════════════════════════════════
```

### Purpose
To generate internal billing invoices, execute 3-way matching between POs, GRNs, and supplier bills, perform departmental budget chargebacks, and close monthly accounting periods against backdated entries.

### Step-by-Step Procedure
1. **Generating Departmental Internal Invoice:**
   - Navigate to `/finance/invoices` and click **+ New Invoice**.
   - Select the dispatched Internal Order. The system automatically populates customer details, allocated serial numbers, and unit billing rates.
   - Select payment terms: `Direct Budget Debit (UPSA Account)`, `Staff Payroll Deduction (3/6/12 Months)`, or `Grant Fund Settlement`.
   - Click **Post Invoice [GL]**.
   - *System Action:* Queues journal entries to debit Departmental Expense Ledger and credit Assembly Unit Revenue.
2. **Three-Way Matching for Supplier Invoices:**
   - Open `/finance/invoices` and switch tab to **Supplier Accounts Payable**.
   - Click **+ Match Supplier Bill**.
   - Link the Supplier Invoice to the original Purchase Order (`proc.purchase_orders`) and confirmed Goods Receipt Note (`proc.goods_receipts`).
   - The system performs automated 3-way line item reconciliation:
     - Quantity Variance tolerance: 0%.
     - Unit Price Variance tolerance: ≤ 0.5% (for foreign exchange rounding).
   - If variances occur, system flags the line for Finance Officer review before payment release.
3. **Monthly Fiscal Period Lock:**
   - At the conclusion of each calendar month, the Finance Director navigates to `/admin/settings` under **Fiscal Periods**.
   - Review pending landed cost runs, unposted stock movements, and open rework orders.
   - Click **Lock Period (e.g., October 2026)**.
   - *System Action:* Permanently locks the accounting ledger for that period. No backdated inventory movements, invoice adjustments, or landed cost modifications can be posted without Super Admin override and audit log capture.

---

```
═══════════════════════════════════════════════════════════════════════════════════
STANDARD OPERATING PROCEDURE: SOP-09
TITLE: WARRANTY VERIFICATION, RMA INTAKE & SERVICE TICKET RESOLUTION
MODULE: SERVICE / WARRANTY (svc)
ROLES: Service Technician (FS / ST), Quality Inspector (QI)
═══════════════════════════════════════════════════════════════════════════════════
```

### Purpose
To verify warranty coverage for faulty university equipment, manage Return Merchandise Authorization (RMA), track repair bench diagnostics, and manage warranty claims with overseas component OEMs.

### Step-by-Step Procedure
1. **Instant Warranty Lookup:**
   - Navigate to `/service/warranties`.
   - Scan or input the chassis barcode serial number (or component serial).
   - The system displays the complete device passport:
     - *Warranty Status:* `Active (24 Months Remaining)` / `Expired` / `Voided`.
     - *Genealogy Record:* Complete component list, assembly date, technician, and inspector.
     - *Custody History:* Original dispatch date, purchasing department, and staff owner.
2. **Creating Service Repair Ticket:**
   - Click **Create Service Ticket** directly from the warranty page (or via `/service/new`).
   - Select *Issue Category*: `No Power`, `Display / Artifacts`, `BSOD / Operating System Crash`, `Storage Degradation`, `Intermittent Reboot`, or `Physical Port Damage`.
   - Record customer problem description and physical condition.
   - Select priority: `Low`, `Medium`, `High`, or `Critical (Exam / Administration Server)`.
   - Issue printed Service Intake Receipt to the user.
3. **Bench Diagnostics & Component Swapping:**
   - Service Technician opens `/service/[id]`.
   - Executes bench diagnostic checks.
   - If a faulty component is identified:
     - Click **Replace Component**.
     - System prompts scan of the defective component barcode.
     - System prompts scan of the replacement component barcode (deducted from service spare stock).
     - *Genealogy Update:* The system automatically updates the unit's active genealogy record, tagging the old component serial as `Quarantined / Defective` and attaching the new component serial.
4. **Closing Ticket & Customer Return:**
   - Following repair, the unit completes a 30-minute stress test.
   - Technician enters repair notes and clicks **Complete Service Ticket**.
   - System notifies customer via email that equipment is ready for collection.
   - Upon pickup, customer signs receipt and ticket transitions to `Closed`.
5. **Supplier Warranty RMA Claims:**
   - For defective components covered under OEM warranty, navigate to `/service/claims`.
   - Aggregate defective parts by overseas supplier.
   - Click **Generate Supplier RMA Return Dossier**. The system generates a consolidated batch export including original PO numbers, import shipment references, and failure diagnostic reports.

---

```
═══════════════════════════════════════════════════════════════════════════════════
STANDARD OPERATING PROCEDURE: SOP-10
TITLE: SYSTEM ADMINISTRATION, APPROVAL RULE SIMULATION & AUDIT FORENSICS
MODULE: ADMIN (core / admin)
ROLES: Super Admin (SA)
═══════════════════════════════════════════════════════════════════════════════════
```

### Purpose
To govern user security, simulate and deploy multi-tier approval routing rules, maintain transactional sequence counters, and conduct forensic audit log investigations.

### Step-by-Step Procedure
1. **Staff Provisioning & Role Revocation:**
   - Navigate to `/admin/users`.
   - To invite new personnel: click **+ Invite Staff Member**.
   - Input university email, full name, employee ID, and designate system role.
   - To deactivate staff or rotate access: select user row, click **Edit Permissions**, or click **Deactivate Account** to terminate active sessions immediately.
2. **Approval Rule Matrix Simulation:**
   - Navigate to `/admin/approval-rules`.
   - The matrix defines which operational transactions require dual authorization:
     - *Purchase Orders > GHS 50,000* ➔ Requires Finance Director approval.
     - *Stock Adjustments > GHS 500* ➔ Requires Operations Manager approval.
     - *Customer Order Credit Override* ➔ Requires Managing Director approval.
   - *Testing Changes:* Utilize the built-in **Approval Simulator**:
     - Input test transaction parameters (Module, Requested Value, User Role).
     - Click **Simulate Routing**.
     - Verify rule evaluation order, threshold matching, and expected approver escalation hierarchy prior to publishing rule changes.
3. **Sequence Number Generator Maintenance:**
   - Navigate to `/admin/settings` and select **Document Sequences**.
   - Verify active prefix and numbering formats:
     - Purchase Orders: `PO-YYYY-XXXXX` (e.g., `PO-2026-00142`)
     - Goods Receipts: `GRN-YYYY-XXXXX`
     - Assembly Orders: `AO-YYYY-XXXXX`
     - Serial Numbers: `UPSA-YYYY-XXXXXX`
     - Dispatch Notes: `DN-YYYY-XXXXX`
     - Invoices: `INV-YYYY-XXXXX`
     - Service Tickets: `SVC-YYYY-XXXXX`
4. **Forensic Audit Log Investigation:**
   - In the event of an inventory discrepancy or security investigation, navigate to `/admin/audit`.
   - Filter logs by: *Date/Time Range*, *Staff Member*, *Action Type* (`INSERT`, `UPDATE`, `DELETE`, `LOGIN`, `APPROVAL`), or *Record ID*.
   - Click log row to view the full JSON payload before and after modification, client IP address, and browser fingerprint.

---

# 5. Thermal Barcode & QR Label Printing Standards

UAP standardizes on industrial thermal printing to eliminate paper deterioration in warehouse and assembly floor environments. The platform provides native print layout drivers at `/inventory/labels`.

```
┌──────────────────────────────────────┐     ┌───────────────────────┐
│              CARTON LABEL            │     │     CHASSIS LABEL     │
│             (50 mm x 30 mm)          │     │    (25 mm x 15 mm)    │
├──────────────────────────────────────┤     ├───────────────────────┤
│ UPSA ASSEMBLY UNIT - ACCRA           │     │ [QR]  UPSA ASSEMBLY   │
│ SKU: UPSA-DESK-GEN12-I5              │     │       S/N: 202604819  │
│ S/N: 2026-04819                      │     │       QC PASS [OK]    │
│ [||||||||||||||||||||||||||||||||||] │     └───────────────────────┘
│ BATCH: 2026-B04   LOC: WH-B2-04      │
└──────────────────────────────────────┘
```

### 5.1 Label Format Specifications
| Label Specification | Dimension | Media Type | Application & Placement |
|:---|:---|:---|:---|
| **Format A: Box & Carton Label** | 50 mm x 30 mm | Thermal Transfer Paper | Exterior master cartons, component storage bins, finished goods packaging. |
| **Format B: Chassis QR Label** | 25 mm x 15 mm | Tamper-Evident Silver Polyester | Affixed directly to computer chassis rear seam; tears upon case opening. |
| **Format C: Component Tracking Tag** | 30 mm x 10 mm | Polyimide Thermal Label | High-heat areas: power supply housings, internal drives, motherboard trays. |

### 5.2 Printer Setup & Troubleshooting
- **Supported Hardware:** Zebra ZD420/ZD421, TSC TE200, Xprinter XP-420B, and standard ESC/POS USB/Network thermal printers.
- **Browser Print Configuration:**
  - In print dialog, select paper size corresponding to active label stock (`50 x 30 mm` or `25 x 15 mm`).
  - Margins: **None** (0 mm).
  - Scale: **100% / Actual Size**.
  - Background Graphics: **Enabled**.
- **Printer Alignment Recovery:** If barcodes print across label seams, execute a hardware gap sensor calibration: hold the Feed button on the printer until the status light flashes green three times, then release.

---

# 6. Multi-Tier Approvals & Governance Thresholds

The following matrix governs automatic transaction interception and dual-custody approval requirements:

| Operational Transaction | Financial / Quantity Threshold | Primary Submitter | Required Approver | SLA Timeout | Escalation Path |
|:---|:---|:---|:---|:---|:---|
| **Purchase Order (Tier 1)** | ≤ GHS 50,000 | Procurement Officer | Procurement Manager | 24 Hours | Operations Manager |
| **Purchase Order (Tier 2)** | > GHS 50,000 | Procurement Manager | Operations Manager & Finance Director | 48 Hours | Managing Director |
| **Inventory Adjustment** | ≤ GHS 500 (Cumulative) | Stores Officer | Stores Lead | 12 Hours | Operations Manager |
| **Inventory Adjustment** | > GHS 500 (Cumulative) | Stores Officer | Operations Manager | 24 Hours | Managing Director |
| **Assembly Order Release** | > 100 Units Single Run | Assembly Lead | Production Director | 24 Hours | Operations Manager |
| **Scrap / Rework Write-Off** | Any Defective Component | Quality Inspector | Quality Lead & Stores Lead | 12 Hours | Operations Manager |
| **Credit Dispatch Release** | Department Exceeds Cap | Sales Officer | Finance Director | 24 Hours | Managing Director |

---

# 7. Troubleshooting, Validation Safeguards & FAQs

### 7.1 Common Operational Error Prompts & Resolutions

#### Error: "Invalid Input Syntax for Type UUID"
- **Cause:** Occurs when an alphabetical route segment is entered where a record ID is expected.
- **Resolution:** The platform's routes now feature strict regex parameter guards. Ensure you access records via the standard table listing or search palette.

#### Error: "Cannot Ship Transfer with No Lines"
- **Cause:** Attempting to click **Dispatch Transfer** before adding component lines to the transfer request.
- **Resolution:** Add at least one SKU line item with quantity > 0 before dispatching.

#### Error: "Stock Ledger Insufficient Quantity"
- **Cause:** Attempting to reserve or issue components that exceed available on-hand stock in that specific warehouse location.
- **Resolution:** Check `/inventory/ledger` for physical stock at that location. Execute an internal transfer from main stores to staging before releasing the assembly order.

#### Error: "Scanned Component Serial Already Allocated"
- **Cause:** An assembly technician attempts to scan a RAM or SSD serial number that has already been registered in another computer unit.
- **Resolution:** Check `/inventory/serials` to trace where that component was previously allocated. Quarantined or duplicate serials must be resolved by the Stores Officer.

#### Error: "Fiscal Period Locked"
- **Cause:** Attempting to modify, backdate, or post a transaction into a closed calendar month.
- **Resolution:** Transactions must be posted in the active, open fiscal period. Ledger reopening requires formal approval from the Finance Director and Super Admin.

---

# 8. Disaster Recovery & Offline Fallback Procedures

In the event of an extended campus network outage or power failure, operations must maintain physical continuity without compromising audit integrity:

### 8.1 Offline Emergency Kit
Every assembly bench and stores station maintains a physical emergency folder containing:
1. *Pre-Printed Sequential Chassis Barcode Labels (Format B).*
2. *Carbon-Copy Goods Receipt Log Sheets.*
3. *Physical Assembly Traveler Cards (Paper SOP-05).*
4. *Physical Quality Inspection Checklists (Paper SOP-06).*

### 8.2 Outage Assembly Protocol
1. Technicians affix pre-printed serial barcode labels onto chassis.
2. Record all component serial numbers manually on the **Physical Assembly Traveler Card** accompanying the chassis along the line.
3. Quality Inspectors conduct the 12-point inspection, physically initialing each checkpoint on the traveler card.
4. Finished units are moved to temporary quarantine staging and MUST NOT be dispatched to departments until electronic data entry is completed.

### 8.3 Post-Restoration Reconciliation Catch-Up
1. Upon network restoration, the Assembly Lead and Stores Officer enter **Catch-Up Batch Mode**.
2. Staff access `/production/queue` and input the completed physical traveler cards in historical sequence.
3. Components are scanned and deducted from inventory.
4. The system automatically timestamps the delayed entry and tags the record: `POST-OUTAGE RECONCILIATION — VERIFIED AGAINST PAPER TRAVELER`.

---

# 9. Glossary of Operational & Technical Terms

- **Append-Only Ledger (`inv.stock_ledger`):** An accounting-grade data architecture where inventory records are never overwritten or deleted. Any increase, decrease, or correction creates a new, immutable transaction row with timestamp and user sign-off.
- **Bill of Materials (BOM):** The comprehensive engineering list of raw materials, sub-assemblies, and exact quantities required to manufacture one complete computer.
- **Component Genealogy:** The complete, traceable lifecycle record of every individual part incorporated into a finished computer, linking supplier purchase, customs shipment, assembly technician, quality tests, and customer assignment.
- **Dual Custody:** A security governance protocol requiring two distinct authorized staff members to independently sign off on high-risk operations (such as high-value stock adjustments or major purchases).
- **GRA ICUMS:** Ghana Revenue Authority Integrated Customs Management System; the national digital customs clearance platform through which all imported component duties are assessed.
- **Goods Receipt Note (GRN):** The formal legal document acknowledging physical receipt and acceptance of inbound goods into university warehouse stores.
- **Landed Cost:** The true total cost of imported components, calculated by adding international ocean/air freight, customs import duties, port handling, clearing agent fees, and demurrage to the original manufacturer purchase price.
- **Moving Average Cost (MAC):** An inventory valuation methodology that continuously recalculates unit inventory value as new shipments arrive at differing exchange rates and landed costs.
- **RMA (Return Merchandise Authorization):** The formal tracking transaction for returning defective components to overseas manufacturers for credit or replacement.
- **Thermal Transfer Printing:** A digital printing method that applies heat to a ribbon, melting wax or resin onto label surfaces to produce durable, fade-proof barcodes impervious to heat and grease.
- **Three-Way Matching:** The accounting control procedure verifying that quantities, descriptions, and prices match across the Purchase Order, Goods Receipt Note, and Supplier Invoice before payment authorization.
