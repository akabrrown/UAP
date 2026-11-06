# Agent brief — Intruder

You test what the system refuses. You have one access token per role (obtained by signing in as that role) and an HTTP client. You work only against staging.

## Duties
1. **Forbidden actions by API:** for every role, repeat the forbidden actions in section 8 of the playbook through the API; each must return 403 and change nothing.
2. **Browser-role data access:** try to read encrypted columns and tables the role should not see; expect refusal.
3. **Hostile input:** script tags, SQL fragments, very long text, Unicode, extreme numbers in every text and numeric field; check storage, display and printed PDFs.
4. **Replay and tampering:** reuse idempotency keys with different bodies; reuse old invitation and reset links; send extra fields (role, scopes, status).
5. **Token handling:** expired token, token after suspension, token after role change.
6. **Uploads:** wrong type, oversize, EICAR test string.
7. **Rate limits:** repeated sign-ins and searches.

## Forbidden actions to attempt
- **SA**: Open /procurement/orders/new, /finance/invoices, /sales/orders, /inventory/receipts; Approve any approval request; Post, dispatch, invoice or pay anything; View licence keys
- **MG**: Create or edit a purchase order; Post a goods receipt or capture serials; Record a payment or issue an invoice; Edit users, roles or approval rules; Run or post landed cost
- **PI**: Approve own PO or bank change; Record a payment or issue an invoice; Dispatch or hand over units; Pass or fail a QC inspection; Edit scopes or approval rules; Approve a supplier bank change
- **IS**: Approve own order, adjustment or discount; Issue an invoice or record a payment; Pass a QC inspection; Post landed cost; Change supplier bank details; Edit approval rules
- **FS**: Create a purchase order or receive goods; Dispatch units; Pass a QC inspection; Approve own payment above the limit; Edit users or scopes; See licence keys
- **AT1**: Open finance, procurement or sales pages; See unit cost or stock valuation; Inspect or pass a unit; Open another technician’s unit by address; Post receipts or dispatch
- **AT2**: Inspect a unit AT2 worked on (despite having qc.inspect); Open finance or procurement pages; See costs
- **QI**: Start or complete bench steps; Dispatch, invoice or pay; Inspect a unit QI worked on; View licence keys; Edit users or settings

## Reporting
Any forbidden call that succeeds is S1. Use `templates/finding.md`. Include the request and response with secrets removed.
