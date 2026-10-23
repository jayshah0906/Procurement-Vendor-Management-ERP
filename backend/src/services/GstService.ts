import { BadRequestError } from "../utils/errors";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const LOOKUP_TIMEOUT_MS = 8000;

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const CHECKSUM_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "25": "Daman & Diu", "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala",
  "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar Islands", "36": "Telangana",
  "37": "Andhra Pradesh", "38": "Ladakh", "97": "Other Territory", "99": "Centre Jurisdiction",
};

export interface GstVerificationResult {
  gstin: string;
  valid: boolean;
  live_checked: boolean;
  message: string;
  state: string | null;
  pan: string;
  legal_name: string | null;
  trade_name: string | null;
  status: string | null;
  address: string | null;
  registration_date: string | null;
  taxpayer_type: string | null;
}

const cache = new Map<string, { expires: number; result: GstVerificationResult }>();

export class GstService {
  static normalize(gstin: string): string {
    return (gstin || "").replace(/\s+/g, "").toUpperCase();
  }

  /** Computes the 15th (check) character of a GSTIN using the official mod-36 algorithm. */
  static computeChecksum(gstin: string): string {
    let sum = 0;
    for (let i = 0; i < 14; i++) {
      const product = CHECKSUM_CHARS.indexOf(gstin[i]) * ((i % 2) + 1);
      sum += Math.floor(product / 36) + (product % 36);
    }
    return CHECKSUM_CHARS[(36 - (sum % 36)) % 36];
  }

  /** Offline structural check: format, state code and checksum. Returns an error message or null. */
  static structuralError(gstin: string): string | null {
    if (gstin.length !== 15) return "GSTIN must be exactly 15 characters";
    if (!GSTIN_REGEX.test(gstin)) return "GSTIN format is invalid (expected e.g. 27AAPFU0939F1ZV)";
    if (!STATE_CODES[gstin.slice(0, 2)]) return `Invalid state code '${gstin.slice(0, 2)}'`;
    if (GstService.computeChecksum(gstin) !== gstin[14]) return "GSTIN checksum does not match — please re-check the number";
    return null;
  }

  static async verify(rawGstin: string): Promise<GstVerificationResult> {
    const gstin = GstService.normalize(rawGstin);
    const base: GstVerificationResult = {
      gstin,
      valid: false,
      live_checked: false,
      message: "",
      state: STATE_CODES[gstin.slice(0, 2)] || null,
      pan: gstin.slice(2, 12),
      legal_name: null,
      trade_name: null,
      status: null,
      address: null,
      registration_date: null,
      taxpayer_type: null,
    };

    const structuralError = GstService.structuralError(gstin);
    if (structuralError) return { ...base, message: structuralError };

    const cached = cache.get(gstin);
    if (cached && cached.expires > Date.now()) return cached.result;

    const apiKey = process.env.GST_API_KEY || "";
    const apiUrl = process.env.GST_API_URL || "https://sheet.gstincheck.co.in/check";

    // Without an API key we can only vouch for the structure of the number.
    if (!apiKey) {
      return { ...base, valid: true, message: "GSTIN format and checksum are valid (live GST portal lookup not configured)" };
    }

    let payload: any;
    try {
      const response = await fetch(`${apiUrl}/${encodeURIComponent(apiKey)}/${gstin}`, {
        signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
      });
      payload = await response.json();
    } catch (err) {
      console.error("[GstService] Live GST lookup failed:", err);
      return { ...base, valid: true, message: "GSTIN format and checksum are valid (GST portal unreachable, live check skipped)" };
    }

    const data = payload?.data;
    if (!payload?.flag || !data) {
      const result = { ...base, live_checked: true, message: payload?.message || "GSTIN not found on the GST portal" };
      cache.set(gstin, { expires: Date.now() + CACHE_TTL_MS, result });
      return result;
    }

    const status: string | null = data.sts || null;
    const isActive = (status || "").toLowerCase() === "active";
    const result: GstVerificationResult = {
      ...base,
      valid: isActive,
      live_checked: true,
      message: isActive ? "GSTIN verified on the GST portal" : `GSTIN registration is ${status || "not active"}`,
      legal_name: data.lgnm || null,
      trade_name: data.tradeNam || null,
      status,
      address: data.pradr?.adr || null,
      registration_date: data.rgdt || null,
      taxpayer_type: data.dty || null,
    };
    cache.set(gstin, { expires: Date.now() + CACHE_TTL_MS, result });
    return result;
  }

  /** Throws a BadRequestError if the GSTIN is not legitimate. Used to enforce verification on registration. */
  static async assertValid(rawGstin: string): Promise<GstVerificationResult> {
    const result = await GstService.verify(rawGstin);
    if (!result.valid) throw new BadRequestError(`GST verification failed: ${result.message}`);
    return result;
  }
}
