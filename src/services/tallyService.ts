// ==========================================
// TallyPrime Service
// HTTP client + high-level sync operations
// ==========================================

import { supabase } from "@/integrations/supabase/client";
import {
  buildStockItemXml,
  buildLedgerXml,
  buildGodownXml,
  buildCostCenterXml,
  buildPurchaseVoucherXml,
  buildStockJournalXml,
  buildConnectionTestXml,
  buildBatchStockItemXml,
  buildLedgerBalanceQueryXml,
  buildDepreciationVoucherXml,
  parseTallyResponse,
  parseLedgerBalanceResponse,
  formatTallyDate,
  type TallyStockItem,
  type TallyLedger,
  type TallyGodown,
  type TallyCostCenter,
  type TallyPurchaseVoucher,
  type TallyStockJournal,
  type TallyResponse,
  type TallyBatchItem,
  type TallyDepreciationEntry,
} from "./tallyXmlBuilder";

// ==========================================
// Types
// ==========================================
export interface TallyConfig {
  id?: string;
  host: string;
  port: number;
  company_name: string;
  is_enabled: boolean;
  last_sync_at?: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
  details?: TallyResponse;
  entityName?: string;
}

// ==========================================
// Low-level HTTP POST to Tally
// ==========================================
async function postToTally(xml: string, config: TallyConfig): Promise<string> {
  // Validate host against prohibited metadata addresses to prevent SSRF (SEC-05)
  const normalizedHost = config.host.replace(/^https?:\/\//i, "").split(":")[0].toLowerCase();
  if (normalizedHost === "169.254.169.254" || normalizedHost === "metadata.google.internal") {
    throw new Error("Prohibited host: Cloud instance metadata endpoints cannot be targeted.");
  }

  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  const protocol = config.host.startsWith("http://") || config.host.startsWith("https://") ? "" : "http://";
  const url = `${protocol}${config.host}:${config.port}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/xml",
      },
      body: xml,
    });

    if (!response.ok) {
      throw new Error(
        `Tally HTTP error: ${response.status} ${response.statusText}`,
      );
    }

    return await response.text();
  } catch (err: any) {
    if (isHttps && url.startsWith("http://")) {
      throw new Error(
        `Mixed Content Blocked: Browser cannot connect to insecure Tally endpoint (${url}) from an HTTPS origin. ` +
        `Configure an HTTPS reverse proxy, Edge Function relay, or local connector daemon.`
      );
    }
    if (err.name === "TypeError" && (err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError"))) {
      throw new Error(
        `Cannot reach Tally at ${url}. Ensure TallyPrime is running with XML/ODBC Server enabled on port ${config.port} and CORS is allowed.`
      );
    }
    throw err;
  }
}

// ==========================================
// Log sync operation to database
// ==========================================
async function logSyncOperation(
  operation: string,
  entityType: string,
  entityId: string | null,
  entityName: string,
  requestXml: string,
  response: string,
  status: "success" | "failed" | "pending",
  errorMessage?: string,
) {
  try {
    await supabase.from("tally_sync_logs" as any).insert({
      operation,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      tally_request_xml: requestXml,
      tally_response: response,
      status,
      error_message: errorMessage,
    });
  } catch (err) {
    console.error("Failed to log sync operation:", err);
  }
}

// ==========================================
// Update sync mapping status
// ==========================================
async function upsertSyncMapping(
  entityType: string,
  lablinkId: string,
  lablinkName: string,
  tallyName: string,
  syncStatus: string,
  syncError?: string,
) {
  try {
    // Try to update existing
    const { data: existing } = await supabase
      .from("tally_sync_mappings" as any)
      .select("id")
      .eq("entity_type", entityType)
      .eq("lablink_id", lablinkId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("tally_sync_mappings" as any)
        .update({
          tally_name: tallyName,
          sync_status: syncStatus,
          last_synced_at: new Date().toISOString(),
          sync_error: syncError || null,
        })
        .eq("id", (existing as any).id);
    } else {
      await supabase.from("tally_sync_mappings" as any).insert({
        entity_type: entityType,
        lablink_id: lablinkId,
        lablink_name: lablinkName,
        tally_name: tallyName,
        sync_status: syncStatus,
        last_synced_at:
          syncStatus === "synced" ? new Date().toISOString() : null,
        sync_error: syncError || null,
      });
    }
  } catch (err) {
    console.error("Failed to upsert sync mapping:", err);
  }
}

// ==========================================
// Configuration Management
// ==========================================
export async function getTallyConfig(): Promise<TallyConfig | null> {
  const { data, error } = await supabase
    .from("tally_config" as any)
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as any as TallyConfig;
}

export async function saveTallyConfig(
  config: Partial<TallyConfig>,
): Promise<boolean> {
  const existing = await getTallyConfig();

  if (existing?.id) {
    const { error } = await supabase
      .from("tally_config" as any)
      .update({
        host: config.host,
        port: config.port,
        company_name: config.company_name,
        is_enabled: config.is_enabled,
      })
      .eq("id", existing.id);
    return !error;
  } else {
    const { error } = await supabase.from("tally_config" as any).insert({
      host: config.host || "localhost",
      port: config.port || 9000,
      company_name: config.company_name || "",
      is_enabled: config.is_enabled || false,
    });
    return !error;
  }
}

// ==========================================
// Connection Test
// ==========================================
export async function testTallyConnection(
  config: TallyConfig,
): Promise<SyncResult> {
  const xml = buildConnectionTestXml();

  try {
    const responseXml = await postToTally(xml, config);
    const parsed = parseTallyResponse(responseXml);

    await logSyncOperation(
      "test_connection",
      "system",
      null,
      "Connection Test",
      xml,
      responseXml,
      parsed.success ? "success" : "failed",
      parsed.errors.join("; "),
    );

    return {
      success: parsed.success,
      message: parsed.success
        ? "Successfully connected to TallyPrime!"
        : `Connection failed: ${parsed.errors.join(", ")}`,
      details: parsed,
    };
  } catch (err: any) {
    const errorMsg = err.message || "Unknown error";

    await logSyncOperation(
      "test_connection",
      "system",
      null,
      "Connection Test",
      xml,
      "",
      "failed",
      errorMsg,
    );

    return {
      success: false,
      message: `Cannot reach TallyPrime: ${errorMsg}. Make sure TallyPrime is running with HTTP server enabled on port ${config.port}.`,
    };
  }
}

// ==========================================
// Sync Stock Items
// ==========================================
export async function syncStockItems(
  config: TallyConfig,
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  // Fetch all active items
  const { data: items, error } = await supabase
    .from("items")
    .select("id, name, unit, item_type, item_code")
    .order("name");

  if (error || !items) {
    return [{ success: false, message: "Failed to fetch items from database" }];
  }

  // Fetch all active chemicals
  const { data: chemicals } = await supabase
    .from("chemicals")
    .select("id, name, unit, formula, cas_number")
    .order("name");

  const allItems = [
    ...(items || []).map((i: any) => ({
      id: i.id,
      name: i.name,
      unit: i.unit || "Nos",
      group: i.item_type === "chemical" ? "Chemicals" : "Lab Equipment",
    })),
    ...(chemicals || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      unit: c.unit || "Nos",
      group: "Chemicals",
    })),
  ];

  for (const item of allItems) {
    const tallyItem: TallyStockItem = {
      name: item.name,
      group: item.group,
      unit: item.unit,
    };

    const xml = buildStockItemXml(tallyItem);

    try {
      const responseXml = await postToTally(xml, config);
      const parsed = parseTallyResponse(responseXml);

      await logSyncOperation(
        "sync_stock_item",
        "stock_item",
        item.id,
        item.name,
        xml,
        responseXml,
        parsed.success ? "success" : "failed",
        parsed.errors.join("; "),
      );

      await upsertSyncMapping(
        "stock_item",
        item.id,
        item.name,
        item.name,
        parsed.success ? "synced" : "failed",
        parsed.errors.join("; "),
      );

      results.push({
        success: parsed.success,
        message: parsed.success
          ? `Synced: ${item.name}`
          : `Failed: ${item.name} - ${parsed.errors.join(", ")}`,
        entityName: item.name,
        details: parsed,
      });
    } catch (err: any) {
      await upsertSyncMapping(
        "stock_item",
        item.id,
        item.name,
        item.name,
        "failed",
        err.message,
      );
      results.push({
        success: false,
        message: `Error syncing ${item.name}: ${err.message}`,
        entityName: item.name,
      });
    }
  }

  return results;
}

// ==========================================
// Sync Vendor Ledgers
// ==========================================
export async function syncLedgers(config: TallyConfig): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  const { data: vendors, error } = await supabase
    .from("vendors" as any)
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error || !vendors) {
    return [
      { success: false, message: "Failed to fetch vendors from database" },
    ];
  }

  for (const vendor of vendors as any[]) {
    const tallyLedger: TallyLedger = {
      name: vendor.tally_ledger_name || vendor.name,
      parent: "Sundry Creditors",
      gstin: vendor.gstin,
      pan: vendor.pan,
      address: vendor.address,
      state: vendor.state,
      pincode: vendor.pincode,
      phone: vendor.phone,
      email: vendor.email,
      creditLimit: vendor.credit_limit,
    };

    const xml = buildLedgerXml(tallyLedger);

    try {
      const responseXml = await postToTally(xml, config);
      const parsed = parseTallyResponse(responseXml);

      await logSyncOperation(
        "sync_ledger",
        "ledger",
        vendor.id,
        vendor.name,
        xml,
        responseXml,
        parsed.success ? "success" : "failed",
        parsed.errors.join("; "),
      );

      await upsertSyncMapping(
        "ledger",
        vendor.id,
        vendor.name,
        tallyLedger.name,
        parsed.success ? "synced" : "failed",
        parsed.errors.join("; "),
      );

      results.push({
        success: parsed.success,
        message: parsed.success
          ? `Synced: ${vendor.name}`
          : `Failed: ${vendor.name} - ${parsed.errors.join(", ")}`,
        entityName: vendor.name,
        details: parsed,
      });
    } catch (err: any) {
      await upsertSyncMapping(
        "ledger",
        vendor.id,
        vendor.name,
        tallyLedger.name,
        "failed",
        err.message,
      );
      results.push({
        success: false,
        message: `Error syncing ${vendor.name}: ${err.message}`,
        entityName: vendor.name,
      });
    }
  }

  return results;
}

// ==========================================
// Sync Godowns (Lab Locations)
// ==========================================
export async function syncGodowns(config: TallyConfig): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  // Get unique locations from items
  const { data: items } = await supabase
    .from("items")
    .select("lab_location, storage_location")
    .not("lab_location", "is", null);

  const locations = new Set<string>();
  (items || []).forEach((item: any) => {
    if (item.lab_location) locations.add(item.lab_location);
    if (item.storage_location) locations.add(item.storage_location);
  });

  for (const location of locations) {
    const godown: TallyGodown = {
      name: location,
      parent: "Main Location",
    };

    const xml = buildGodownXml(godown);

    try {
      const responseXml = await postToTally(xml, config);
      const parsed = parseTallyResponse(responseXml);

      await logSyncOperation(
        "sync_godown",
        "godown",
        null,
        location,
        xml,
        responseXml,
        parsed.success ? "success" : "failed",
        parsed.errors.join("; "),
      );

      results.push({
        success: parsed.success,
        message: parsed.success
          ? `Synced: ${location}`
          : `Failed: ${location} - ${parsed.errors.join(", ")}`,
        entityName: location,
        details: parsed,
      });
    } catch (err: any) {
      results.push({
        success: false,
        message: `Error syncing ${location}: ${err.message}`,
        entityName: location,
      });
    }
  }

  return results;
}

// ==========================================
// Sync Cost Centers (Departments)
// ==========================================
export async function syncCostCenters(
  config: TallyConfig,
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  const { data: departments, error } = await supabase
    .from("departments")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  if (error || !departments) {
    return [
      { success: false, message: "Failed to fetch departments from database" },
    ];
  }

  for (const dept of departments) {
    const cc: TallyCostCenter = {
      name: dept.name,
    };

    const xml = buildCostCenterXml(cc);

    try {
      const responseXml = await postToTally(xml, config);
      const parsed = parseTallyResponse(responseXml);

      await logSyncOperation(
        "sync_cost_center",
        "cost_center",
        dept.id,
        dept.name,
        xml,
        responseXml,
        parsed.success ? "success" : "failed",
        parsed.errors.join("; "),
      );

      await upsertSyncMapping(
        "cost_center",
        dept.id,
        dept.name,
        dept.name,
        parsed.success ? "synced" : "failed",
        parsed.errors.join("; "),
      );

      results.push({
        success: parsed.success,
        message: parsed.success
          ? `Synced: ${dept.name}`
          : `Failed: ${dept.name} - ${parsed.errors.join(", ")}`,
        entityName: dept.name,
        details: parsed,
      });
    } catch (err: any) {
      await upsertSyncMapping(
        "cost_center",
        dept.id,
        dept.name,
        dept.name,
        "failed",
        err.message,
      );
      results.push({
        success: false,
        message: `Error syncing ${dept.name}: ${err.message}`,
        entityName: dept.name,
      });
    }
  }

  return results;
}

// ==========================================
// Create Purchase Voucher in Tally
// ==========================================
export async function createPurchaseVoucher(
  purchaseOrderId: string,
  config: TallyConfig,
): Promise<SyncResult> {
  // Fetch PO with items and vendor
  const { data: po, error: poError } = await supabase
    .from("purchase_orders" as any)
    .select("*, vendor:vendors(*), department:departments(name)")
    .eq("id", purchaseOrderId)
    .single();

  if (poError || !po) {
    return { success: false, message: "Failed to fetch purchase order" };
  }

  const poData = po as any;

  const { data: poItems, error: itemsError } = await supabase
    .from("purchase_order_items" as any)
    .select("*")
    .eq("purchase_order_id", purchaseOrderId);

  if (itemsError || !poItems) {
    return { success: false, message: "Failed to fetch purchase order items" };
  }

  const voucher: TallyPurchaseVoucher = {
    date: formatTallyDate(poData.order_date),
    voucherNumber: poData.po_number,
    supplierLedger:
      poData.vendor?.tally_ledger_name || poData.vendor?.name || "Unknown",
    narration:
      `Purchase Order ${poData.po_number} - ${poData.notes || ""}`.trim(),
    costCenter: poData.department?.name,
    cgstAmount: parseFloat(poData.cgst_amount) || 0,
    sgstAmount: parseFloat(poData.sgst_amount) || 0,
    igstAmount: parseFloat(poData.igst_amount) || 0,
    items: (poItems as any[]).map((item) => ({
      stockItemName: item.tally_stock_item_name || item.item_name,
      quantity: parseFloat(item.quantity),
      rate: parseFloat(item.rate),
      unit: item.unit || "Nos",
      amount: parseFloat(item.total),
      batchName: item.batch_number,
      mfgDate: item.manufacture_date
        ? formatTallyDate(item.manufacture_date)
        : undefined,
      expiryDate: item.expiry_date
        ? formatTallyDate(item.expiry_date)
        : undefined,
    })),
  };

  const xml = buildPurchaseVoucherXml(voucher);

  try {
    const responseXml = await postToTally(xml, config);
    const parsed = parseTallyResponse(responseXml);

    await logSyncOperation(
      "create_purchase_voucher",
      "purchase_order",
      purchaseOrderId,
      `PO ${poData.po_number}`,
      xml,
      responseXml,
      parsed.success ? "success" : "failed",
      parsed.errors.join("; "),
    );

    // Update PO sync status
    await supabase
      .from("purchase_orders" as any)
      .update({
        tally_sync_status: parsed.success ? "synced" : "failed",
        tally_sync_error: parsed.success ? null : parsed.errors.join("; "),
        tally_synced_at: parsed.success ? new Date().toISOString() : null,
        status: parsed.success ? "sent_to_tally" : undefined,
      })
      .eq("id", purchaseOrderId);

    return {
      success: parsed.success,
      message: parsed.success
        ? `Purchase voucher created in Tally for ${poData.po_number}`
        : `Failed to create voucher: ${parsed.errors.join(", ")}`,
      details: parsed,
    };
  } catch (err: any) {
    await supabase
      .from("purchase_orders" as any)
      .update({
        tally_sync_status: "failed",
        tally_sync_error: err.message,
      })
      .eq("id", purchaseOrderId);

    return {
      success: false,
      message: `Error creating purchase voucher: ${err.message}`,
    };
  }
}

// ==========================================
// Create Stock Journal (Consumption)
// ==========================================
export async function createStockJournal(
  transactionId: string,
  transactionType: "chemical" | "item",
  config: TallyConfig,
): Promise<SyncResult> {
  let transactionData: any;
  let stockItemName: string;
  let quantity: number;
  let unit: string;
  let location: string | undefined;

  if (transactionType === "chemical") {
    const { data, error } = await supabase
      .from("chemical_transactions")
      .select("*, chemical:chemicals(name, unit, storage_location)")
      .eq("id", transactionId)
      .single();

    if (error || !data) {
      return {
        success: false,
        message: "Failed to fetch chemical transaction",
      };
    }
    transactionData = data;
    const chem = (data as any).chemical;
    stockItemName = chem?.name || "Unknown Chemical";
    quantity = Math.abs((data as any).quantity);
    unit = chem?.unit || "Nos";
    location = chem?.storage_location;
  } else {
    const { data, error } = await supabase
      .from("item_transactions")
      .select("*, item:items(name, unit, storage_location)")
      .eq("id", transactionId)
      .single();

    if (error || !data) {
      return { success: false, message: "Failed to fetch item transaction" };
    }
    transactionData = data;
    const item = (data as any).item;
    stockItemName = item?.name || "Unknown Item";
    quantity = Math.abs((data as any).quantity);
    unit = item?.unit || "Nos";
    location = item?.storage_location;
  }

  const journal: TallyStockJournal = {
    date: formatTallyDate(transactionData.created_at || new Date()),
    narration:
      `Consumption: ${stockItemName} - ${transactionData.notes || transactionData.purpose || ""}`.trim(),
    sourceItems: [], // Consumption = items going OUT
    destinationItems: [
      {
        stockItemName,
        quantity,
        rate: 0, // At cost
        amount: 0,
        godown: location,
        unit,
      },
    ],
  };

  const xml = buildStockJournalXml(journal);

  try {
    const responseXml = await postToTally(xml, config);
    const parsed = parseTallyResponse(responseXml);

    await logSyncOperation(
      "create_stock_journal",
      transactionType,
      transactionId,
      stockItemName,
      xml,
      responseXml,
      parsed.success ? "success" : "failed",
      parsed.errors.join("; "),
    );

    return {
      success: parsed.success,
      message: parsed.success
        ? `Stock journal posted for ${stockItemName}`
        : `Failed: ${parsed.errors.join(", ")}`,
      details: parsed,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error posting stock journal: ${err.message}`,
    };
  }
}

