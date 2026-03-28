import type { Shop } from "@prisma/client";

export type ShopCreditDTO = {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  creditLimit: string;
};

export function toShopCreditDTO(s: Shop): ShopCreditDTO {
  return {
    id: s.id,
    name: s.name,
    ownerName: s.ownerName,
    phone: s.phone,
    address: s.address,
    creditLimit: s.creditLimit.toString(),
  };
}
