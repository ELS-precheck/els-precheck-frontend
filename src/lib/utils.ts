// 만원 단위 숫자 → 표시 문자열
// money(1000) → "1,000만원", money(15000) → "1.5억원"
export function money(manwon: number): string {
  const v = Math.round(Math.abs(manwon))
  if (v >= 10000) {
    const eok = Math.round(v / 100) / 100
    return `${String(eok).replace(/\.?0+$/, '')}억원`
  }
  return `${v.toLocaleString('ko-KR')}만원`
}

// 원 단위 숫자 → 표시 문자열 (API 금액 필드용)
// moneyFromWon(10_000_000) → "1,000만원"
export function moneyFromWon(won: number): string {
  const manwon = won / 10000
  if (manwon < 1) {
    return `${Math.round(won).toLocaleString('ko-KR')}원`
  }
  return money(manwon)
}
