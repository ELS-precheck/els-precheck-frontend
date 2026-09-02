import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReveal } from '../hooks/useReveal'
import styles from './Landing.module.css'

// 중위험 × 보통 국면 더미값
const SAMPLE = {
  loss: 12,
  early: 70,
  mat: 18,
}

const STEPS = [
  {
    num: '01',
    title: '상품 선택',
    desc: '대표 구조 3개 중 선택, 또는 상품설명서 PDF를 올리면 AI가 조건을 읽어 채웁니다.',
  },
  {
    num: '02',
    title: 'AI 진단',
    desc: '몬테카를로 10만 경로로 스텝다운·낙인 판정을 돌려 손실확률과 기대수익을 계산합니다.',
  },
  {
    num: '03',
    title: '쉽게 해설',
    desc: '확정된 수치를 연령·성향·금액에 맞춰 AI가 사람 말로 풀어 설명합니다.',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const stepsRef = useRef<HTMLDivElement>(null)
  const revealRef = useReveal()

  const handleStart = () => navigate('/input')

  const handleAbout = () => {
    if (stepsRef.current) {
      window.scrollTo({ top: stepsRef.current.offsetTop - 80, behavior: 'smooth' })
    }
  }

  return (
    <main ref={revealRef as React.RefObject<HTMLElement>}>
      {/* 히어로 */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroGrid}>
            <div>
              <div className={styles.heroBadge}>
                <span className={styles.heroBadgeDot} />
                금융소비자 보호형 진단
              </div>
              <h1 className={styles.heroH1}>
                ELS, 수익만큼<br />
                위험도 <em>숫자로 보고</em> 결정하세요.
              </h1>
              <p className={styles.heroLead}>
                몬테카를로 10만 경로 시뮬레이션으로 원금손실 확률을 계산하고,
                상품설명서에 묻혀 있던 조건을 AI가 눈높이에 맞춰 해설합니다.
              </p>
              <div className={styles.heroButtons}>
                <button className={styles.btnPrimary} onClick={handleStart}>
                  내 ELS 진단하기
                </button>
                <button className={styles.btnSecondary} onClick={handleAbout}>
                  어떤 서비스인가요?
                </button>
              </div>
            </div>

            {/* 샘플 리포트 카드 */}
            <div className={styles.sampleCard}>
              <div className={styles.sampleCardHeader}>
                <span className={styles.overline}>SAMPLE REPORT</span>
                <span className={styles.overline}>10만 경로</span>
              </div>
              <p className={styles.sampleCardSub}>S&P500 + 코스피200 · 연 8% · 3년</p>
              <div className={styles.sampleLoss}>
                {SAMPLE.loss}<span className={styles.sampleLossSuffix}>%</span>
              </div>
              <p className={styles.sampleLossLabel}>원금손실 확률 / 위험 등급 높음</p>
              <div className={styles.stackBar}>
                <div className={styles.stackBarEarly} style={{ width: `${SAMPLE.early}%` }} />
                <div className={styles.stackBarMat} style={{ width: `${SAMPLE.mat}%` }} />
                <div className={styles.stackBarLoss} style={{ width: `${SAMPLE.loss}%` }} />
              </div>
              <div className={styles.sampleLabels}>
                <span className={styles.sampleLabel}>조기상환 {SAMPLE.early}%</span>
                <span className={styles.sampleLabel}>만기상환 {SAMPLE.mat}%</span>
                <span className={styles.sampleLabel}>원금손실 {SAMPLE.loss}%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 맥락 배너 */}
      <section className={styles.contextBanner}>
        <div className="container">
          <p className={styles.contextLead} data-reveal>
            ELS는 조건이 지켜지면 예금보다 높은 수익을 줍니다.
            다만 <strong>그 조건이 깨질 확률</strong>은 계약서에 잘 드러나지 않죠.
          </p>
          <div className={styles.contextStats} data-reveal data-reveal-delay="90">
            <div className={styles.contextStatLeft}>
              <span className={styles.contextStatLabel}>위험은 실제로 터진 적 있다</span>
              <div className={styles.contextStatNum}>
                약 1<span className={styles.contextStatNumSuffix}>조원</span>
              </div>
              <p className={styles.contextStatTag}>손실 확정</p>
              <p className={styles.contextStatDesc}>
                2024년 초 홍콩 H지수 ELS에서 손실률이 50%대까지 올랐습니다.
              </p>
            </div>
            <div>
              <span className={styles.contextStatLabel}>지금도 남 얘기가 아니다</span>
              <div className={styles.contextStatNum}>
                27.8<span className={styles.contextStatNumSuffix}>조원</span>
              </div>
              <p className={styles.contextStatTag}>2026 상반기 발행 (ELS+ELB)</p>
              <p className={styles.contextStatDesc}>
                이 중 지수형 ELS가 12.4조원(44.7%)으로, 여전히 대규모로 유통되는 구조입니다.
              </p>
            </div>
          </div>
          <p className={styles.contextClosing} data-reveal data-reveal-delay="180">
            상품이 나쁜 게 아니라,{' '}
            <span className={styles.contextClosingWarn}>위험을 모르고 사는 것</span>
            이 문제입니다.
          </p>
        </div>
      </section>

      {/* 3단계 + 면책 */}
      <section className={styles.steps} ref={stepsRef}>
        <div className="container">
          <p className={styles.stepsTitle} data-reveal>
            3단계로 끝납니다
          </p>
          <div className={styles.stepsGrid}>
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                className={styles.stepCell}
                data-reveal
                data-reveal-delay={String(i * 90)}
              >
                <div className={styles.stepNum}>{step.num}</div>
                <div className={styles.stepTitle}>{step.title}</div>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
          <div className={styles.disclaimer} data-reveal data-reveal-delay="360">
            본 서비스는 투자권유가 아니라 정보 해설입니다. 시뮬레이션 결과는 과거 데이터에 기반한
            추정치이며 실제 손익을 보장하지 않습니다. 업로드한 상품설명서는 저장하지 않고 세션에서만
            처리합니다.
          </div>
        </div>
      </section>
    </main>
  )
}
