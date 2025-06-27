// contexts/PosTabsContext.tsx
import React, { createContext, useContext, useState } from "react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  imageUrl?: string;
}

interface PosTab {
  id: string;
  name: string;
  cart: CartItem[];
  activeCategory: string;
  searchQuery: string;
  paymentMethod: string;
  discountType: 'flat' | 'percentage';
  discountValue: number;
}

interface PosTabsContextType {
  tabs: PosTab[];
  activeTab: string;
  addNewTab: () => void;
  switchTab: (id: string) => void;
  closeTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<PosTab>) => void;
}

const PosTabsContext = createContext<PosTabsContextType | undefined>(undefined);

export const PosTabsProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [tabs, setTabs] = useState<PosTab[]>([
    {
      id: '1',
      name: 'Sale 1',
      cart: [],
      activeCategory: 'all',
      searchQuery: '',
      paymentMethod: 'cash',
      discountType: 'flat',
      discountValue: 0
    }
  ]);
  const [activeTab, setActiveTab] = useState<string>('1');

  const addNewTab = () => {
    const newTab: PosTab = {
      id: uuidv4(),
      name: `Sale ${tabs.length + 1}`,
      cart: [],
      activeCategory: 'all',
      searchQuery: '',
      paymentMethod: 'cash',
      discountType: 'flat',
      discountValue: 0
    };
    setTabs([...tabs, newTab]);
    setActiveTab(newTab.id);
  };

  const switchTab = (id: string) => {
    setActiveTab(id);
  };

  const closeTab = (id: string) => {
    if (tabs.length <= 1) return;
    
    const newTabs = tabs.filter(tab => tab.id !== id);
    setTabs(newTabs);
    
    if (activeTab === id) {
      setActiveTab(newTabs[newTabs.length - 1].id);
    }
  };

  const updateTab = (id: string, updates: Partial<PosTab>) => {
    setTabs(tabs.map(tab => 
      tab.id === id ? { ...tab, ...updates } : tab
    ));
  };

  return (
    <PosTabsContext.Provider value={{ tabs, activeTab, addNewTab, switchTab, closeTab, updateTab }}>
      {children}
    </PosTabsContext.Provider>
  );
};

export const usePosTabs = () => {
  const context = useContext(PosTabsContext);
  if (!context) {
    throw new Error('usePosTabs must be used within a PosTabsProvider');
  }
  return context;
};

function uuidv4(): string {
    throw new Error("Function not implemented.");
}
