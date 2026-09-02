/**
 * 더미 API — 백엔드 연결 전까지 사용.
 * 실제 연결 시 이 파일의 함수들을 fetch 호출로 교체.
 *
 * 단위 규칙: 이 파일 내부 계산은 % 스케일(0~100),
 * 반환 시 API 스펙(0~1 소수)으로 변환.
 */

import type {
  ApiResponse,
  ElsTerms,
  UserProfile,
  PresetsData,
  ExtractData,
  DiagnoseData,
  ExplainData,
} from './types'

// ── 프리셋 기본값 (내부, % 스케일) ──────────────────────────────────
interface PresetBase {
  id: string
  label: string
  one_line: string
  loss: number    // %
  exp: number     // % 연환산
  cvar: number    // % (음수)
  early: number   // %
  coupon: number  // % 연
  els_terms: ElsTerms
}

const PRESETS: PresetBase[] = [
  {
    id: 'low',
    label: '저위험',
    one_line: '선진지수 2개 · 낙인 없는 완만한 스텝다운',
    loss: 2.4, exp: 4.1, cvar: -19, early: 88, coupon: 5.2,
    els_terms: {
      underlyings: ['S&P500', 'EuroStoxx50'],
      coupon_annual: 0.052,
      maturity_months: 36,
      check_interval_months: 6,
      step_down_barriers: [0.95, 0.95, 0.90, 0.90, 0.85, 0.80],
      knock_in: null,
      principal: 10_000_000,
    },
  },
  {
    id: 'mid',
    label: '중위험',
    one_line: '가장 흔한 지수형 구조',
    loss: 12.0, exp: 5.8, cvar: -41, early: 70, coupon: 8.0,
    els_terms: {
      underlyings: ['S&P500', 'KOSPI200'],
      coupon_annual: 0.08,
      maturity_months: 36,
      check_interval_months: 6,
      step_down_barriers: [0.90, 0.90, 0.85, 0.85, 0.80, 0.75],
      knock_in: 0.50,
      principal: 10_000_000,
    },
  },
  {
    id: 'high',
    label: '고위험 (2021 H지수 재현)',
    one_line: '홍콩 H지수 ELS 재현 · 낙인 45%',
    loss: 24.8, exp: 6.9, cvar: -54, early: 58, coupon: 12.4,
    els_terms: {
      underlyings: ['홍콩 H지수', 'KOSPI200'],
      coupon_annual: 0.124,
      maturity_months: 36,
      check_interval_months: 6,
      step_down_barriers: [0.90, 0.90, 0.85, 0.80, 0.75, 0.65],
      knock_in: 0.45,
      principal: 10_000_000,
    },
  },
]

// ── 내부 계산 헬퍼 ───────────────────────────────────────────────────
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function round1(v: number) {
  return Math.round(v * 10) / 10
}

function gradeFromLoss(loss: number): string {
  if (loss < 5)  return '저위험'
  if (loss < 15) return '중위험'
  return '고위험'
}

/** els_terms에서 가장 가까운 프리셋 반환 */
function matchPreset(terms: ElsTerms): PresetBase {
  return (
    PRESETS.find(p => Math.abs(p.els_terms.coupon_annual - terms.coupon_annual) < 0.015) ??
    PRESETS[1]
  )
}

/** volatility_scale(k)을 적용한 수치 계산. README 의사코드 기반. */
function compute(p: PresetBase, k: number) {
  const loss  = round1(clamp(p.loss * k, 0.2, 78))
  const exp   = round1(Math.min(p.exp - (loss - p.loss) * 0.42, p.coupon * 0.92))
  const cvar  = round1(p.cvar * (k <= 0.5 ? 0.68 : k >= 1.5 ? 1.42 : 1.0))
  const early = round1(clamp(p.early - (loss - p.loss) * 1.15, 4, 96))
  const mat   = round1(clamp(100 - early - loss, 0, 100))
  return { loss, exp, cvar, early, mat }
}

/** 히스토그램 분포 (6구간 → bins/counts) */
function buildDistribution(loss: number, early: number, mat: number) {
  const N = 100_000
  const raw = [
    loss * 0.28,
    loss * 0.42,
    loss * 0.30,
    mat * 0.45 + early * 0.18,
    mat * 0.55 + early * 0.55,
    early * 0.27,
  ]
  const counts = raw.map(v => Math.round(v / 100 * N))
  return {
    bins:   [-1.0, -0.5, -0.25, 0.0, 0.10, 0.25, 1.0],
    counts,
  }
}

/** 조기상환 시점별 확률 */
function buildEarlyByStep(early: number, mat: number) {
  const weights = [0.56, 0.20, 0.11, 0.08, 0.05]
  const steps = [6, 12, 18, 24, 30].map((month, i) => ({
    month,
    prob: round1(early * weights[i]) / 100,
  }))
  steps.push({ month: 36, prob: round1(mat) / 100 })
  return steps
}

// ── 더미 API 함수 ────────────────────────────────────────────────────

/** GET /api/presets */
export async function fetchPresets(): Promise<ApiResponse<PresetsData>> {
  await delay(80)
  return {
    ok: true,
    data: {
      presets: PRESETS.map(p => ({
        id: p.id,
        label: p.label,
        one_line: p.one_line,
        expected_grade: gradeFromLoss(p.loss),
        els_terms: p.els_terms,
      })),
    },
  }
}