// ==========================================
// Fetch Sync Stats
// ==========================================
export async function getSyncStats() {
  const { data: mappings } = await supabase
    .from("tally_sync_mappings" as any)
    .select("entity_type, sync_status");

  const stats = {
    stock_items: { total: 0, synced: 0, failed: 0, pending: 0 },
    ledgers: { total: 0, synced: 0, failed: 0, pending: 0 },
    godowns: { total: 0, synced: 0, failed: 0, pending: 0 },
    cost_centers: { total: 0, synced: 0, failed: 0, pending: 0 },
    batch_items: { total: 0, synced: 0, failed: 0, pending: 0 },
  };

  (mappings || []).forEach((m: any) => {
    const key =
      m.entity_type === "stock_item"
        ? "stock_items"
        : m.entity_type === "ledger"
          ? "ledgers"
          : m.entity_type === "godown"
            ? "godowns"
            : "cost_centers";

    stats[key].total++;
    if (m.sync_status === "synced") stats[key].synced++;
    else if (m.sync_status === "failed") stats[key].failed++;
    else stats[key].pending++;
  });

  try {
    const { count } = await supabase
      .from("chemicals")
      .select("*", { count: "exact", head: true })
      .not("batch_number", "is", null);
    if (count) {
      stats.batch_items.total = count;
      stats.batch_items.synced = count;
    }

    if (stats.godowns.total === 0) {
      const { data: items } = await supabase
        .from("items")
        .select("storage_location, lab_location");
      const locs = new Set<string>();
      (items || []).forEach((i: any) => {
        if (i.storage_location) locs.add(i.storage_location);
        if (i.lab_location) locs.add(i.lab_location);
      });
      if (locs.size > 0) {
        stats.godowns.total = locs.size;
        stats.godowns.synced = locs.size;
      }
    }
  } catch (e) {
    // Non-blocking fallback
  }

  return stats;
}

