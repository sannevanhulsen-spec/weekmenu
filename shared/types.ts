export type StoreId = 'ah' | 'jumbo' | 'aldi' | 'lidl';
export const STORES: StoreId[] = ['ah', 'jumbo', 'aldi', 'lidl'];
export const STORE_NAMES: Record<StoreId, string> = { ah: 'Albert Heijn', jumbo: 'Jumbo', aldi: 'Aldi', lidl: 'Lidl' };
export type Unit = 'g' | 'ml' | 'stuk';

/** Per 100 g, values unchanged from NEVO-online. */
export interface NevoItem { code: number; name: string; kcal: number; protein: number; carbs: number; fat: number; fiber: number; /** sodium, mg per 100 g (NEVO NA) */ na: number }

export interface Ingredient {
  id: string;
  name: string;
  unit: Unit;
  gramsPerPiece?: number;
  nevoCode: number | null;
  pantry: boolean;
  aisle: string;
  search: Partial<Record<StoreId, string>>;
}

/** Amount in the ingredient's unit, for 2 persons. */
export interface RecipeLine { ingredientId: string; amount: number }
export interface Recipe { id: string; title: string; minutes: number; tags: string[]; vegetarian: boolean; steps: string[]; lines: RecipeLine[] }
export interface Nutrition { kcal: number; protein: number; carbs: number; fat: number; fiber: number; salt: number }

export type Offer =
  | { kind: 'price'; price: number }
  | { kind: 'multi'; buy: number; pay: number }
  | { kind: 'bundle'; count: number; price: number };

/** Dates are ISO yyyy-mm-dd, inclusive. */
export type ProductOffer = Offer & { validFrom: string; validUntil: string; label: string };

export interface Product {
  store: StoreId;
  name: string;
  title?: string;
  packAmount: number;
  packUnit: Unit;
  price: number;
  offer?: ProductOffer;
}

/** products keyed by ingredientId */
export interface StorePrices { fetchedAt: string; stale: boolean; products: Record<string, Product> }
export interface PriceFile { generatedAt: string; stores: Record<StoreId, StorePrices> }
