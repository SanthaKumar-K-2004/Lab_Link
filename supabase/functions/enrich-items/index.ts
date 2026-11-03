import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// ─── Keyword-based heuristics (always runs as fallback) ───────────────────────

const ITEM_TYPE_KEYWORDS: Record<string, string[]> = {
  Equipment: [
    "oscilloscope",
    "multimeter",
    "generator",
    "analyzer",
    "scope",
    "spectrometer",
    "microscope",
    "centrifuge",
    "autoclave",
    "incubator",
    "printer",
    "scanner",
    "projector",
    "monitor",
    "computer",
    "laptop",
    "server",
    "router",
    "switch",
    "camera",
    "drone",
    "robot",
    "power supply",
    "function generator",
    "signal generator",
  ],
  Glassware: [
    "beaker",
    "flask",
    "test tube",
    "pipette",
    "burette",
    "funnel",
    "petri dish",
    "graduated cylinder",
    "volumetric",
    "erlenmeyer",
    "condenser",
    "distillation",
    "round bottom",
    "watch glass",
  ],
  Chemical: [
    "acid",
    "base",
    "solvent",
    "reagent",
    "solution",
    "compound",
    "ethanol",
    "methanol",
    "acetone",
    "chloroform",
    "sulfuric",
    "hydrochloric",
    "nitric",
    "sodium hydroxide",
    "potassium",
    "indicator",
    "buffer",
    "catalyst",
  ],
  "Measuring Instrument": [
    "caliper",
    "micrometer",
    "gauge",
    "thermometer",
    "hygrometer",
    "barometer",
    "manometer",
    "scale",
    "balance",
    "weighing",
    "flow meter",
    "ph meter",
    "conductivity meter",
    "lux meter",
  ],
  "Safety Equipment": [
    "goggles",
    "gloves",
    "lab coat",
    "face shield",
    "respirator",
    "fire extinguisher",
    "first aid",
    "safety shower",
    "eye wash",
    "fume hood",
    "biosafety cabinet",
    "ppe",
  ],
  Tool: [
    "wrench",
    "screwdriver",
    "plier",
    "hammer",
    "drill",
    "saw",
    "cutter",
    "crimper",
    "soldering",
    "wire stripper",
    "hex key",
    "socket",
    "ratchet",
    "clamp",
    "vise",
  ],
  Consumable: [
    "filter paper",
    "litmus",
    "tape",
    "adhesive",
    "wire",
    "cable",
    "resistor",
    "capacitor",
    "led",
    "transistor",
    "diode",
    "fuse",
    "battery",
    "solder",
    "flux",
    "thermal paste",
    "lubricant",
  ],
  Furniture: [
    "table",
    "chair",
    "desk",
    "cabinet",
    "shelf",
    "rack",
    "stool",
    "workbench",
    "trolley",
    "locker",
    "whiteboard",
  ],
};

const SAFETY_KEYWORDS: Record<string, string[]> = {
  hazardous: [
    "radioactive",
    "biohazard",
    "carcinogen",
    "toxic gas",
    "explosive",
    "cyanide",
    "mercury",
  ],
  high: [
    "acid",
    "corrosive",
    "flammable",
    "oxidizer",
    "toxic",
    "concentrated",
    "fuming",
    "pyrophoric",
    "reactive",
    "hazardous",
    "dangerous",
  ],
  medium: [
    "laser",
    "high voltage",
    "uv",
    "compressed gas",
    "hot plate",
    "centrifuge",
    "autoclave",
    "solvent",
    "irritant",
    "sharp",
    "electrical",
    "heavy",
  ],
  low: [],
};

const DEFAULT_QUANTITIES: Record<string, number> = {
  Equipment: 1,
  Glassware: 10,
  Chemical: 5,
  "Measuring Instrument": 2,
  "Safety Equipment": 10,
  Tool: 3,
  Consumable: 50,
  Furniture: 1,
};

function inferItemType(name: string, description?: string): string | null {
  const text = `${name} ${description || ""}`.toLowerCase();
  for (const [type, keywords] of Object.entries(ITEM_TYPE_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) return type;
  }
  return null;
}