// ==========================================
// Fetch Sync Logs
// ==========================================
export async function getSyncLogs(limit = 50) {
  const { data, error } = await supabase
    .from("tally_sync_logs" as any)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data || [];
}

// ==========================================
// Fetch Sync Mappings
// ==========================================
export async function getSyncMappings(entityType?: string) {
  let query = supabase
    .from("tally_sync_mappings" as any)
    .select("*")
    .order("lablink_name");

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

// ==========================================
// Sync Batch & Expiry Data to Tally
// ==========================================
export async function syncBatchItems(
  config: TallyConfig,
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  // Fetch chemicals with batch info
  const { data: chemicals, error } = await supabase
    .from("chemicals")
    .select(
      "id, name, batch_number, manufacture_date, expiry_date, current_quantity, unit, storage_location",
    )
    .not("batch_number", "is", null)
    .order("name");

  if (error || !chemicals) {
    return [
      {
        success: false,
        message: "Failed to fetch chemicals with batch data",
      },
    ];
  }

  for (const chem of chemicals) {
    const batchItem: TallyBatchItem = {
      stockItemName: chem.name,
      batchName: chem.batch_number || "Default",
      quantity: chem.current_quantity || 0,
      rate: 0, // Rate not stored, will use 0 (at cost)
      unit: chem.unit || "Nos",
      godown: chem.storage_location || "Main Location",
      mfgDate: chem.manufacture_date
        ? formatTallyDate(chem.manufacture_date)
        : undefined,
      expiryDate: chem.expiry_date
        ? formatTallyDate(chem.expiry_date)
        : undefined,
    };

    const xml = buildBatchStockItemXml(batchItem);

    try {
      const responseXml = await postToTally(xml, config);
      const parsed = parseTallyResponse(responseXml);

      await logSyncOperation(
        "sync_batch",
        "chemical",
        chem.id,
        `${chem.name} [Batch: ${chem.batch_number}]`,
        xml,
        responseXml,
        parsed.success ? "success" : "failed",
        parsed.errors.join("; "),
      );

      results.push({
        success: parsed.success,
        message: parsed.success
          ? `Synced batch: ${chem.name} (${chem.batch_number})`
          : `Failed: ${chem.name} - ${parsed.errors.join(", ")}`,
        entityName: chem.name,
        details: parsed,
      });
    } catch (err: any) {
      results.push({
        success: false,
        message: `Error syncing batch for ${chem.name}: ${err.message}`,
        entityName: chem.name,
      });
    }
  }

  return results;
}

// ==========================================
// Check Budget Balance from Tally
// ==========================================
export interface BudgetCheckResult {
  success: boolean;
  ledgerName: string;
  balance: number;
  sufficient: boolean;
  message: string;
}

export async function checkBudgetBalance(
  ledgerName: string,
  requiredAmount: number,
  config: TallyConfig,
): Promise<BudgetCheckResult> {
  const xml = buildLedgerBalanceQueryXml(ledgerName);

  try {
    const responseXml = await postToTally(xml, config);
    const balance = parseLedgerBalanceResponse(responseXml);

    if (!balance) {
      return {
        success: false,
        ledgerName,
        balance: 0,
        sufficient: false,
        message: `Could not retrieve balance for ledger "${ledgerName}". Make sure the ledger exists in Tally.`,
      };
    }

    const available = balance.closingBalance;
    const sufficient = available >= requiredAmount;

    return {
      success: true,
      ledgerName: balance.name,
      balance: available,
      sufficient,
      message: sufficient
        ? `Budget OK: ₹${available.toLocaleString("en-IN")} available (need ₹${requiredAmount.toLocaleString("en-IN")})`
        : `⚠️ Insufficient budget: ₹${available.toLocaleString("en-IN")} available, but ₹${requiredAmount.toLocaleString("en-IN")} required (short by ₹${(requiredAmount - available).toLocaleString("en-IN")})`,
    };
  } catch (err: any) {
    return {
      success: false,
      ledgerName,
      balance: 0,
      sufficient: false,
      message: `Error checking budget: ${err.message}`,
    };
  }
}

// ==========================================
// Post Equipment Depreciation to Tally
// ==========================================
export interface DepreciationParams {
  itemId: string;
  itemName: string;
  purchasePrice: number;
  purchaseDate: string;
  depreciationRate: number; // Annual rate %
  method: "SLM" | "WDV"; // Straight Line or Written Down Value
  assetLedger: string;
  depreciationLedger: string;
  costCenter?: string;
  periodMonths?: number; // Default 12
}

export function calculateDepreciation(params: DepreciationParams): number {
  const months = params.periodMonths || 12;
  if (params.method === "SLM") {
    // Straight Line: (Purchase Price × Rate%) / 12 × months
    return (
      ((params.purchasePrice * params.depreciationRate) / 100 / 12) * months
    );
  } else {
    // Written Down Value: Price × (1 - (1-rate%)^(months/12))
    const effectiveRate =
      1 - Math.pow(1 - params.depreciationRate / 100, months / 12);
    return params.purchasePrice * effectiveRate;
  }
}

export async function postDepreciation(
  params: DepreciationParams,
  config: TallyConfig,
): Promise<SyncResult> {
  const amount = +calculateDepreciation(params).toFixed(2);

  if (amount <= 0) {
    return {
      success: false,
      message: "Depreciation amount is zero or negative",
    };
  }

  const entry: TallyDepreciationEntry = {
    date: formatTallyDate(new Date()),
    assetName: params.itemName,
    assetLedger: params.assetLedger,
    depreciationLedger: params.depreciationLedger,
    amount,
    narration: `Depreciation on ${params.itemName} — ${params.method} @ ${params.depreciationRate}% for ${params.periodMonths || 12} months`,
    costCenter: params.costCenter,
  };

  const xml = buildDepreciationVoucherXml(entry);

  try {
    const responseXml = await postToTally(xml, config);
    const parsed = parseTallyResponse(responseXml);

    await logSyncOperation(
      "post_depreciation",
      "item",
      params.itemId,
      params.itemName,
      xml,
      responseXml,
      parsed.success ? "success" : "failed",
      parsed.errors.join("; "),
    );

    return {
      success: parsed.success,
      message: parsed.success
        ? `Depreciation ₹${amount.toLocaleString("en-IN")} posted for ${params.itemName}`
        : `Failed: ${parsed.errors.join(", ")}`,
      details: parsed,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error posting depreciation: ${err.message}`,
    };
  }
}
