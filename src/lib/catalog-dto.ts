import type { Brand, CatalogProduct } from "@prisma/client";

/** Plain shape safe to pass from Server → Client Components (no Decimal/Date). */
export type CatalogProductDTO = {
  id: string;
  brandId: string | null;
  brand: string;
  name: string;
  description: string | null;
  warehouseQty: number;
  unitPrice: string;
};

/** Owner warehouse screen only — includes cost (not exposed to retail/SR clients). */
export type OwnerCatalogProductDTO = CatalogProductDTO & { unitCost: string };

export type BrandDTO = {
  id: string;
  name: string;
};

export function toBrandDTO(b: Brand): BrandDTO {
  return { id: b.id, name: b.name };
}

type ProductForDto = CatalogProduct & { brandRel?: Brand | null };

export function toCatalogProductDTO(p: ProductForDto): CatalogProductDTO {
  return {
    id: p.id,
    brandId: p.brandId ?? null,
    brand: p.brandRel?.name ?? p.brand,
    name: p.name,
    description: p.description,
    warehouseQty: p.warehouseQty,
    unitPrice: p.unitPrice.toString(),
  };
}

export function toOwnerCatalogProductDTO(p: ProductForDto): OwnerCatalogProductDTO {
  return { ...toCatalogProductDTO(p), unitCost: p.unitCost.toString() };
}

/** Use when loading products for DTO mapping (resolves brand name from relation when present). */
export const catalogProductInclude = { brandRel: true } as const;
