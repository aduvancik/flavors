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
  brand: BrandItem,
  onSelect: (fl: Flavor) => void,
  onBack: () => void
}
export default function FlavorSelector({ brand, onSelect, onBack }: Props) {
  return (
    <div>
      <button onClick={onBack}>← Назад до брендів</button>
      <h2>{brand.brand} — виберіть смак</h2>
      {brand.flavors.map(fl => (
        <div key={fl.name}>
          <span>{fl.name} — {fl.quantity} шт</span>
          <button onClick={() => onSelect(fl)}>Оберіть</button>
        </div>
      ))}
    </div>
  )
}
