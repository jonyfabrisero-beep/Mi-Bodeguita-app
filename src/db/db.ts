import Dexie, { Table } from 'dexie';

export interface Product {
  id?: number;
  barcode: string;
  name: string;
  priceUSD: number;
  stock: number;
  minStock: number;
  isWeighed?: boolean;
  category?: string;
}

export interface SaleItem {
  productId: number;
  barcode: string;
  name: string;
  quantity: number;
  priceUSD: number;
  isWeighed?: boolean;
}

export interface Sale {
  id?: number;
  date: number; // timestamp
  clientName: string;
  items: SaleItem[];
  totalUSD: number;
  totalVES: number;
  exchangeRate: number;
}

export interface Settings {
  id?: number; // Always 1
  exchangeRateVES: number;
  businessName?: string;
  rif?: string;
  address?: string;
  phone?: string;
  categories?: string[];
}

export class MiBodeguitaDB extends Dexie {
  products!: Table<Product>;
  sales!: Table<Sale>;
  settings!: Table<Settings>;

  constructor() {
    super('MiBodeguitaDB');
    this.version(1).stores({
      products: '++id, barcode, name',
      sales: '++id, date',
      settings: '++id'
    });
  }
}

export const db = new MiBodeguitaDB();

// Initialize settings if empty
db.on('populate', () => {
  db.settings.add({ 
    id: 1, 
    exchangeRateVES: 36.5,
    categories: ['Víveres', 'Charcutería', 'Carnicería', 'Frutas y Verduras']
  }); // Default rate
});