/** POST /api/extract */
export async function fetchExtract(_file: File): Promise<ApiResponse<ExtractData>> {
  await delay(3000)
  return {
    ok: true,
    data: {
      els_terms: PRESETS[1].els_terms,
      confidence: {
        underlyings: 0.85,
        coupon_annual: 0.99,
        maturity_months: 0.99,
        step_down_barriers: 0.91,
        knock_in: 0.95,
      },
      warnings: ['더미 추출 결과입니다. 실제 PDF 분석은 백엔드 연결 후 동작합니다.'],
    },
  }
}

/** POST /api/diagnose */
export async function fetchDiagnose(
  els_terms: ElsTerms,
  overrides?: { volatility_scale?: number },
  num_paths = 100_000,
): Promise<ApiResponse<DiagnoseData>> {
  await delay(200)

  const k = overrides?.volatility_scale ?? 1.0
  const preset = matchPreset(els_terms)
  const { loss, exp, cvar, early, mat } = compute(preset, k)
  const principal = els_terms.principal ?? 10_000_000

  return {
    ok: true,
    data: {
      loss_probability: loss / 100,
      grade: gradeFromLoss(loss),
      expected_return: exp / 100,
      promised_coupon_annual: els_terms.coupon_annual,
      cvar_95: cvar / 100,
      early_redemption_probability: early / 100,
      outcome_split: {
        early: early / 100,
        maturity: mat / 100,
        loss: loss / 100,
      },
      early_redemption_by_step: buildEarlyByStep(early, mat),
      return_distribution: buildDistribution(loss, early, mat),
      principal,
      expected_return_amount: Math.round(principal * (exp / 100)),
      meta: {
        num_paths,
        compute_ms: 120,
        data_asof: '2026-08-01',
      },
    },
  }
}

/** POST /api/explain */
export async function fetchExplain(
  els_terms: ElsTerms,
  diagnosis: DiagnoseData,
  user_profile?: UserProfile,
): Promise<ApiResponse<ExplainData>> {
  await delay(2000)

  const loss   = (diagnosis.loss_probability * 100).toFixed(1)
  const exp    = (diagnosis.expected_return * 100).toFixed(1)
  const coupon = (els_terms.coupon_annual * 100).toFixed(1)
  const cvar   = Math.abs(diagnosis.cvar_95 * 100).toFixed(0)
  const ki     = els_terms.knock_in ? `${(els_terms.knock_in * 100).toFixed(0)}%` : '없음'

  const riskSentence = (() => {
    if (user_profile?.risk_appetite === 'conservative')
      return '안정추구 성향에서는 이 확률이 감내 범위를 넘어설 수 있습니다.'
    if (user_profile?.risk_appetite === 'aggressive')
      return '공격형 성향이라면 감내할 수 있는 범위일 수 있으나, 손실 구간의 깊이는 별도로 봐야 합니다.'
    return '성향 정보를 반영하지 않은 표준 해설입니다.'
  })()

  const ageSentence = (() => {
    if (user_profile?.age_band === '60s_plus')
      return '은퇴자금 성격의 자금이라면 손실 발생 시 회복 기간이 길다는 점이 특히 중요합니다.'
    if (user_profile?.age_band === '20_30s')
      return '투자 기간을 길게 볼 수 있다면 손실 구간을 버틸 여지는 있지만, ELS는 만기가 정해져 있어 버티는 전략이 통하지 않습니다.'
    return '자금 사용 시점이 만기 3년 이내라면 조기상환 실패 시 자금이 묶일 수 있습니다.'
  })()

  return {
    ok: true,
    data: {
      summary_line: `이 상품은 원금손실 확률이 약 ${loss}%로 계산됐습니다.`,
      explanation: [
        `이 상품은 원금손실 확률이 ${loss}%로 계산됐습니다. 반대로 말하면 ${(100 - parseFloat(loss)).toFixed(1)}%의 경로에서는 약속된 쿠폰을 받고 끝납니다. 문제는 손실이 나는 쪽의 크기입니다 — 손실 경로 중 나쁜 5%의 평균 손실률이 ${cvar}%로, 원금의 절반 가까이가 사라지는 결말이 실제로 존재합니다.`,
        `광고에 적힌 연 ${coupon}%는 조건이 지켜질 때만 받는 최대 수익입니다. 손실 시나리오를 포함하면 확률가중 기대수익은 연 ${exp}%로 내려갑니다. 낙인선 ${ki}는 기초자산이 그 수준까지 떨어지면 원금 보호 장치가 사라진다는 뜻이며, 한 번 닿으면 되돌릴 수 없습니다.`,
        `${riskSentence} ${ageSentence} 기초자산 두 개 중 더 약한 쪽이 손실을 결정하므로, 두 지수 중 하나라도 크게 빠질 가능성을 따로 확인하는 것이 좋습니다.`,
      ].join('\n\n'),
      cautions: [
        `광고 쿠폰(연 ${coupon}%)과 실제 기대수익(약 ${exp}%)의 차이가 큽니다.`,
        `손실 시나리오에서는 원금의 ${cvar}% 이상을 잃을 수 있습니다.`,
      ],
      disclaimer: '본 해설은 투자권유가 아니라 정보 제공입니다. 위 해설의 모든 수치는 시뮬레이션 엔진이 확정한 값이며, AI는 해설만 담당합니다.',
    },
  }
}

// ── 내부 유틸 ────────────────────────────────────────────────────────
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
