import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchPresets, fetchExtract } from '../lib/dummy-api'
import type { Preset, ElsTerms, UserProfile } from '../lib/types'
import styles from './Input.module.css'

type Tab = 'preset' | 'upload' | 'direct'

interface ExtractForm {
  underlyings: string
  coupon: string
  maturity: string
  barriers: string
  knockIn: string
}

interface DirectForm {
  underlyings: string
  coupon: string
  maturity: string
  interval: string
  barriers: string
  knockIn: string
}

const EXTRACT_FIELDS: { key: keyof ExtractForm; label: string }[] = [
  { key: 'underlyings', label: '기초자산' },
  { key: 'coupon',      label: '쿠폰 (%)' },
  { key: 'maturity',    label: '만기 (개월)' },
  { key: 'barriers',    label: '배리어 (%)' },
  { key: 'knockIn',     label: '낙인선 (%)' },
]

const DIRECT_FIELDS: { key: keyof DirectForm; label: string; placeholder: string }[] = [
  { key: 'underlyings', label: '기초자산',               placeholder: 'S&P500, KOSPI200' },
  { key: 'coupon',      label: '쿠폰 (연 %)',            placeholder: '8.0' },
  { key: 'maturity',    label: '만기 (개월)',             placeholder: '36' },
  { key: 'interval',    label: '조기상환 주기 (개월)',    placeholder: '6' },
  { key: 'barriers',    label: '배리어 스케줄 (%)',       placeholder: '90, 90, 85, 85, 80, 75' },
  { key: 'knockIn',     label: '낙인선 (%, 없으면 빈 칸)', placeholder: '50' },
]

const AGE_BANDS: { value: NonNullable<UserProfile['age_band']>; label: string }[] = [
  { value: '20_30s',   label: '20~30대' },
  { value: '40_50s',   label: '40~50대' },
  { value: '60s_plus', label: '60대 이상' },
]

const RISK_APPETITES: { value: NonNullable<UserProfile['risk_appetite']>; label: string }[] = [
  { value: 'conservative', label: '안정추구' },
  { value: 'neutral',      label: '중립' },
  { value: 'aggressive',   label: '공격형' },
]

function termsToExtractForm(t: ElsTerms): ExtractForm {
  return {
    underlyings: t.underlyings.join(', '),
    coupon:      (t.coupon_annual * 100).toFixed(1),
    maturity:    String(t.maturity_months),
    barriers:    t.step_down_barriers.map(b => Math.round(b * 100)).join('/'),
    knockIn:     t.knock_in != null ? String(Math.round(t.knock_in * 100)) : '',
  }
}

function parseExtractForm(form: ExtractForm, interval: number): ElsTerms | null {
  try {
    const underlyings        = form.underlyings.split(',').map(s => s.trim()).filter(Boolean)
    const coupon_annual      = parseFloat(form.coupon) / 100
    const maturity_months    = parseInt(form.maturity)
    const step_down_barriers = form.barriers.split('/').map(s => parseFloat(s.trim()) / 100)
    const knock_in           = form.knockIn.trim() === '' ? null : parseFloat(form.knockIn) / 100
    if (!underlyings.length || isNaN(coupon_annual) || isNaN(maturity_months)) return null
    if (!step_down_barriers.length || step_down_barriers.some(isNaN)) return null
    if (knock_in !== null && isNaN(knock_in)) return null
    return { underlyings, coupon_annual, maturity_months, check_interval_months: interval, step_down_barriers, knock_in }
  } catch {
    return null
  }
}

function parseDirectForm(form: DirectForm): ElsTerms | null {
  try {
    const underlyings           = form.underlyings.split(',').map(s => s.trim()).filter(Boolean)
    const coupon_annual         = parseFloat(form.coupon) / 100
    const maturity_months       = parseInt(form.maturity)
    const check_interval_months = parseInt(form.interval) || 6
    const step_down_barriers    = form.barriers.split(',').map(s => parseFloat(s.trim()) / 100)
    const knock_in              = form.knockIn.trim() === '' ? null : parseFloat(form.knockIn) / 100
    if (!underlyings.length || isNaN(coupon_annual) || isNaN(maturity_months)) return null
    if (!step_down_barriers.length || step_down_barriers.some(isNaN)) return null
    if (knock_in !== null && isNaN(knock_in)) return null
    return { underlyings, coupon_annual, maturity_months, check_interval_months, step_down_barriers, knock_in }
  } catch {
    return null
  }
}

