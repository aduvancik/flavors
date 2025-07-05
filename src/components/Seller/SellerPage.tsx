'use client'
import { useState, useEffect } from 'react'
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import BrandSelector from './BrandSelector'
import FlavorSelector from './FlavorSelector'
import SummaryLog from './SummaryLog'


type Flavor = { name: string; quantity: number; salePrice: number; sellerAmount: number }
type BrandItem = { id: string; brand: string; volume: string; flavors: Flavor[] }
type LogEntry = {
  date: string;
  brand: string;
  flavor: string;
  salePrice: number;
  sellerAmount: number;
};


export default function SellerPage() {
  const [products, setProducts] = useState<BrandItem[]>([])
  const [selectedBrand, setSelectedBrand] = useState<BrandItem | null>(null)
  const [selectedFlavor, setSelectedFlavor] = useState<Flavor | null>(null)
const [log, setLog] = useState<LogEntry[]>([]);

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, 'liquids'))
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as BrandItem)))
    }
    load()
  }, [log])

  const discard = async () => {
    if (!(selectedBrand && selectedFlavor)) return
    const { name, salePrice, sellerAmount } = selectedFlavor
    const updatedFlavors = selectedBrand.flavors.map(fl => fl.name === name
      ? { ...fl, quantity: fl.quantity - 1 } : fl
    ).filter(fl => fl.quantity > 0)

    await updateDoc(doc(db, 'liquids', selectedBrand.id), { flavors: updatedFlavors })
    if (updatedFlavors.length === 0) {
      setProducts(prev => prev.filter(p => p.id !== selectedBrand.id))
      setSelectedBrand(null)
    } else {
      setProducts(prev => prev.map(p => p.id === selectedBrand.id
        ? { ...p, flavors: updatedFlavors } : p))
    }

    const entry = {
      date: new Date().toLocaleDateString(),
      brand: selectedBrand.brand,
      flavor: name,
      salePrice,
      sellerAmount
    }
    setLog(prev => [entry, ...prev])
    setSelectedFlavor(null)
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h1>Панель продавця</h1>
      {!selectedBrand && (
        <BrandSelector brands={products} onSelect={b => setSelectedBrand(b)} />
      )}
      {selectedBrand && !selectedFlavor && (
        <FlavorSelector brand={selectedBrand} onSelect={f => setSelectedFlavor(f)} onBack={() => setSelectedBrand(null)} />
      )}
      {selectedFlavor && (
        <div>
          <p>Смак: {selectedFlavor.name}</p>
          <p>Ціна продажу: {selectedFlavor.salePrice} ₴</p>
          <p>Сума продавцю: {selectedFlavor.sellerAmount} ₴</p>
          <button onClick={discard}>Продати 1 шт</button>
          <button onClick={() => setSelectedFlavor(null)}>Відмінити</button>
        </div>
      )}
      <SummaryLog log={log} />
    </div>
  )
}
