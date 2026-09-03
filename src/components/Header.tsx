import { useNavigate, useLocation } from 'react-router-dom'
import styles from './Header.module.css'
import logoUrl from '../assets/els-precheck-mark.svg'

const STEPS = [
  { label: '소개', number: '01', path: '/' },
  { label: '상품 입력', number: '02', path: '/input' },
  { label: '진단 결과', number: '03', path: '/result' },
]

export default function Header() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const handleStep = (path: string) => {
    navigate(path)
    window.scrollTo(0, 0)
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.wordmark}>
          <img src={logoUrl} width={28} height={28} alt="" />
          <span className={styles.wordmarkText}>ELS Precheck</span>
        </div>

        <nav className={styles.nav}>
          {STEPS.map(({ label, number, path }) => (
            <button
              key={path}
              className={`${styles.step} ${pathname === path ? styles.active : ''}`}
              onClick={() => handleStep(path)}
            >
              <span className={styles.number}>{number}</span>
              {label}
            </button>
          ))}
        </nav>

        <span className={styles.disclaimer}>투자권유 아님 · 정보 해설</span>
      </div>
    </header>
  )
}