export default function Input() {
  const navigate     = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeTab,        setActiveTab]        = useState<Tab>('preset')
  const [presets,          setPresets]          = useState<Preset[]>([])
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)

  const [extractStatus,   setExtractStatus]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [extractForm,     setExtractForm]     = useState<ExtractForm>({ underlyings: '', coupon: '', maturity: '', barriers: '', knockIn: '' })
  const [extractInterval, setExtractInterval] = useState(6)
  const [extractWarnings, setExtractWarnings] = useState<string[]>([])
  const [uploadError,     setUploadError]     = useState<string | null>(null)
  const [extractError,    setExtractError]    = useState<string | null>(null)
  const [isDragging,      setIsDragging]      = useState(false)

  const [directForm,  setDirectForm]  = useState<DirectForm>({ underlyings: '', coupon: '', maturity: '', interval: '', barriers: '', knockIn: '' })
  const [directError, setDirectError] = useState<string | null>(null)

  const [ageBand,      setAgeBand]      = useState<UserProfile['age_band']>(null)
  const [riskAppetite, setRiskAppetite] = useState<UserProfile['risk_appetite']>(null)
  const [amount,       setAmount]       = useState('')

  useEffect(() => {
    fetchPresets().then(res => { if (res.ok) setPresets(res.data.presets) })
  }, [])

  const handleFileSelect = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setUploadError('PDF 파일만 업로드할 수 있어요.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('10MB 이하 PDF만 올릴 수 있어요.')
      return
    }
    setUploadError(null)
    setExtractStatus('loading')
    const res = await fetchExtract(file)
    if (res.ok) {
      setExtractForm(termsToExtractForm(res.data.els_terms))
      setExtractInterval(res.data.els_terms.check_interval_months)
      setExtractWarnings(res.data.warnings)
      setExtractStatus('done')
    } else {
      setExtractStatus('error')
      setUploadError(res.error.message)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const toDiagnose = (elsTerms: ElsTerms) => {
    const userProfile: UserProfile = { age_band: ageBand, risk_appetite: riskAppetite }
    const raw       = parseFloat(amount)
    const principal = amount.trim() && !isNaN(raw) && raw > 0 ? Math.round(raw * 10000) : undefined
    navigate('/result', {
      state: { elsTerms: principal ? { ...elsTerms, principal } : elsTerms, userProfile },
    })
  }

  const handleDirectDiagnose = () => {
    const { underlyings, coupon, maturity, barriers } = directForm
    if (!underlyings.trim() || !coupon.trim() || !maturity.trim() || !barriers.trim()) {
      setDirectError('기초자산, 쿠폰, 만기, 배리어는 필수 항목입니다.')
      return
    }
    const terms = parseDirectForm(directForm)
    if (!terms) {
      setDirectError('입력 형식을 확인해 주세요.')
      return
    }
    setDirectError(null)
    toDiagnose(terms)
  }

  const handleExtractDiagnose = () => {
    const { underlyings, coupon, maturity } = extractForm
    if (!underlyings.trim() || !coupon.trim() || !maturity.trim()) {
      setExtractError('기초자산, 쿠폰, 만기는 필수 항목입니다.')
      return
    }
    const terms = parseExtractForm(extractForm, extractInterval)
    if (!terms) {
      setExtractError('입력 형식을 확인해 주세요.')
      return
    }
    setExtractError(null)
    toDiagnose(terms)
  }

  return (
    <main className={styles.page}>
      <div className="container">

        {/* 페이지 헤더 */}
        <div className={styles.pageHeader}>
          <p className={styles.pageOverline}>STEP 02 · 상품 조건</p>
          <h2 className={styles.pageTitle}>진단할 상품을 고르세요.</h2>
          <p className={styles.pageSub}>
            대표 구조 3개 중 선택하거나, 상품설명서 PDF를 올리거나, 조건을 직접 입력하세요.
          </p>
        </div>

        {/* 탭 */}
        <div className={styles.tabs}>
          {(['preset', 'upload', 'direct'] as Tab[]).map(tab => (
            <button
              key={tab}
              className={`${styles.tabItem} ${activeTab === tab ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'preset' ? '프리셋' : tab === 'upload' ? 'PDF 업로드' : '직접 입력'}
            </button>
          ))}
        </div>

        {/* 프리셋 탭 */}
        {activeTab === 'preset' && (
          <div className={styles.presetGrid}>
            {presets.map(preset => {
              const isSelected = selectedPresetId === preset.id
              const isHigh     = preset.expected_grade === '고위험'
              return (
                <div
                  key={preset.id}
                  className={`${styles.presetCard} ${isSelected ? styles.presetCardSelected : ''}`}
                  onClick={() => setSelectedPresetId(preset.id)}
                >
                  <div className={styles.presetCardHeader}>
                    <span className={`${styles.gradeBadge} ${isHigh ? styles.gradeBadgeHigh : styles.gradeBadgeNormal}`}>
                      {preset.expected_grade}
                    </span>
                    <span className={styles.presetMaturity}>
                      {preset.els_terms.maturity_months / 12}년
                    </span>
                  </div>
                  <p className={styles.presetName}>{preset.label}</p>
                  <p className={styles.presetOneLine}>{preset.one_line}</p>
                  <div className={styles.presetCouponWrap}>
                    <div className={styles.presetCoupon}>
                      {(preset.els_terms.coupon_annual * 100).toFixed(1)}
                      <span className={styles.presetCouponSuffix}>%</span>
                    </div>
                    <span className={styles.presetCouponLabel}>약속 쿠폰 (연)</span>
                  </div>
                  <div className={styles.presetTerms}>
                    <div className={styles.presetTermRow}>
                      <span className={styles.presetTermLabel}>기초자산</span>
                      <span className={styles.presetTermValue}>
                        {preset.els_terms.underlyings.join(' + ')}
                      </span>
                    </div>
                    <div className={styles.presetTermRow}>
                      <span className={styles.presetTermLabel}>배리어</span>
                      <span className={styles.presetTermValue}>
                        {preset.els_terms.step_down_barriers.map(b => Math.round(b * 100)).join('/')}%
                      </span>
                    </div>
                    <div className={styles.presetTermRow}>
                      <span className={styles.presetTermLabel}>낙인선</span>
                      <span className={styles.presetTermValue}>
                        {preset.els_terms.knock_in != null
                          ? `${Math.round(preset.els_terms.knock_in * 100)}%`
                          : '없음'}
                      </span>
                    </div>
                  </div>
                  <button
                    className={styles.btnPrimary}
                    onClick={e => { e.stopPropagation(); toDiagnose(preset.els_terms) }}
                  >
                    진단하기
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* PDF 업로드 탭 */}
        {activeTab === 'upload' && (
          <div className={styles.uploadGrid}>
            <div>
              <div
                className={`${styles.uploadZone} ${isDragging ? styles.uploadZoneDragging : ''}`}
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                {extractStatus === 'loading' ? (
                  <p className={styles.uploadLoading}>Claude가 조건을 읽는 중입니다...</p>
                ) : (
                  <>
                    <p className={styles.uploadTitle}>상품설명서 PDF를 여기에</p>
                    <p className={styles.uploadDesc}>
                      Claude가 배리어·낙인·쿠폰·만기·기초자산을 읽어 자동으로 채웁니다.<br />
                      PDF만 지원하며 문서는 저장하지 않습니다.
                    </p>
                    <button className={styles.btnUpload} onClick={() => fileInputRef.current?.click()}>
                      파일 선택
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = '' }}
                    />
                  </>
                )}
              </div>
              {uploadError && <p className={styles.errorMsg}>{uploadError}</p>}
              {extractWarnings.length > 0 && (
                <div className={styles.extractWarnings}>
                  {extractWarnings.map((w, i) => <p key={i} className={styles.extractWarning}>{w}</p>)}
                </div>
              )}
            </div>

            <div className={styles.extractPanel}>
              <div className={styles.extractPanelHeader}>
                <span className={styles.extractPanelTitle}>추출 결과 확인 및 수정</span>
                <span className={`${styles.extractStatusTag} ${extractStatus === 'done' ? styles.extractStatusTagDone : ''}`}>
                  {extractStatus === 'idle'    && '대기 중'}
                  {extractStatus === 'loading' && '추출 중...'}
                  {extractStatus === 'done'    && 'Claude 추출 완료, 확인 필요'}
                  {extractStatus === 'error'   && '추출 실패'}
                </span>
              </div>
              {EXTRACT_FIELDS.map(field => (
                <div key={field.key} className={styles.extractRow}>
                  <span className={styles.extractRowLabel}>{field.label}</span>
                  <input
                    className={styles.extractRowInput}
                    value={extractForm[field.key]}
                    disabled={extractStatus !== 'done'}
                    placeholder={extractStatus === 'idle' ? '—' : ''}
                    onChange={e => setExtractForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className={styles.extractPanelFooter}>
                <p className={styles.extractFooterNote}>
                  AI 추출 결과를 확인하고 틀린 항목은 직접 수정해 주세요.
                </p>
                {extractError && <p className={styles.errorMsg}>{extractError}</p>}
                <button
                  className={styles.btnPrimary}
                  disabled={extractStatus !== 'done'}
                  onClick={handleExtractDiagnose}
                >
                  진단하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 직접 입력 탭 */}
        {activeTab === 'direct' && (
          <div className={styles.directPanel}>
            <div className={styles.directGrid}>
              {DIRECT_FIELDS.map(field => (
                <label key={field.key} className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>{field.label}</span>
                  <input
                    className={styles.fieldInput}
                    value={directForm[field.key]}
                    placeholder={field.placeholder}
                    onChange={e => {
                      setDirectError(null)
                      setDirectForm(prev => ({ ...prev, [field.key]: e.target.value }))
                    }}
                  />
                </label>
              ))}
            </div>
            {directError && <p className={styles.errorMsg}>{directError}</p>}
            <button className={styles.btnPrimary} onClick={handleDirectDiagnose}>
              진단하기
            </button>
          </div>
        )}

        {/* 사용자 정보 */}
        <div className={styles.profileSection}>
          <div className={styles.profileHeader}>
            <span className={styles.pageOverline}>맞춤 해설용 (선택)</span>
            <span className={styles.profileNote}>모두 선택하지 않아도 진단은 진행됩니다. 단, 표준 해설이 적용됩니다.</span>
          </div>
          <div className={styles.profileGrid}>
            <div>
              <p className={styles.profileGroupLabel}>연령대</p>
              <div className={styles.chipGroup}>
                {AGE_BANDS.map(({ value, label }) => (
                  <button
                    key={value}
                    className={`${styles.chip} ${ageBand === value ? styles.chipActive : ''}`}
                    onClick={() => setAgeBand(prev => prev === value ? null : value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className={styles.profileGroupLabel}>투자 성향</p>
              <div className={styles.chipGroup}>
                {RISK_APPETITES.map(({ value, label }) => (
                  <button
                    key={value}
                    className={`${styles.chip} ${riskAppetite === value ? styles.chipActive : ''}`}
                    onClick={() => setRiskAppetite(prev => prev === value ? null : value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className={styles.profileGroupLabel}>투자 금액 (만원)</p>
              <input
                type="number"
                min="0"
                className={styles.fieldInput}
                value={amount}
                placeholder="1000"
                onChange={e => setAmount(e.target.value)}
              />
              <p className={styles.amountNote}>손익을 실제 금액으로 환산해 보여줍니다.</p>
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
