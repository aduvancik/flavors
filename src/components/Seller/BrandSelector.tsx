export interface Flavor {
  name: string;
  quantity: number;
  salePrice: number;
  sellerAmount: number;
}

export interface BrandItem {
  id: string;
  brand: string;
  volume: string;
  flavors: Flavor[];
}

interface Props {
  brands: BrandItem[],
  onSelect: (brand: BrandItem) => void
}
export default function BrandSelector({ brands, onSelect }: Props) {
  return (
    <div>
      <h2>Оберіть бренд</h2>
      {brands.map(b => (
        <button key={b.id} onClick={() => onSelect(b)}>
          {b.brand} ({b.volume} мл)
        </button>
      ))}
    </div>
  )
}
