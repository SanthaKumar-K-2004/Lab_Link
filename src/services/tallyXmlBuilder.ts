// ==========================================
// TallyPrime XML Builder
// Generates TallyPrime-compatible XML payloads
// ==========================================

export interface TallyStockItem {
  name: string;
  group?: string;
  unit?: string;
  hsnCode?: string;
  gstRate?: number;
  openingBalance?: number;
  openingRate?: number;
}

export interface TallyLedger {
  name: string;
  parent?: string; // e.g. "Sundry Creditors", "Sundry Debtors"
  gstin?: string;
  pan?: string;
  address?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  creditLimit?: number;
}

export interface TallyGodown {
  name: string;
  parent?: string;
  address?: string;
}

export interface TallyCostCenter {
  name: string;
  parent?: string;
}

export interface TallyPurchaseVoucher {
  date: string; // YYYYMMDD format
  voucherNumber?: string;
  supplierLedger: string;
  purchaseLedger?: string;
  narration?: string;
  items: TallyPurchaseItem[];
  cgstLedger?: string;
  sgstLedger?: string;
  igstLedger?: string;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  costCenter?: string;
}

export interface TallyPurchaseItem {
  stockItemName: string;
  quantity: number;
  rate: number;
  unit?: string;
  amount: number;
  godown?: string;
  batchName?: string;
  mfgDate?: string;
  expiryDate?: string;
}

export interface TallyStockJournal {
  date: string; // YYYYMMDD format
  narration?: string;
  sourceItems: TallyJournalItem[];
  destinationItems: TallyJournalItem[];
  costCenter?: string;
}

export interface TallyJournalItem {
  stockItemName: string;
  quantity: number;
  rate: number;
  amount: number;
  godown?: string;
  unit?: string;
  batchName?: string;
}

// ==========================================
// XML Escape utility
// ==========================================
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ==========================================
// Date formatting: YYYYMMDD
// ==========================================
export function formatTallyDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