function inferSafetyLevel(name: string, description?: string): string | null {
  const text = `${name} ${description || ""}`.toLowerCase();
  for (const level of ["hazardous", "high", "medium"] as const) {
    if (SAFETY_KEYWORDS[level].some((kw) => text.includes(kw))) return level;
  }
  return "low";
}

function inferDefaultQuantity(itemType: string | null): number {
  if (itemType && DEFAULT_QUANTITIES[itemType]) {
    return DEFAULT_QUANTITIES[itemType];
  }
  return 1;
}

// ─── Image result type ────────────────────────────────────────────────────────

interface ImageResult {
  url: string;
  source: string;
  width?: number;
  height?: number;
  mime?: string;
  title?: string;
}

// ─── Normalize URL for dedup ──────────────────────────────────────────────────

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.toLowerCase().replace(/\/$/, "");
  } catch {
    return url.toLowerCase();
  }
}

function deduplicateImages(images: ImageResult[]): ImageResult[] {
  const seen = new Set<string>();
  return images.filter((img) => {
    const key = normalizeUrl(img.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Image validation ─────────────────────────────────────────────────────────

const VALID_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];

function isValidImageUrl(url: string): boolean {
  if (!url || !url.startsWith("http")) return false;
  const lower = url.toLowerCase();
  // Skip tiny placeholders, SVG icons, logos
  if (lower.includes("1x1") || lower.includes("pixel")) return false;
  if (lower.endsWith(".svg")) return false;
  if (lower.includes("logo") && lower.includes("wiki")) return false;
  if (
    lower.includes("icon") &&
    (lower.includes("commons") || lower.includes("wiki"))
  )
    return false;
  // Must end with valid image extension or be a wikimedia thumb URL
  const hasValidExt = /\.(jpe?g|png|webp)(\?.*)?$/i.test(lower);
  const isThumb = lower.includes("/thumb/") && lower.includes("wikimedia");
  return hasValidExt || isThumb;
}

function isValidImageFormat(mime?: string): boolean {
  if (!mime) return true; // Allow if mime not provided (we'll check URL instead)
  return VALID_IMAGE_MIMES.includes(mime.toLowerCase());
}

function meetsMinResolution(
  width?: number,
  height?: number,
  minSize = 500,
): boolean {
  if (!width || !height) return true; // Allow if dimensions not known
  return width >= minSize && height >= minSize;
}

// ─── Wikimedia Commons Search (primary & only image source) ───────────────────

async function fetchFromWikimediaCommons(
  query: string,
  limit = 10,
): Promise<ImageResult[]> {
  const images: ImageResult[] = [];
  try {
    const searchUrl =
      `https://commons.wikimedia.org/w/api.php?action=query` +
      `&generator=search&gsrsearch=${encodeURIComponent(query)}` +
      `&gsrlimit=${limit}&gsrnamespace=6` +
      `&prop=imageinfo&iiprop=url|size|mime` +
      `&iiurlwidth=800&format=json&origin=*`;

    const resp = await fetch(searchUrl, {
      headers: { "User-Agent": "LabLink-Inventory/1.0 (contact@lablink.app)" },
    });

    if (!resp.ok) {
      console.error(`Wikimedia API error: ${resp.status}`);
      return images;
    }

    const data = await resp.json();
    const pages = data.query?.pages;
    if (!pages) return images;

    for (const page of Object.values(pages) as any[]) {
      if (page.imageinfo && page.imageinfo.length > 0) {
        const info = page.imageinfo[0];

        // Only accept valid image formats (jpg, png, webp)
        if (!isValidImageFormat(info.mime)) continue;

        // Check minimum resolution (500x500)
        const imgWidth = info.thumbwidth || info.width;
        const imgHeight = info.thumbheight || info.height;
        if (!meetsMinResolution(imgWidth, imgHeight, 300)) continue;
        // We use 300 as the threshold for thumbnails since iiurlwidth=800
        // will give us 800px wide thumbs, but original might be 500+

        // Use the thumbnail URL (800px wide) for consistent sizing
        const imgUrl = info.thumburl || info.url;
        if (imgUrl && isValidImageUrl(imgUrl)) {
          images.push({
            url: imgUrl,
            source: "wikimedia_auto",
            width: imgWidth,
            height: imgHeight,
            mime: info.mime,
            title: page.title,
          });
        }
      }
    }
  } catch (err) {
    console.error(`Wikimedia Commons fetch error for "${query}":`, err);
  }
  return images;
}

// ─── Wikipedia (for descriptions only, no images) ─────────────────────────────

async function fetchDescriptionFromWikipedia(
  query: string,
): Promise<string | null> {
  try {
    const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    const resp = await fetch(searchUrl, {
      headers: { "User-Agent": "LabLink-Inventory/1.0" },
    });

    if (!resp.ok) {
      // Try simplified search
      const simplified = query.split(/\s+/).slice(0, 2).join(" ");
      const retryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(simplified)}`;
      const retryResp = await fetch(retryUrl, {
        headers: { "User-Agent": "LabLink-Inventory/1.0" },
      });
      if (!retryResp.ok) return null;
      const retryData = await retryResp.json();
      return retryData.extract || null;
    }

    const data = await resp.json();
    return data.extract || null;
  } catch (err) {
    console.error(`Wikipedia fetch error for "${query}":`, err);
    return null;
  }
}

// ─── DuckDuckGo (for descriptions only, no images) ───────────────────────────

async function fetchDescriptionFromDuckDuckGo(
  query: string,
): Promise<string | null> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "LabLink-Inventory/1.0" },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.Abstract || data.AbstractText || data.Answer || null;
  } catch (err) {
    console.error(`DuckDuckGo fetch error for "${query}":`, err);
    return null;
  }
}

// ─── Main enrichment per item ─────────────────────────────────────────────────

const TARGET_IMAGE_COUNT = 5;

interface EnrichmentResult {
  name: string;
  description: string | null;
  image_url: string | null;
  image_urls: ImageResult[];
  item_type: string | null;
  safety_level: string | null;
  suggested_quantity: number;
  source: string;
  search_query: string;
  image_search_status: "found" | "partial" | "not_found";
  image_count: number;
}

async function enrichItem(
  name: string,
  brand?: string,
  catalogNumber?: string,
): Promise<EnrichmentResult> {
  // Build primary search query
  const searchParts = [name, brand, catalogNumber].filter(Boolean);
  const primaryQuery = searchParts.join(" ");
  const labQuery = `${primaryQuery} laboratory equipment`;

  // 1. Fetch descriptions from Wikipedia and DuckDuckGo (in parallel)
  const [wikiDesc, ddgDesc] = await Promise.all([
    fetchDescriptionFromWikipedia(primaryQuery),
    fetchDescriptionFromDuckDuckGo(labQuery),
  ]);

  const description = wikiDesc || ddgDesc;
  const descSource = wikiDesc
    ? "wikipedia"
    : ddgDesc
      ? "duckduckgo"
      : "heuristic";

  // 2. Fetch images from Wikimedia Commons ONLY
  let allImages: ImageResult[] = [];

  // Primary query: item name + brand + catalog number
  const primaryImages = await fetchFromWikimediaCommons(primaryQuery, 10);
  allImages.push(...primaryImages);

  // If not enough images, try with lab context
  if (allImages.length < TARGET_IMAGE_COUNT) {
    const labImages = await fetchFromWikimediaCommons(labQuery, 10);
    allImages.push(...labImages);
  }

  // If still not enough, try simplified queries
  if (allImages.length < TARGET_IMAGE_COUNT) {
    // Try just item name
    const simpleImages = await fetchFromWikimediaCommons(name, 10);
    allImages.push(...simpleImages);
  }

  // If still not enough, try item name + "product"
  if (allImages.length < TARGET_IMAGE_COUNT) {
    const productImages = await fetchFromWikimediaCommons(
      `${name} product`,
      10,
    );
    allImages.push(...productImages);
  }

  // 3. Deduplicate
  allImages = deduplicateImages(allImages);

  // 4. Filter for quality: valid format + minimum resolution
  allImages = allImages.filter((img) => {
    if (!isValidImageUrl(img.url)) return false;
    if (!isValidImageFormat(img.mime)) return false;
    return true;
  });

  // 5. Take exactly TARGET_IMAGE_COUNT (5)
  allImages = allImages.slice(0, TARGET_IMAGE_COUNT);

  // 6. Determine image search status
  let imageSearchStatus: "found" | "partial" | "not_found";
  if (allImages.length >= TARGET_IMAGE_COUNT) {
    imageSearchStatus = "found";
  } else if (allImages.length > 0) {
    imageSearchStatus = "partial";
  } else {
    imageSearchStatus = "not_found";
  }

  const itemType = inferItemType(name, description || undefined);

  return {
    name,
    description,
    image_url: allImages[0]?.url || null,
    image_urls: allImages,
    item_type: itemType,
    safety_level: inferSafetyLevel(name, description || undefined),
    suggested_quantity: inferDefaultQuantity(itemType),
    source: descSource,
    search_query: primaryQuery,
    image_search_status: imageSearchStatus,
    image_count: allImages.length,
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Security: Verify authenticated caller (admin/staff or authenticated user) ──
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired authentication token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Role check: Only admin and staff may trigger inventory enrichment batch jobs
    const { data: roleRecord } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!roleRecord || !["admin", "staff"].includes(roleRecord.role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Only staff and administrators may enrich inventory items" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { items } = (await req.json()) as {
      items: Array<{ name: string; brand?: string; catalog_number?: string }>;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "No items provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Limit batch size to prevent abuse
    const batch = items.slice(0, 50);
    console.log(`Enriching ${batch.length} items (Wikimedia Commons only)...`);

    // Process items with concurrency limit (3 at a time)
    const results: EnrichmentResult[] = [];
    const concurrencyLimit = 3;

    for (let i = 0; i < batch.length; i += concurrencyLimit) {
      const chunk = batch.slice(i, i + concurrencyLimit);
      const chunkResults = await Promise.allSettled(
        chunk.map((item) =>
          enrichItem(item.name, item.brand, item.catalog_number),
        ),
      );

      // Handle individual failures gracefully
      for (let j = 0; j < chunkResults.length; j++) {
        const result = chunkResults[j];
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          console.error(`Failed to enrich "${chunk[j].name}":`, result.reason);
          const itemType = inferItemType(chunk[j].name);
          results.push({
            name: chunk[j].name,
            description: null,
            image_url: null,
            image_urls: [],
            item_type: itemType,
            safety_level: inferSafetyLevel(chunk[j].name),
            suggested_quantity: inferDefaultQuantity(itemType),
            source: "heuristic",
            search_query: chunk[j].name,
            image_search_status: "not_found",
            image_count: 0,
          });
        }
      }

      // Rate-limit: 300ms delay between chunks
      if (i + concurrencyLimit < batch.length) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    const stats = {
      total: results.length,
      descriptions: results.filter((r) => r.description).length,
      fullImages: results.filter((r) => r.image_count >= TARGET_IMAGE_COUNT)
        .length,
      partialImages: results.filter(
        (r) => r.image_count > 0 && r.image_count < TARGET_IMAGE_COUNT,
      ).length,
      noImages: results.filter((r) => r.image_count === 0).length,
      totalImages: results.reduce((sum, r) => sum + r.image_count, 0),
    };
    console.log(
      `Enrichment complete: ${stats.descriptions} descriptions, ` +
        `${stats.fullImages} items with ${TARGET_IMAGE_COUNT}/5 images, ` +
        `${stats.partialImages} partial, ${stats.noImages} no images, ` +
        `${stats.totalImages} total images`,
    );

    return new Response(JSON.stringify({ results, stats }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Enrich error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
};

serve(handler);
