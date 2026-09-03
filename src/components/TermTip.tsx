import { useState, useRef, useEffect, useCallback, useId } from 'react'
import styles from './TermTip.module.css'

interface Props {
  definition: string
  children: React.ReactNode
}

export default function TermTip({ definition, children }: Props) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const visible = hovered || focused
  const wrapRef = useRef<HTMLSpanElement>(null)
  const popupRef = useRef<HTMLSpanElement>(null)
  const id = useId()

  const recalcPosition = useCallback(() => {
    if (!popupRef.current || !wrapRef.current) return
    const el = popupRef.current
    const wrapEl = wrapRef.current

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

    const finalRect = el.getBoundingClientRect()
    const wrapRect = wrapEl.getBoundingClientRect()
    const termCenter = wrapRect.left + wrapRect.width / 2
    const arrowLeft = termCenter - finalRect.left
    el.style.setProperty('--arrow-left', `${arrowLeft}px`)
  }, [])

  useEffect(() => {
    if (!visible) return
    recalcPosition()
    window.addEventListener('resize', recalcPosition)
    return () => window.removeEventListener('resize', recalcPosition)
  }, [visible, recalcPosition])

  return (
    <span className={styles.wrap} ref={wrapRef}>
      <span
        className={styles.term}
        tabIndex={0}
        aria-describedby={id}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
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
