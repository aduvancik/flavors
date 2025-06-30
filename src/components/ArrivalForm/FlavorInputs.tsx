import React from 'react';

export type Flavor = { name: string; quantity: string | number };

interface FlavorInputsProps {
  flavors: Flavor[];
  onChange: (index: number, field: 'name' | 'quantity', value: string) => void;
  onAdd: () => void;
}

export default function FlavorInputs({ flavors, onChange, onAdd }: FlavorInputsProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Смаки</h3>
      {flavors.map((f, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={f.name}
            onChange={e => onChange(i, 'name', e.target.value)}
            placeholder="Назва смаку"
            className="border p-2 w-full"
          />
          <input
            type="number"
            value={f.quantity}
            onChange={e => onChange(i, 'quantity', e.target.value)}
            placeholder="К-сть"
            className="border p-2 w-24"
          />
        </div>
      ))}
      <button
        onClick={onAdd}
        type="button"
        className="text-blue-600 underline"
      >
        + Додати смак
      </button>
    </div>
  );
}

