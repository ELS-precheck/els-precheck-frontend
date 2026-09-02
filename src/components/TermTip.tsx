import styles from './TermTip.module.css'

interface Props {
  definition: string
  children: React.ReactNode
}

export default function TermTip({ definition, children }: Props) {
  return (
    <span className={styles.wrap}>
      <span className={styles.term}>{children}</span>
      <span className={styles.popup}>{definition}</span>
    </span>
  )
}
