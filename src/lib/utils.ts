
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

export function getRelativeTimeString(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();

  const seconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  
  return formatDate(targetDate.toISOString());
}

// Helper to get appropriate color based on stock levels
export function getStockStatusColor(stock: number): string {
  if (stock === 0) return 'text-red-500';
  if (stock <= 5) return 'text-amber-500';
  return 'text-green-500';
}

// Import icons for business type theming
import { Coffee, Store, ShoppingBag, Utensils, Briefcase } from "lucide-react";

export function getBusinessIcon(type: string) {
  switch(type) {
    case "cafe":
      return Coffee;
    case "grocery":
      return Store;
    case "retail":
      return ShoppingBag;
    case "restaurant":
      return Utensils;
    default:
      return Briefcase;
  }
}

export function getBusinessThemeColor(type: string): string {
  switch(type) {
    case "cafe":
      return 'amber';
    case "grocery":
      return 'green';
    case "retail":
      return 'indigo';
    case "restaurant":
      return 'red';
    default:
      return 'blue';
  }
}
