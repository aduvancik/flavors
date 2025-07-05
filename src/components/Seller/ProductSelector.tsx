import React, { useState } from 'react'

export type ProductItem = {
  id: string
  brand: string
  volume: string
  salePrice: number
  sellerAmount: number
  flavors: { name: string; quantity: number }[]
}

type ProductType = 'liquids' | 'cartridges'

interface Props {
  products: ProductItem[]
  onSelect: (item: ProductItem) => void
}

export default function ProductSelector({ products, onSelect }: Props) {
  const [type, setType] = useState<ProductType>('liquids')
  const list = products.filter(p => p.volume && type === 'liquids')

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as ProductType
    setType(value)
  }

  return (
    <div className="mb-4">
      <select onChange={handleChange} className="border p-2" value={type}>
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
