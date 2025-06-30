import React, { useState } from 'react'
import PaymentInputs from './PaymentInputs'
import { ProductItem } from './ProductSelector'

interface Props {
  cart: ProductItem[]
  onSell: (pay: { cash: number, card: number }) => void
  onCancel: () => void
}

export default function CartSummary({ cart, onSell, onCancel }: Props) {
  const total = cart.reduce((sum, i) => sum + i.salePrice, 0)
  const [cash, setCash] = useState(0)
  const [card, setCard] = useState(0)

  return (
    <div className="border p-4">
      <h2>Обране:</h2>
      {cart.map(i => (
        <div key={i.id}>{i.brand} / {i.flavors[0].name} — {i.salePrice}₴</div>
      ))}
      <div className="font-bold">Разом: {total}₴</div>
      <PaymentInputs total={total} cash={cash} card={card} onChange={(c, ca) => { setCash(c); setCard(ca) }} />
      <button disabled={cash + card !== total} onClick={() => onSell({ cash, card })}>Продати</button>
      <button onClick={onCancel}>Скасувати</button>
    </div>
  )
}
