
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Customer {
  name: string;
  phone: string;
  lastVisit?: string;
  visits?: number;
  totalSpent?: number;
}

interface CustomerState {
  customers: Customer[];
  recentCustomers: Customer[];
  addCustomer: (customer: Customer) => void;
  updateCustomerSpend: (phone: string, amount: number) => void;
  findCustomerByPhone: (phone: string) => Customer | undefined;
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      customers: [],
      recentCustomers: [],
      
      addCustomer: (customer) => {
        if (!customer.name && !customer.phone) return;
        
        set((state) => {
          // Check if customer already exists by phone number
          const existingIndex = state.customers.findIndex(
            (c) => c.phone === customer.phone && customer.phone !== ""
          );

          let newCustomers = [...state.customers];
          const now = new Date().toISOString();

          if (existingIndex >= 0) {
            // Update existing customer
            newCustomers[existingIndex] = {
              ...newCustomers[existingIndex],
              name: customer.name || newCustomers[existingIndex].name,
              lastVisit: now,
              visits: (newCustomers[existingIndex].visits || 0) + 1,
            };
          } else if (customer.name || customer.phone) {
            // Add new customer
            newCustomers.push({
              name: customer.name,
              phone: customer.phone,
              lastVisit: now,
              visits: 1,
              totalSpent: 0,
            });
          }

          // Update recent customers
          const recentCustomers = [...newCustomers]
            .sort((a, b) => {
              const dateA = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
              const dateB = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
              return dateB - dateA;
            })
            .slice(0, 10);

          return { customers: newCustomers, recentCustomers };
        });
      },

      updateCustomerSpend: (phone, amount) => {
        if (!phone) return;
        
        set((state) => {
          const customerIndex = state.customers.findIndex(
            (c) => c.phone === phone
          );
          
          if (customerIndex === -1) return state;
          
          const newCustomers = [...state.customers];
          newCustomers[customerIndex] = {
            ...newCustomers[customerIndex],
            totalSpent: (newCustomers[customerIndex].totalSpent || 0) + amount,
          };
          
          return { customers: newCustomers };
        });
      },

      findCustomerByPhone: (phone) => {
        if (!phone) return undefined;
        return get().customers.find((c) => c.phone === phone);
      },
    }),
    {
      name: 'customer-storage',
    }
  )
);
