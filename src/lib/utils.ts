
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Add any missing types needed for the application
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
  stock?: number;
  [key: string]: any;
}

export interface Sale {
  id: string;
  date: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  tax: number;
  grandTotal: number;
  customerInfo?: {
    name: string;
    phone: string;
  };
  paymentMethod: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}
