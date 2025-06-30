import React from 'react'

interface Props {
  total: number
  cash: number
  card: number
  onChange: (cash: number, card: number) => void
}

export default function PaymentInputs({ total, cash, card, onChange }: Props) {
  return (
    <div className="mt-2">
      <label>
        Готівка:
        <input type="number" value={cash} onChange={e => {
          const c = +e.target.value
          const ca = total - c
          onChange(c, ca >= 0 ? ca : 0)
        }} />
      </label>
      <label>
        Карта:
        <input type="number" value={card} onChange={e => {
          const c = +e.target.value
          const ca = total - c
          onChange(ca >= 0 ? ca : 0, c)
        }} />
      </label>
    </div>
  )
}
