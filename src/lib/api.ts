import type {
  ApiResponse,
  ElsTerms,
  UserProfile,
  PresetsData,
  ExtractData,
  DiagnoseData,
  ExplainData,
} from './types'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

const RETRYABLE_CODES = new Set(['NETWORK_ERROR', 'TIMEOUT', 'INTERNAL', 'RATE_LIMITED'])

async function request<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = 5_000,
): Promise<ApiResponse<T>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...init,
    })
    const json = await res.json()
    if (!res.ok || !json.ok) {
      return {
        ok: false,
        error: json.error ?? { code: String(res.status), message: '서버 오류가 발생했습니다.', field: null },
      }
    }
    return { ok: true, data: json.data }
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') {
      return { ok: false, error: { code: 'TIMEOUT', message: '요청 시간이 초과됐습니다. 다시 시도해 주세요.', field: null } }
    }
    return { ok: false, error: { code: 'NETWORK_ERROR', message: '네트워크 오류가 발생했습니다.', field: null } }
  } finally {
    clearTimeout(timer)
  }
}

async function withRetry<T>(
  fn: () => Promise<ApiResponse<T>>,
  retries: number,
): Promise<ApiResponse<T>> {
  const res = await fn()
  if (!res.ok && retries > 0 && RETRYABLE_CODES.has(res.error.code)) {
    if (res.error.code === 'RATE_LIMITED') await new Promise<void>(r => setTimeout(r, 2_000))
    return withRetry(fn, retries - 1)
  }
  return res
}

// GET /api/presets — 타임아웃 5s, 1회 재시도
export async function fetchPresets(): Promise<ApiResponse<PresetsData>> {
  return withRetry(() => request('/api/presets'), 1)
}

// POST /api/extract — 타임아웃 30s, 재시도 없음
export async function fetchExtract(file: File): Promise<ApiResponse<ExtractData>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  try {
    const body = new FormData()
    body.append('file', file)
    const res = await fetch(`${BASE_URL}/api/extract`, { method: 'POST', body, signal: controller.signal })
    const json = await res.json()
    if (!res.ok || !json.ok) {
      return {
        ok: false,
        error: json.error ?? { code: String(res.status), message: '추출 중 오류가 발생했습니다.', field: null },
      }
    }
    return { ok: true, data: json.data }
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') {
      return { ok: false, error: { code: 'TIMEOUT', message: '요청 시간이 초과됐습니다.', field: null } }
    }
    return { ok: false, error: { code: 'NETWORK_ERROR', message: '네트워크 오류가 발생했습니다.', field: null } }
  } finally {
    clearTimeout(timer)
  }
}

// POST /api/diagnose — 타임아웃 10s, 재시도 없음
export async function fetchDiagnose(
  els_terms: ElsTerms,
  overrides?: { volatility_scale?: number },
  num_paths = 100_000,
): Promise<ApiResponse<DiagnoseData>> {
  return request('/api/diagnose', {
    method: 'POST',
    body: JSON.stringify({ els_terms, overrides, num_paths }),
  }, 10_000)
}

// POST /api/explain — 타임아웃 30s, 1회 재시도
export async function fetchExplain(
  els_terms: ElsTerms,
  diagnosis: DiagnoseData,
  user_profile?: UserProfile,
): Promise<ApiResponse<ExplainData>> {
  return withRetry(
    () => request('/api/explain', {
      method: 'POST',
      body: JSON.stringify({ els_terms, diagnosis, user_profile }),
    }, 30_000),
    1,
  )
}