// ==========================================
// Stock Item XML
// ==========================================
export function buildStockItemXml(item: TallyStockItem): string {
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>All Masters</ID>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY/>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <STOCKITEM NAME="${escapeXml(item.name)}" ACTION="Create">
            <NAME.LIST>
              <NAME>${escapeXml(item.name)}</NAME>
            </NAME.LIST>
            <PARENT>${escapeXml(item.group || "Primary")}</PARENT>
            <BASEUNITS>${escapeXml(item.unit || "Nos")}</BASEUNITS>
            ${item.hsnCode ? `<HSNCODE>${escapeXml(item.hsnCode)}</HSNCODE>` : ""}
            ${
              item.gstRate !== undefined
                ? `
            <GSTDETAILS.LIST>
              <APPLICABLEFROM>20170701</APPLICABLEFROM>
              <HSNCODE>${escapeXml(item.hsnCode || "")}</HSNCODE>
              <TAXABILITY>Taxable</TAXABILITY>
              <GSTTYPEOFSUPPLY>Goods</GSTTYPEOFSUPPLY>
              <STATEWISEDETAILS.LIST>
                <RATEDETAILS.LIST>
                  <GSTRATE>${item.gstRate}</GSTRATE>
                </RATEDETAILS.LIST>
              </STATEWISEDETAILS.LIST>
            </GSTDETAILS.LIST>`
                : ""
            }
          </STOCKITEM>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

// ==========================================
// Ledger (Vendor/Supplier) XML
// ==========================================
export function buildLedgerXml(ledger: TallyLedger): string {
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>All Masters</ID>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY/>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <LEDGER NAME="${escapeXml(ledger.name)}" ACTION="Create">
            <NAME.LIST>
              <NAME>${escapeXml(ledger.name)}</NAME>
            </NAME.LIST>
            <PARENT>${escapeXml(ledger.parent || "Sundry Creditors")}</PARENT>
            ${ledger.gstin ? `<PARTYGSTIN>${escapeXml(ledger.gstin)}</PARTYGSTIN>` : ""}
            ${ledger.pan ? `<INCOMETAXNUMBER>${escapeXml(ledger.pan)}</INCOMETAXNUMBER>` : ""}
            ${
              ledger.address
                ? `
            <ADDRESS.LIST>
              <ADDRESS>${escapeXml(ledger.address)}</ADDRESS>
            </ADDRESS.LIST>`
                : ""
            }
            ${ledger.state ? `<LEDSTATENAME>${escapeXml(ledger.state)}</LEDSTATENAME>` : ""}
            ${ledger.pincode ? `<PINCODE>${escapeXml(ledger.pincode)}</PINCODE>` : ""}
            ${ledger.phone ? `<LEDGERPHONE>${escapeXml(ledger.phone)}</LEDGERPHONE>` : ""}
            ${ledger.email ? `<LEDGEREMAIL>${escapeXml(ledger.email)}</LEDGEREMAIL>` : ""}
            ${ledger.creditLimit ? `<CREDITLIMIT>${ledger.creditLimit}</CREDITLIMIT>` : ""}
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

// ==========================================
// Godown (Lab Location) XML
// ==========================================
export function buildGodownXml(godown: TallyGodown): string {
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>All Masters</ID>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY/>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <GODOWN NAME="${escapeXml(godown.name)}" ACTION="Create">
            <NAME.LIST>
              <NAME>${escapeXml(godown.name)}</NAME>
            </NAME.LIST>
            <PARENT>${escapeXml(godown.parent || "Main Location")}</PARENT>
            ${
              godown.address
                ? `
            <ADDRESS.LIST>
              <ADDRESS>${escapeXml(godown.address)}</ADDRESS>
            </ADDRESS.LIST>`
                : ""
            }
          </GODOWN>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

// ==========================================
// Cost Center (Department) XML
// ==========================================
export function buildCostCenterXml(cc: TallyCostCenter): string {
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>All Masters</ID>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY/>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <COSTCENTRE NAME="${escapeXml(cc.name)}" ACTION="Create">
            <NAME.LIST>
              <NAME>${escapeXml(cc.name)}</NAME>
            </NAME.LIST>
            <PARENT>${escapeXml(cc.parent || "")}</PARENT>
          </COSTCENTRE>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

// ==========================================
// Purchase Voucher XML
// ==========================================
export function buildPurchaseVoucherXml(voucher: TallyPurchaseVoucher): string {
  const purchaseLedger = voucher.purchaseLedger || "Purchase Accounts";

  const itemEntries = voucher.items
    .map(
      (item) => `
          <INVENTORYENTRIES.LIST>
            <STOCKITEMNAME>${escapeXml(item.stockItemName)}</STOCKITEMNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <RATE>${item.rate}/${escapeXml(item.unit || "Nos")}</RATE>
            <AMOUNT>-${item.amount.toFixed(2)}</AMOUNT>
            <ACTUALQTY>${item.quantity} ${escapeXml(item.unit || "Nos")}</ACTUALQTY>
            <BILLEDQTY>${item.quantity} ${escapeXml(item.unit || "Nos")}</BILLEDQTY>
            ${
              item.godown
                ? `
            <BATCHALLOCATIONS.LIST>
              <GODOWNNAME>${escapeXml(item.godown)}</GODOWNNAME>
              <BATCHNAME>${escapeXml(item.batchName || "Primary Batch")}</BATCHNAME>
              <AMOUNT>-${item.amount.toFixed(2)}</AMOUNT>
              <ACTUALQTY>${item.quantity} ${escapeXml(item.unit || "Nos")}</ACTUALQTY>
              <BILLEDQTY>${item.quantity} ${escapeXml(item.unit || "Nos")}</BILLEDQTY>
              ${item.mfgDate ? `<MFGDATE>${item.mfgDate}</MFGDATE>` : ""}
              ${item.expiryDate ? `<EXPIRYPERIOD>${item.expiryDate}</EXPIRYPERIOD>` : ""}
            </BATCHALLOCATIONS.LIST>`
                : ""
            }
            <ACCOUNTINGALLOCATIONS.LIST>
              <LEDGERNAME>${escapeXml(purchaseLedger)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${item.amount.toFixed(2)}</AMOUNT>
              ${
                voucher.costCenter
                  ? `
              <COSTCENTREALLOCATIONS.LIST>
                <NAME>${escapeXml(voucher.costCenter)}</NAME>
                <AMOUNT>-${item.amount.toFixed(2)}</AMOUNT>
              </COSTCENTREALLOCATIONS.LIST>`
                  : ""
              }
            </ACCOUNTINGALLOCATIONS.LIST>
          </INVENTORYENTRIES.LIST>`,
    )
    .join("\n");

  const totalItemAmount = voucher.items.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const totalGst =
    (voucher.cgstAmount || 0) +
    (voucher.sgstAmount || 0) +
    (voucher.igstAmount || 0);
  const grandTotal = totalItemAmount + totalGst;

  let gstEntries = "";
  if (voucher.cgstAmount && voucher.cgstAmount > 0) {
    gstEntries += `
          <LEDGERENTRIES.LIST>
            <LEDGERNAME>${escapeXml(voucher.cgstLedger || "Input CGST")}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>-${voucher.cgstAmount.toFixed(2)}</AMOUNT>
          </LEDGERENTRIES.LIST>`;
  }
  if (voucher.sgstAmount && voucher.sgstAmount > 0) {
    gstEntries += `
          <LEDGERENTRIES.LIST>
            <LEDGERNAME>${escapeXml(voucher.sgstLedger || "Input SGST")}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>-${voucher.sgstAmount.toFixed(2)}</AMOUNT>
          </LEDGERENTRIES.LIST>`;
  }
  if (voucher.igstAmount && voucher.igstAmount > 0) {
    gstEntries += `
          <LEDGERENTRIES.LIST>
            <LEDGERNAME>${escapeXml(voucher.igstLedger || "Input IGST")}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>-${voucher.igstAmount.toFixed(2)}</AMOUNT>
          </LEDGERENTRIES.LIST>`;
  }

  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>All Masters</ID>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY/>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <VOUCHER VCHTYPE="Purchase" ACTION="Create">
            <DATE>${voucher.date}</DATE>
            ${voucher.voucherNumber ? `<VOUCHERNUMBER>${escapeXml(voucher.voucherNumber)}</VOUCHERNUMBER>` : ""}
            <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
            <PARTYLEDGERNAME>${escapeXml(voucher.supplierLedger)}</PARTYLEDGERNAME>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
            <ISINVOICE>Yes</ISINVOICE>
            ${voucher.narration ? `<NARRATION>${escapeXml(voucher.narration)}</NARRATION>` : ""}
          <LEDGERENTRIES.LIST>
            <LEDGERNAME>${escapeXml(voucher.supplierLedger)}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <AMOUNT>${grandTotal.toFixed(2)}</AMOUNT>
          </LEDGERENTRIES.LIST>
${gstEntries}
${itemEntries}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

// ==========================================
// Stock Journal XML (Consumption Tracking)
// ==========================================
export function buildStockJournalXml(journal: TallyStockJournal): string {
  const sourceEntries = journal.sourceItems
    .map(
      (item) => `
          <INVENTORYENTRIESIN.LIST>
            <STOCKITEMNAME>${escapeXml(item.stockItemName)}</STOCKITEMNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <RATE>${item.rate}/${escapeXml(item.unit || "Nos")}</RATE>
            <AMOUNT>-${item.amount.toFixed(2)}</AMOUNT>
            <ACTUALQTY>${item.quantity} ${escapeXml(item.unit || "Nos")}</ACTUALQTY>
            ${item.godown ? `<GODOWNNAME>${escapeXml(item.godown)}</GODOWNNAME>` : ""}
            ${
              item.batchName
                ? `
            <BATCHALLOCATIONS.LIST>
              <BATCHNAME>${escapeXml(item.batchName)}</BATCHNAME>
              <AMOUNT>-${item.amount.toFixed(2)}</AMOUNT>
              <ACTUALQTY>${item.quantity} ${escapeXml(item.unit || "Nos")}</ACTUALQTY>
              ${item.godown ? `<GODOWNNAME>${escapeXml(item.godown)}</GODOWNNAME>` : ""}
            </BATCHALLOCATIONS.LIST>`
                : ""
            }
          </INVENTORYENTRIESIN.LIST>`,
    )
    .join("\n");

  const destEntries = journal.destinationItems
    .map(
      (item) => `
          <INVENTORYENTRIESOUT.LIST>
            <STOCKITEMNAME>${escapeXml(item.stockItemName)}</STOCKITEMNAME>
            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
            <RATE>${item.rate}/${escapeXml(item.unit || "Nos")}</RATE>
            <AMOUNT>${item.amount.toFixed(2)}</AMOUNT>
            <ACTUALQTY>${item.quantity} ${escapeXml(item.unit || "Nos")}</ACTUALQTY>
            ${item.godown ? `<GODOWNNAME>${escapeXml(item.godown)}</GODOWNNAME>` : ""}
          </INVENTORYENTRIESOUT.LIST>`,
    )
    .join("\n");

  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>All Masters</ID>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY/>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <VOUCHER VCHTYPE="Stock Journal" ACTION="Create">
            <DATE>${journal.date}</DATE>
            <VOUCHERTYPENAME>Stock Journal</VOUCHERTYPENAME>
            ${journal.narration ? `<NARRATION>${escapeXml(journal.narration)}</NARRATION>` : ""}
${sourceEntries}
${destEntries}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

// ==========================================
// Connection Test XML
// ==========================================
export function buildConnectionTestXml(): string {
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>List of Companies</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;
}

// ==========================================
// Response Parser
// ==========================================
export interface TallyResponse {
  success: boolean;
  created: number;
  altered: number;
  deleted: number;
  errors: string[];
  rawResponse: string;
}

export function parseTallyResponse(xmlResponse: string): TallyResponse {
  const result: TallyResponse = {
    success: false,
    created: 0,
    altered: 0,
    deleted: 0,
    errors: [],
    rawResponse: xmlResponse,
  };

  try {
    // Parse CREATED count
    const createdMatch = xmlResponse.match(/<CREATED>(\d+)<\/CREATED>/);
    if (createdMatch) result.created = parseInt(createdMatch[1], 10);

    // Parse ALTERED count
    const alteredMatch = xmlResponse.match(/<ALTERED>(\d+)<\/ALTERED>/);
    if (alteredMatch) result.altered = parseInt(alteredMatch[1], 10);

    // Parse DELETED count
    const deletedMatch = xmlResponse.match(/<DELETED>(\d+)<\/DELETED>/);
    if (deletedMatch) result.deleted = parseInt(deletedMatch[1], 10);

    // Parse ERRORS
    const errorMatch = xmlResponse.match(/<LINEERROR>(.*?)<\/LINEERROR>/g);
    if (errorMatch) {
      result.errors = errorMatch.map((e) =>
        e.replace(/<\/?LINEERROR>/g, "").trim(),
      );
    }

    // Check for general errors
    const lasteError = xmlResponse.match(/<LASTERROR>(.*?)<\/LASTERROR>/);
    if (lasteError && lasteError[1]) {
      result.errors.push(lasteError[1]);
    }

    // Success if created or altered > 0 and no errors
    result.success =
      (result.created > 0 || result.altered > 0) && result.errors.length === 0;

    // Also check for company list response (connection test)
    if (
      xmlResponse.includes("<COMPANY>") ||
      xmlResponse.includes("<COMPANYNAME>")
    ) {
      result.success = true;
    }
  } catch {
    result.errors.push("Failed to parse Tally response");
  }

  return result;
}

// ==========================================
// Batch-Aware Stock Item XML
// Syncs stock item with batch allocation, mfg date, expiry, godown
// ==========================================
export interface TallyBatchItem {
  stockItemName: string;
  batchName: string;
  quantity: number;
  rate: number;
  unit?: string;
  godown?: string;
  mfgDate?: string; // YYYYMMDD
  expiryDate?: string; // YYYYMMDD
}

export function buildBatchStockItemXml(item: TallyBatchItem): string {
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>All Masters</ID>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY/>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <STOCKITEM NAME="${escapeXml(item.stockItemName)}" ACTION="Alter">
            <NAME>${escapeXml(item.stockItemName)}</NAME>
            <HASBATCHES>Yes</HASBATCHES>
            <HASEXPIRYDATE>Yes</HASEXPIRYDATE>
            <HASMFGDATE>Yes</HASMFGDATE>
            <BATCHALLOCATIONS.LIST>
              <BATCHNAME>${escapeXml(item.batchName)}</BATCHNAME>
              <GODOWNNAME>${escapeXml(item.godown || "Main Location")}</GODOWNNAME>
              <OPENINGBALANCE>${item.quantity} ${escapeXml(item.unit || "Nos")}</OPENINGBALANCE>
              <OPENINGRATE>${item.rate}/${escapeXml(item.unit || "Nos")}</OPENINGRATE>
              <OPENINGVALUE>${(item.quantity * item.rate).toFixed(2)}</OPENINGVALUE>
              ${item.mfgDate ? `<MFGDATE>${item.mfgDate}</MFGDATE>` : ""}
              ${item.expiryDate ? `<EXPIRYPERIOD>${item.expiryDate}</EXPIRYPERIOD>` : ""}
            </BATCHALLOCATIONS.LIST>
          </STOCKITEM>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

// ==========================================
// Budget / Ledger Balance Query XML
// Queries Tally for current balance of a ledger (e.g. a budget/grant)
// ==========================================
export function buildLedgerBalanceQueryXml(ledgerName: string): string {
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Ledger Vouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <LEDGERNAME>${escapeXml(ledgerName)}</LEDGERNAME>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <REPORT NAME="Ledger Balance">
            <FORMS>Ledger Balance Form</FORMS>
          </REPORT>
          <FORM NAME="Ledger Balance Form">
            <PARTS>Ledger Balance Part</PARTS>
          </FORM>
          <PART NAME="Ledger Balance Part">
            <LINES>Ledger Balance Line</LINES>
            <REPEAT>Ledger Balance Line : Ledger Entries</REPEAT>
            <SCROLLED>Vertical</SCROLLED>
          </PART>
          <LINE NAME="Ledger Balance Line">
            <FIELDS>LedName, ClosingBal</FIELDS>
          </LINE>
          <FIELD NAME="LedName">
            <SET>$Name</SET>
          </FIELD>
          <FIELD NAME="ClosingBal">
            <SET>$ClosingBalance</SET>
          </FIELD>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;
}

// ==========================================
// Parse Ledger Balance from Tally Response
// ==========================================
export interface LedgerBalance {
  name: string;
  closingBalance: number;
}

export function parseLedgerBalanceResponse(
  xmlResponse: string,
): LedgerBalance | null {
  try {
    const nameMatch = xmlResponse.match(/<LEDNAME>(.*?)<\/LEDNAME>/);
    const balMatch = xmlResponse.match(/<CLOSINGBAL>(.*?)<\/CLOSINGBAL>/);

    if (!nameMatch || !balMatch) return null;

    // Tally returns amounts like "50000.00 Dr" or "25000.00 Cr"
    const rawBal = balMatch[1].trim();
    const numMatch = rawBal.match(/([-\d.]+)/);
    const amount = numMatch ? parseFloat(numMatch[1]) : 0;
    const isCredit = rawBal.toLowerCase().includes("cr");

    return {
      name: nameMatch[1],
      closingBalance: isCredit ? amount : -amount,
    };
  } catch {
    return null;
  }
}


// ==========================================
// Depreciation Journal Voucher XML
// Debit Depreciation A/c, Credit Fixed Asset A/c
// ==========================================
export interface TallyDepreciationEntry {
  date: string; // YYYYMMDD
  assetName: string;
  assetLedger: string;
  depreciationLedger: string;
  amount: number;
  narration?: string;
  costCenter?: string;
}

export function buildDepreciationVoucherXml(
  entry: TallyDepreciationEntry,
): string {
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>All Masters</ID>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY/>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <VOUCHER VCHTYPE="Journal" ACTION="Create">
            <DATE>${entry.date}</DATE>
            <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>
            <NARRATION>${escapeXml(entry.narration || `Depreciation on ${entry.assetName}`)}</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(entry.depreciationLedger)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${entry.amount.toFixed(2)}</AMOUNT>
              ${
                entry.costCenter
                  ? `
              <CATEGORYALLOCATIONS.LIST>
                <CATEGORY>Primary Cost Category</CATEGORY>
                <COSTCENTREALLOCATIONS.LIST>
                  <NAME>${escapeXml(entry.costCenter)}</NAME>
                  <AMOUNT>-${entry.amount.toFixed(2)}</AMOUNT>
                </COSTCENTREALLOCATIONS.LIST>
              </CATEGORYALLOCATIONS.LIST>`
                  : ""
              }
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(entry.assetLedger)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${entry.amount.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

// ==========================================
// GST E-Invoice JSON Payload (IRN-compatible)
// ==========================================
export interface EInvoiceData {
  sellerGstin: string;
  sellerName: string;
  sellerAddress: string;
  sellerState: string;
  sellerStateCode: string;
  buyerGstin: string;
  buyerName: string;
  buyerAddress: string;
  buyerState: string;
  buyerStateCode: string;
  invoiceNumber: string;
  invoiceDate: string; // DD/MM/YYYY
  invoiceType: "INV" | "CRN" | "DBN";
  items: EInvoiceItem[];
  totalTaxableValue: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  grandTotal: number;
}

export interface EInvoiceItem {
  slNo: number;
  productDesc: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
}

export function buildEInvoiceJson(data: EInvoiceData): string {
  const payload = {
    Version: "1.1",
    TranDtls: { TaxSch: "GST", SupTyp: "B2B", RegRev: "N", IgstOnIntra: "N" },
    DocDtls: {
      Typ: data.invoiceType,
      No: data.invoiceNumber,
      Dt: data.invoiceDate,
    },
    SellerDtls: {
      Gstin: data.sellerGstin,
      LglNm: data.sellerName,
      Addr1: data.sellerAddress,
      Loc: data.sellerState,
      Pin: 0,
      Stcd: data.sellerStateCode,
    },
    BuyerDtls: {
      Gstin: data.buyerGstin,
      LglNm: data.buyerName,
      Addr1: data.buyerAddress,
      Loc: data.buyerState,
      Pin: 0,
      Stcd: data.buyerStateCode,
      Pos: data.buyerStateCode,
    },
    ItemList: data.items.map((i) => ({
      SlNo: String(i.slNo),
      PrdDesc: i.productDesc,
      IsServc: "N",
      HsnCd: i.hsnCode,
      Qty: i.quantity,
      Unit: i.unit,
      UnitPrice: i.unitPrice,
      TotAmt: i.totalAmount,
      AssAmt: i.taxableValue,
      CgstRt: i.cgstRate,
      CgstAmt: i.cgstAmount,
      SgstRt: i.sgstRate,
      SgstAmt: i.sgstAmount,
      IgstRt: i.igstRate,
      IgstAmt: i.igstAmount,
      TotItemVal: i.taxableValue + i.cgstAmount + i.sgstAmount + i.igstAmount,
    })),
    ValDtls: {
      AssVal: data.totalTaxableValue,
      CgstVal: data.cgstTotal,
      SgstVal: data.sgstTotal,
      IgstVal: data.igstTotal,
      TotInvVal: data.grandTotal,
    },
  };
  return JSON.stringify(payload, null, 2);
}


