interface Props {
  log: { date: string; brand: string; flavor: string; salePrice: number; sellerAmount: number }[]
}
export default function SummaryLog({ log }: Props) {
  const totalSale = log.reduce((s, e) => s + e.salePrice, 0)
  const totalSalary = log.reduce((s, e) => s + e.sellerAmount, 0)
  return (
    <div>
      <h2>Звіт продажів</h2>
      <p>Загальна сума продажу: {totalSale} ₴</p>
      <p>Зарплата продавцю: {totalSalary} ₴</p>
      <ul>{log.map((e, i) => (
        <li key={i}>{e.date}: {e.brand} / {e.flavor} — {e.salePrice} грн (зп: {e.sellerAmount} грн)</li>
      ))}</ul>
    </div>
  )
}
