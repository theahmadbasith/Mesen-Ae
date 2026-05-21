import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const FORMAT_IDR = (price: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

export const saveLocalTransactionId = (txId: string | number) => {
  try {
    const existingStr = localStorage.getItem('mesenae_my_tx_ids');
    const existing: (string | number)[] = existingStr ? JSON.parse(existingStr) : [];
    if (!existing.includes(txId)) {
      existing.push(txId);
      localStorage.setItem('mesenae_my_tx_ids', JSON.stringify(existing));
    }
  } catch (e) {
    console.error('Error saving txId to local storage:', e);
  }
};

export const getLocalTransactionIds = (): (string | number)[] => {
  try {
    const existingStr = localStorage.getItem('mesenae_my_tx_ids');
    return existingStr ? JSON.parse(existingStr) : [];
  } catch (e) {
    console.error('Error getting txIds from local storage:', e);
    return [];
  }
};
