/* eslint-disable prettier/prettier */
export class CreatePurchaseDto {
  entity: string;
  warehouse: string;
  supplier: string;
  document: string;
  products: {
    code: string;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    expirationDate?: string;
  }[];
}
