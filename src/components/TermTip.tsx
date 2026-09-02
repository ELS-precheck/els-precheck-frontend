import { useId } from 'react'
import styles from './TermTip.module.css'

interface Props {
  definition: string
  children: React.ReactNode
}

export default function TermTip({ definition, children }: Props) {
  const id = useId()
  return (
    <span className={styles.wrap}>
      <span
        className={styles.term}
        tabIndex={0}
        aria-describedby={id}
      >
        {children}
      </span>
      <span id={id} role="tooltip" className={styles.popup}>
        {definition}
      </span>
    </span>
  )
}
