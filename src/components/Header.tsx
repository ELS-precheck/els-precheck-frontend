import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
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
  const [toast, setToast] = useState(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }, [])

  const handleStep = (path: string) => {
    if (path === '/result' && pathname !== '/result') {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      setToast(true)
      toastTimerRef.current = setTimeout(() => {
        setToast(false)
        navigate('/input')
        window.scrollTo(0, 0)
      }, 1500)
      return
    }
    navigate(path)
    window.scrollTo(0, 0)
  }

  return (
    <header className={styles.header}>
      {toast && (
        <div className={styles.toast} role="status" aria-live="polite" aria-atomic="true">
          상품을 먼저 입력해 주세요.
        </div>
      )}
      <div className={styles.inner}>
        <Link to="/" className={styles.wordmark} onClick={() => window.scrollTo(0, 0)}>
          <img src={logoUrl} width={28} height={28} alt="" />
          <span className={styles.wordmarkText}>ELS Precheck</span>
        </Link>

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

      </div>
    </header>
  )
}
