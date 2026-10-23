import { AppError, BadRequestError } from "../utils/errors";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const LOOKUP_TIMEOUT_MS = 10000;
// errorCodes such as API_KEY_INVALID that mean our API account is the problem, not the GSTIN
const ACCOUNT_ERROR_CODE = /API_KEY|CREDIT|BALANCE|LIMIT|QUOTA|EXPIRED|PLAN/i;

export interface GstVerificationResult {
  gstin: string;
  valid: boolean;
  message: string;
  legal_name: string | null;
  trade_name: string | null;
  status: string | null;
  state: string | null;
  address: string | null;
  registration_date: string | null;
  taxpayer_type: string | null;
}

const cache = new Map<string, { expires: number; result: GstVerificationResult }>();

/**
 * GSTIN verification against the GST portal via gstincheck.co.in.
 * Every check goes through the live API; there is no offline fallback.
 */
export class GstService {
  static normalize(gstin: string): string {
    return (gstin || "").replace(/\s+/g, "").toUpperCase();
  }

  static async verify(rawGstin: string): Promise<GstVerificationResult> {
    const gstin = GstService.normalize(rawGstin);
    if (!gstin) throw new BadRequestError("GST number is required");

    const cached = cache.get(gstin);
    if (cached && cached.expires > Date.now()) return cached.result;

    const apiKey = process.env.GST_API_KEY || "";
    const apiUrl = process.env.GST_API_URL || "https://sheet.gstincheck.co.in/check";
    if (!apiKey) {
      throw new AppError("GST verification service is not configured. Please contact the administrator.", 503);
    }

    let payload: any;
    try {
      const response = await fetch(`${apiUrl}/${encodeURIComponent(apiKey)}/${encodeURIComponent(gstin)}`, {
        signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
      });
      payload = await response.json();
    } catch (err) {
      console.error("[GstService] GST API request failed:", err);
      throw new AppError("Could not reach the GST verification service. Please try again.", 502);
    }

    const data = payload?.data;
    if (!payload?.flag || !data) {
      // The API reports errors with flag: false (even on HTTP 200). Account problems are ours, not the vendor's.
      if (ACCOUNT_ERROR_CODE.test(payload?.errorCode || "")) {
        console.error("[GstService] GST API account error:", payload?.errorCode, payload?.message);
        throw new AppError("GST verification service is temporarily unavailable. Please try again later.", 503);
      }
      return {
        gstin,
        valid: false,
        message: payload?.message || "GSTIN not found on the GST portal",
        legal_name: null,
        trade_name: null,
        status: null,
        state: null,
        address: null,
        registration_date: null,
        taxpayer_type: null,
      };
    }

    const status: string | null = data.sts || null;
    const isActive = (status || "").toLowerCase() === "active";
    const result: GstVerificationResult = {
      gstin,
      valid: isActive,
      message: isActive ? "GSTIN verified on the GST portal" : `GSTIN registration is ${status || "not active"}`,
      legal_name: data.lgnm || null,
      trade_name: data.tradeNam || null,
      status,
      state: data.pradr?.addr?.stcd || null,
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
