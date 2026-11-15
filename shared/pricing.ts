import type { Ingredient, Product, ProductOffer } from './types';

const round2 = (n: number) => Math.round(n * 100) / 100;
/** The most a hint may add to the minimum purchase. */
const HINT_MAX_EXTRA = 1.0;

/** Recipe amount → product units. g and ml are treated alike; pieces need gramsPerPiece for weight products. */
export function toProductUnits(amount: number, ing: Ingredient, product: Product): number | null {
  if (product.packUnit === 'stuk') return ing.unit === 'stuk' ? amount : null;
  if (ing.unit === 'stuk') return ing.gramsPerPiece ? amount * ing.gramsPerPiece : null;
  return amount;
}

export function activeOffer(p: Product, today: string): ProductOffer | undefined {
  const o = p.offer;
  return o && o.validFrom <= today && today <= o.validUntil ? o : undefined;
}

function costFor(p: Product, packs: number, offer: ProductOffer | undefined): number {
  if (!offer) return round2(packs * p.price);
  switch (offer.kind) {
    case 'price': return round2(packs * offer.price);
    case 'multi': return round2(Math.floor(packs / offer.buy) * offer.pay * p.price + (packs % offer.buy) * p.price);
    case 'bundle': return round2(Math.floor(packs / offer.count) * offer.price + (packs % offer.count) * p.price);
  }
}

function dealSize(offer: ProductOffer | undefined): number {
  if (offer?.kind === 'multi') return offer.buy;
  if (offer?.kind === 'bundle') return offer.count;
  return 1;
}

export function purchase(p: Product, needed: number, today: string): { packs: number; cost: number; hint?: { packs: number; cost: number } } {
  const offer = activeOffer(p, today);
  const packs = Math.max(1, Math.ceil(needed / p.packAmount - 1e-9));
  const cost = costFor(p, packs, offer);
  const size = dealSize(offer);
  const hintPacks = Math.ceil(packs / size) * size;
  if (hintPacks > packs) {
    const hintCost = costFor(p, hintPacks, offer);
    if (hintCost / hintPacks < cost / packs && hintCost - cost <= HINT_MAX_EXTRA + 1e-9) {
      return { packs, cost, hint: { packs: hintPacks, cost: hintCost } };
    }
  }
  return { packs, cost };
}

/** Cost of only the used amount, at the best unit price (a full deal group when an offer is active). */
export function usedCost(p: Product, needed: number, today: string): number {
  const offer = activeOffer(p, today);
  const size = dealSize(offer);
  const unitPrice = Math.min(p.price / p.packAmount, costFor(p, size, offer) / (size * p.packAmount));
  return round2(needed * unitPrice);
}
