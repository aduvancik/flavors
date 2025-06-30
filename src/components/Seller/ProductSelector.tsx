import React, { useState } from 'react'

export type ProductItem = {
  id: string, brand: string, volume: string, salePrice: number, sellerAmount: number, flavors: { name: string, quantity: number }[]
}

interface Props {
  products: ProductItem[]
  onSelect: (item: ProductItem) => void
}

export default function ProductSelector({ products, onSelect }: Props) {
  const [type, setType] = useState<'liquids' | 'cartridges'>('liquids')
  const list = products.filter(p => p.volume && type === 'liquids')

  return (
    <div className="mb-4">
      <select onChange={e => setType(e.target.value as any)} className="border p-2">
        <option value="liquids">Рідини</option>
        <option value="cartridges">Катриджі</option>
      </select>
      {list.map(item => (
        <div key={item.id} className="flex justify-between p-2 border rounded hover:bg-gray-50">
          <div>{item.brand} ({item.flavors[0].name}) — {item.salePrice}₴</div>
          <button onClick={() => onSelect(item)} className="btn">+ додати</button>
        </div>
      ))}
    </div>
  )
}
