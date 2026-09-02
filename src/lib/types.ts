// ── API 공통 래퍼 ────────────────────────────────────────────────
export type ApiSuccess<T> = { ok: true; data: T }
export type ApiError = {
  ok: false
  error: {
    code: string
    message: string
    field: string | null
    hint?: string | null
  }
}
export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ── ELS 조건 ─────────────────────────────────────────────────────
export interface ElsTerms {
  underlyings: string[]
  coupon_annual: number             // 0.08 = 연 8%
  maturity_months: number           // 36
  check_interval_months: number     // 6
  step_down_barriers: number[]      // [0.90, 0.90, ...]
  knock_in: number | null           // 0.50 = 50%, null = 낙인 없음
  principal?: number                // 원 단위, 생략 시 10_000_000
}

// ── 사용자 프로필 ─────────────────────────────────────────────────
export interface UserProfile {
  age_band: '20_30s' | '40_50s' | '60s_plus' | null
  risk_appetite: 'conservative' | 'neutral' | 'aggressive' | null
}

// ── /presets ─────────────────────────────────────────────────────
export interface Preset {
  id: string
  label: string
  one_line: string
  expected_grade: string
  els_terms: ElsTerms
}

export interface PresetsData {
  presets: Preset[]
}

// ── /extract ─────────────────────────────────────────────────────
export interface ExtractData {
  els_terms: ElsTerms
  confidence: Record<string, number>
  warnings: string[]
}

// ── /diagnose ────────────────────────────────────────────────────
export interface DiagnoseData {
  loss_probability: number          // 0.12 = 12%
  grade: string                     // "저위험" | "중위험" | "고위험"
  expected_return: number           // 연환산 기대수익 (0.031 = 3.1%)
  promised_coupon_annual: number    // 광고 쿠폰 (0.08)
  cvar_95: number                   // 하위 5% 평균 (-0.38)
  early_redemption_probability: number
  outcome_split: {
    early: number
    maturity: number
    loss: number
  }
  early_redemption_by_step: { month: number; prob: number }[]
  return_distribution: {
    bins: number[]
    counts: number[]
  }
  principal: number                 // 원 단위
  expected_return_amount: number    // 원 단위
  meta: {
    num_paths: number
    compute_ms: number
    data_asof: string
  }
}

// ── /explain ─────────────────────────────────────────────────────
export interface ExplainData {
  summary_line: string
  explanation: string
  cautions: string[]
  disclaimer: string
}
