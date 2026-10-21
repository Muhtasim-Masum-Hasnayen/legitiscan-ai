// Mirrors the FastAPI response models (backend/app/schemas.py) and the pipeline report (services/pipeline.py).
export type Verdict = "likely_authentic" | "potentially_counterfeit" | "inconclusive";

export interface User { id: number; email: string; name: string | null }
export interface TokenResponse { access_token: string; token_type: string; user: User }

export interface ScanImageInfo { position: number; original_name: string; width: number; height: number; size_bytes: number }

export interface ScanSummary {
  id: string;
  status: "processing" | "completed" | "failed";
  verdict: Verdict | null;
  authenticity_score: number | null;
  headline: string | null;
  brand_hint: string | null;
  product_hint: string | null;
  image_count: number;
  created_at: string;
}

export interface Signal {
  key: string; label: string; weight: number; authenticity: number | null;
  status: "scored" | "unavailable"; detail: string;
}
export interface Evidence { type: string; severity: "positive" | "negative" | "warning" | "info"; title: string; detail: string }
export interface QualityReport {
  sharpness: number; brightness: number; contrast: number; blocking: boolean;
  issues: { code: string; blocking: boolean; message: string }[];
}
export interface ReferenceCandidate { id: string; brand: string; product_name: string; score: number; barcodes: string[] }
export interface MissingAsset { component: string; missing: string[]; how_to_fix: string }

export interface ScanResult {
  verdict: Verdict;
  headline: string;
  summary: string;
  evidence_score: number | null;
  evidence_score_note: string;
  reasons: string[];
  signals: Signal[];
  evidence: Evidence[];
  ocr: {
    text: string; ran: boolean; mean_confidence: number | null;
    lines: { text: string; confidence: number }[];
    fields: {
      batch_codes: string[];
      dates: { label: string; value: string }[];
      barcodes: { value: string; valid_check_digit: boolean }[];
    };
  };
  classifier: { per_image: { p_authentic: number; p_counterfeit: number }[] };
  reference_match: { best: ReferenceCandidate; candidates: ReferenceCandidate[]; brand_filter_applied: boolean } | null;
  quality: QualityReport[];
  hints: { brand: string | null; product_name: string | null };
  missing_assets: MissingAsset[];
  thresholds: { authentic: number; counterfeit: number; disagreement: number };
  recommendations: string[];
  disclaimer: string;
}

export interface ScanDetail extends ScanSummary {
  images: ScanImageInfo[];
  result: ScanResult | null;
  error: string | null;
}
export interface ScanList { items: ScanSummary[]; total: number; page: number; page_size: number }

export interface SystemComponent { key: string; name: string; available: boolean; detail: string; missing: string[]; how_to_fix: string }
export interface SystemLimits { max_upload_mb: number; max_files_per_scan: number; min_image_side: number; allowed_types: string[] }
export interface SystemStatus { ready: boolean; components: SystemComponent[]; limits: SystemLimits; auth_required: boolean }

export type FeedbackCategory = "bug" | "wrong_result" | "feature" | "general";
export interface FeedbackInput {
  category: FeedbackCategory; rating?: number | null; message: string; email?: string; scan_id?: string;
}
