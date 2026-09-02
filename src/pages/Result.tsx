import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { fetchDiagnose, fetchExplain } from '../lib/dummy-api'
import type { ElsTerms, UserProfile, DiagnoseData, ExplainData } from '../lib/types'
import styles from './Result.module.css'
import TermTip from '../components/TermTip'

type VolatilityLevel = 'calm' | 'normal' | 'crisis'

const VOLATILITY_SCALE: Record<VolatilityLevel, number> = {
  calm:   0.7,
  normal: 1.0,
  crisis: 1.4,
}

const VOLATILITY_LABELS: Record<VolatilityLevel, string> = {
  calm:   '평온',
  normal: '보통',
  crisis: '위기',
}

const VOLATILITY_NOTES: Record<VolatilityLevel, string> = {
  calm:   '과거 저변동 구간 기준',
  normal: '과거 평균 변동성 기준',
  crisis: '금융위기 수준 변동성 기준',
}

function formatKRW(won: number): string {
  if (Math.abs(won) >= 100_000_000) return `${(won / 100_000_000).toFixed(1)}억원`
  return `${Math.round(won / 10_000).toLocaleString()}만원`
}

export default function Result() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { elsTerms: ElsTerms; userProfile: UserProfile } | null

  const [volatility,      setVolatility]      = useState<VolatilityLevel>('normal')
  const [diagnosis,       setDiagnosis]       = useState<DiagnoseData | null>(null)
  const [explain,         setExplain]         = useState<ExplainData | null>(null)
  const [diagnoseLoading, setDiagnoseLoading] = useState(true)
  const [explainLoading,  setExplainLoading]  = useState(false)

  useEffect(() => {
    const st = location.state as { elsTerms: ElsTerms; userProfile: UserProfile } | null
    if (!st) return
    setDiagnoseLoading(true)
    setDiagnosis(null)
    setExplain(null)
    fetchDiagnose(st.elsTerms, { volatility_scale: VOLATILITY_SCALE[volatility] })
      .then(res => { if (res.ok) setDiagnosis(res.data) })
      .finally(() => setDiagnoseLoading(false))
  }, [volatility, location])

  useEffect(() => {
    const st = location.state as { elsTerms: ElsTerms; userProfile: UserProfile } | null
    if (!diagnosis || !st) return
    let cancelled = false
    setExplainLoading(true)
    setExplain(null)
    fetchExplain(st.elsTerms, diagnosis, st.userProfile)
      .then(res => { if (!cancelled && res.ok) setExplain(res.data) })
      .finally(() => { if (!cancelled) setExplainLoading(false) })
    return () => { cancelled = true }
  }, [diagnosis, location])

  if (!state) return <Navigate to="/input" replace />

  const { elsTerms } = state

  const lossPct     = diagnosis ? (diagnosis.loss_probability * 100).toFixed(1) : '—'
  const expectedPct = diagnosis ? (diagnosis.expected_return * 100).toFixed(1) : '—'
  const couponPct   = diagnosis ? (diagnosis.promised_coupon_annual * 100).toFixed(1) : '—'
  const cvarPct     = diagnosis ? Math.abs(diagnosis.cvar_95 * 100).toFixed(0) : '—'
  const earlyPct    = diagnosis ? (diagnosis.early_redemption_probability * 100).toFixed(0) : '—'

  const distData = diagnosis
    ? diagnosis.return_distribution.bins.slice(0, -1).map((bin, i) => ({
        label: `${(bin * 100).toFixed(0)}%`,
        count: diagnosis.return_distribution.counts[i],
        isLoss: bin < 0,
      }))
    : []

  const earlyData = diagnosis
    ? diagnosis.early_redemption_by_step.map(s => ({
        label: `${s.month}개월`,
        prob: parseFloat((s.prob * 100).toFixed(1)),
      }))
    : []

  const grade      = diagnosis?.grade ?? ''
  const isHigh     = grade === '고위험'
  const isMid      = grade === '중위험'

  return (
    <main className={styles.page}>
      <div className="container">

        {/* 헤더 */}
        <div className={styles.pageHeader}>
          <p className={styles.pageOverline}>STEP 03 · 진단 결과</p>
          <div className={styles.headerGrid}>

            {/* 손실확률 */}
            <div>
              {grade && (
                <span className={`${styles.gradeBadge} ${isHigh ? styles.gradeBadgeHigh : isMid ? styles.gradeBadgeMid : styles.gradeBadgeLow}`}>
                  {grade}
                </span>
              )}
              <div className={styles.lossBig}>
                {lossPct}
                <span className={styles.lossSuffix}>%</span>
              </div>
              <p className={styles.lossLabel}>원금손실 확률</p>
              <p className={styles.condSummary}>
                {elsTerms.underlyings.join(' + ')} &middot; 연 {(elsTerms.coupon_annual * 100).toFixed(1)}% &middot; {elsTerms.maturity_months / 12}년
                {elsTerms.knock_in && (
                  <> &middot; <TermTip definition="기초자산이 낙인선 아래로 한 번이라도 떨어지면 만기 시 원금 보호 조건이 사라지는 장치입니다.">낙인</TermTip> {(elsTerms.knock_in * 100).toFixed(0)}%</>
                )}
              </p>
            </div>

            {/* 변동성 선택 */}
            <div className={styles.volatilityBox}>
              <p className={styles.volatilityLabel}>변동성 시나리오</p>
              <div className={styles.volatilityBtns}>
                {(['calm', 'normal', 'crisis'] as VolatilityLevel[]).map(v => (
                  <button
                    key={v}
                    className={`${styles.volatilityBtn} ${volatility === v ? styles.volatilityBtnActive : ''}`}
                    onClick={() => setVolatility(v)}
                    disabled={diagnoseLoading}
                  >
                    {VOLATILITY_LABELS[v]}
                  </button>
                ))}
              </div>
              <p className={styles.volatilityNote}>{VOLATILITY_NOTES[volatility]}</p>
            </div>
          </div>
        </div>

        {/* 핵심 수치 카드 */}
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <p className={styles.metricLabel}>기대수익 (연환산)</p>
            <div className={styles.metricValue}>
              {expectedPct}<span className={styles.metricUnit}>%</span>
            </div>
            <p className={styles.metricNote}>손실 시나리오 포함 평균</p>
          </div>
          <div className={styles.metricCard}>
            <p className={styles.metricLabel}><TermTip definition="Conditional Value at Risk. 최악의 5% 경로에서의 평균 손실률로, 극단적 하락 시 피해 규모를 나타냅니다.">CVaR</TermTip> (하위 5%)</p>
            <div className={`${styles.metricValue} ${styles.metricValueWarn}`}>
              -{cvarPct}<span className={styles.metricUnit}>%</span>
            </div>
            <p className={styles.metricNote}>운 나쁜 경우 평균 손실</p>
          </div>
          <div className={styles.metricCard}>
            <p className={styles.metricLabel}><TermTip definition="만기 전 평가일에 기초자산이 배리어 이상이면 원금과 쿠폰을 돌려받는 구조입니다.">조기상환</TermTip> 확률</p>
            <div className={styles.metricValue}>
              {earlyPct}<span className={styles.metricUnit}>%</span>
            </div>
            <p className={styles.metricNote}>만기 전 상환될 확률</p>
          </div>
        </div>

        {/* 쿠폰 vs 기대수익 */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>광고 쿠폰 vs 실제 기대수익</h3>
          <p className={styles.sectionDesc}>손실 시나리오를 포함하면 기대수익은 낮아집니다.</p>
          <div className={styles.couponCompare}>
            <div className={styles.couponRow}>
              <span className={styles.couponRowLabel}>광고 쿠폰 (연)</span>
              <div className={styles.couponTrack}>
                <div
                  className={styles.couponFill}
                  style={{ width: diagnosis ? `${couponPct}%` : '0%' }}
                />
              </div>
              <span className={styles.couponVal}>{`${couponPct}%`}</span>
            </div>
            <div className={styles.couponRow}>
              <span className={styles.couponRowLabel}>기대수익 (실질)</span>
              <div className={styles.couponTrack}>
                <div
                  className={`${styles.couponFill} ${styles.couponFillExpected}`}
                  style={{ width: diagnosis ? `${Math.max(0, parseFloat(expectedPct))}%` : '0%' }}
                />
              </div>
              <span className={styles.couponVal}>{`${expectedPct}%`}</span>
            </div>
          </div>
        </div>

        {/* 시나리오 분포 */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>시나리오 분포</h3>
          <p className={styles.sectionDesc}>10만 개 경로의 손익 구간별 빈도입니다. 붉은 막대가 손실 구간입니다.</p>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={distData} barCategoryGap="12%" margin={{ top: 24 }}>
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--sub)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distData.map((d, i) => (
                    <Cell key={i} fill={d.isLoss ? '#F0A9A6' : 'var(--track)'} />
                  ))}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: 'var(--sub)' }} formatter={(v: number) => v.toLocaleString()} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 조기상환 시점별 */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>조기상환 시점별 확률</h3>
          <p className={styles.sectionDesc}>각 평가일에 <TermTip definition="조기상환·만기 시 원금 보호를 위해 기초자산이 유지해야 하는 최저 가격 수준입니다.">배리어</TermTip>를 충족해 조기상환될 확률입니다.</p>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={earlyData} barCategoryGap="20%" margin={{ top: 24 }}>
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--sub)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Bar dataKey="prob" fill="var(--ink)" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="prob" position="top" style={{ fontSize: 11, fill: 'var(--sub)' }} formatter={(v: number) => `${v}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 세 결말 비율 */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>세 가지 결말</h3>
          {!diagnosis && <div className={styles.outcomeSkeleton} />}
          {diagnosis && (
            <>
              <div className={styles.outcomeBar}>
                <div className={styles.outcomeEarly} style={{ width: `${diagnosis.outcome_split.early * 100}%` }} />
                <div className={styles.outcomeMat}   style={{ width: `${diagnosis.outcome_split.maturity * 100}%` }} />
                <div className={styles.outcomeLoss}  style={{ width: `${diagnosis.outcome_split.loss * 100}%` }} />
              </div>
              <div className={styles.outcomeLabels}>
                <span className={styles.outcomeLabel}>
                  <span className={`${styles.outcomeDot} ${styles.outcomeDotEarly}`} />
                  조기상환 {(diagnosis.outcome_split.early * 100).toFixed(0)}%
                </span>
                <span className={styles.outcomeLabel}>
                  <span className={`${styles.outcomeDot} ${styles.outcomeDotMat}`} />
                  만기상환 {(diagnosis.outcome_split.maturity * 100).toFixed(0)}%
                </span>
                <span className={styles.outcomeLabel}>
                  <span className={`${styles.outcomeDot} ${styles.outcomeDotLoss}`} />
                  원금손실 {(diagnosis.outcome_split.loss * 100).toFixed(0)}%
                </span>
              </div>
              <p className={styles.principalNote}>
                투자금액 {formatKRW(diagnosis.principal)} 기준 기대수익: {formatKRW(diagnosis.expected_return_amount)}
              </p>
            </>
          )}
        </div>

        {/* AI 해설 */}
        <div className={styles.explainSection}>
          <p className={styles.explainOverline}>AI 위험 해설</p>
          {explainLoading ? (
            <p className={styles.explainLoading}>Claude가 해설을 작성하는 중입니다...</p>
          ) : explain ? (
            <>
              <p className={styles.explainSummary}>{explain.summary_line}</p>
              {explain.explanation.split('\n\n').map((para, i) => (
                <p key={i} className={styles.explainPara}>{para}</p>
              ))}
              {explain.cautions.length > 0 && (
                <div className={styles.cautions}>
                  {explain.cautions.map((c, i) => (
                    <p key={i} className={styles.caution}>{c}</p>
                  ))}
                </div>
              )}
              <p className={styles.disclaimer}>{explain.disclaimer}</p>
            </>
          ) : null}
        </div>

        {/* 하단 버튼 */}
        <div className={styles.footer}>
          <button className={styles.btnPrimary} onClick={() => navigate('/input')}>
            다른 상품 진단하기
          </button>
          <button className={styles.btnSecondary} onClick={() => window.print()}>
            결과 저장 (PDF)
          </button>
        </div>

      </div>
    </main>
  )
}
