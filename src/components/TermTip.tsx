import { useState, useRef, useEffect, useId } from 'react'
import styles from './TermTip.module.css'

interface Props {
  definition: string
  children: React.ReactNode
}

export default function TermTip({ definition, children }: Props) {
  const [visible, setVisible] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const popupRef = useRef<HTMLSpanElement>(null)
  const id = useId()

  useEffect(() => {
    if (!visible || !popupRef.current || !wrapRef.current) return
    const el = popupRef.current
    const wrapEl = wrapRef.current

    // 초기 중앙 정렬
    el.style.left = '50%'
    el.style.right = 'auto'
    el.style.transform = 'translateX(-50%)'

    const rect = el.getBoundingClientRect()
    const margin = 8

    if (rect.right > window.innerWidth - margin) {
      el.style.left = 'auto'
      el.style.right = '0'
      el.style.transform = 'none'
    } else if (rect.left < margin) {
      el.style.left = '0'
      el.style.right = 'auto'
      el.style.transform = 'none'
    }

    // 화살표를 항상 단어 중앙 위로
    const finalRect = el.getBoundingClientRect()
    const wrapRect = wrapEl.getBoundingClientRect()
    const termCenter = wrapRect.left + wrapRect.width / 2
    const arrowLeft = termCenter - finalRect.left
    el.style.setProperty('--arrow-left', `${arrowLeft}px`)
  }, [visible])

  return (
    <span className={styles.wrap} ref={wrapRef}>
      <span
        className={styles.term}
        tabIndex={0}
        aria-describedby={id}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
      >
        {children}
      </span>
      {visible && (
        <span id={id} role="tooltip" className={styles.popup} ref={popupRef}>
          {definition}
        </span>
      )}
    </span>
  )
}
