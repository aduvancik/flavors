import { Flavor } from './FlavorInputs';

export function isValidForm(
  brand: string,
  purchasePrice: string,
  salePrice: string,
  sellerAmount: string,
  imageFile: File | null,
  imageUrl: string,
  type: 'liquids' | 'cartridges' | 'nicoboosters',
  volume: string,
  flavors: Flavor[],
  quantity: string
): boolean {
  if (!brand.trim()) return false;
  if (!purchasePrice.trim()) return false;
  if (!salePrice.trim()) return false;
  if (!sellerAmount.trim()) return false;

  if (!imageFile && !imageUrl) return false;

  if (type === 'liquids') {
    if (!volume.trim()) return false;

    for (const f of flavors) {
      const quantityStr = String(f.quantity).trim(); // перетворення в рядок
      if (!f.name.trim() || !quantityStr) return false;
    }
  } else {
    if (!quantity.trim()) return false;
  }

  return true;
}
