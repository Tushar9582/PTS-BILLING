import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "@/components/ui/sonner";
import { database } from "@/firebase/firebaseConfig";
import { ref, set, remove, onValue, update, push, get, off } from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// Types
export interface Product {
  barcode: string;
  description: string;
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Category {
  description: string;
  id: string;
  name: string;
}

export interface BusinessConfig {
  [x: string]: string;
  upiId: string;
  name: string;
  type: string;
  address: string;
  phone: string;
  email: string;
  taxRate: number;
  logo?: string;
  gstNumber: string;
}

export interface Sale {
  customer: any;
  customerName: any;
  customerPhone: any;
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discountAmount: number;
  grandTotal: number;
  date: string;
  paymentMethod: string;
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

interface BillingContextType {
  products: Product[];
  categories: Category[];
  cart: CartItem[];
  sales: Sale[];
  businessConfig: BusinessConfig | null;
  isConfigured: boolean;
  isLoading: boolean;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addCategory: (name: string) => void;
  updateCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  addToCart: (product: Product) => void;
  updateCartItem: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  completeSale: (saleData: {
    paymentMethod: string;
    subtotal: number;
    tax: number;
    discountAmount: number;
    grandTotal: number;
    customerInfo?: {
      name?: string;
      phone?: string;
      email?: string;
    };
  }) => void;
  setBusinessConfig: (config: BusinessConfig) => void;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

// Helper functions for local storage
const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : defaultValue;
};

const saveToLocalStorage = <T,>(key: string, value: T) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

// Initialize default data structure for a new user
const initializeUserData = async (userId: string) => {
  try {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      await set(userRef, {
        products: {},
        categories: {},
        sales: {},
        businessConfig: null,
      });
    }
  } catch (error) {
    console.error("Error initializing user data:", error);
  }
};

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(loadFromLocalStorage('billing_products', []));
  const [categories, setCategories] = useState<Category[]>(loadFromLocalStorage('billing_categories', []));
  const [cart, setCart] = useState<CartItem[]>(loadFromLocalStorage('billing_cart', []));
  const [sales, setSales] = useState<Sale[]>(loadFromLocalStorage('billing_sales', []));
  const [businessConfig, setBusinessConfig] = useState<BusinessConfig | null>(
    loadFromLocalStorage('billing_business_config', null)
  );
  const [uid, setUid] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      if (user) {
        setUid(user.uid);
        await initializeUserData(user.uid);
        setupFirebaseListeners(user.uid);
      } else {
        // User signed out, clear Firebase listeners and use local storage
        clearFirebaseListeners();
        setUid(null);
        setProducts(loadFromLocalStorage('billing_products', []));
        setCategories(loadFromLocalStorage('billing_categories', []));
        setSales(loadFromLocalStorage('billing_sales', []));
        setBusinessConfig(loadFromLocalStorage('billing_business_config', null));
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
      clearFirebaseListeners();
    };
  }, []);

  // Firebase listeners management
  let productsRef: ReturnType<typeof ref>;
  let categoriesRef: ReturnType<typeof ref>;
  let salesRef: ReturnType<typeof ref>;
  let configRef: ReturnType<typeof ref>;

  const setupFirebaseListeners = (userId: string) => {
    // Products listener
    productsRef = ref(database, `users/${userId}/products`);
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedProducts = Object.values(data) as Product[];
        setProducts(loadedProducts);
        saveToLocalStorage('billing_products', loadedProducts);
      } else {
        setProducts([]);
        saveToLocalStorage('billing_products', []);
      }
    });

    // Categories listener
    categoriesRef = ref(database, `users/${userId}/categories`);
    onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedCategories = Object.values(data) as Category[];
        setCategories(loadedCategories);
        saveToLocalStorage('billing_categories', loadedCategories);
      } else {
        setCategories([]);
        saveToLocalStorage('billing_categories', []);
      }
    });

    // Sales listener
    salesRef = ref(database, `users/${userId}/sales`);
    onValue(salesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedSales = Object.entries(data).map(([id, saleData]) => ({
          id,
          ...(saleData as Omit<Sale, 'id'>)
        }));
        setSales(loadedSales);
        saveToLocalStorage('billing_sales', loadedSales);
      } else {
        setSales([]);
        saveToLocalStorage('billing_sales', []);
      }
    });

    // Business config listener
    configRef = ref(database, `users/${userId}/businessConfig`);
    onValue(configRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setBusinessConfig(data);
        saveToLocalStorage('billing_business_config', data);
      } else {
        setBusinessConfig(null);
        saveToLocalStorage('billing_business_config', null);
      }
    });
  };

  const clearFirebaseListeners = () => {
    if (productsRef) off(productsRef);
    if (categoriesRef) off(categoriesRef);
    if (salesRef) off(salesRef);
    if (configRef) off(configRef);
  };

  // Cart is always local (not synced to Firebase)
  useEffect(() => {
    saveToLocalStorage('billing_cart', cart);
  }, [cart]);

  const isConfigured = !!businessConfig;

  // Product CRUD operations
  const addProduct = async (product: Product) => {
    try {
      if (uid) {
        const productRef = ref(database, `users/${uid}/products/${product.id}`);
        await set(productRef, product);
      } else {
        // Offline/local mode
        setProducts([...products, product]);
        saveToLocalStorage('billing_products', [...products, product]);
      }
      toast.success("Product added successfully");
    } catch (error) {
      console.error("Error adding product:", error);
      toast.error("Failed to add product");
    }
  };

  const updateProduct = async (id: string, updatedFields: Partial<Product>) => {
    try {
      if (uid) {
        const productRef = ref(database, `users/${uid}/products/${id}`);
        await update(productRef, updatedFields);
      } else {
        // Offline/local mode
        const updatedProducts = products.map(product => 
          product.id === id ? { ...product, ...updatedFields } : product
        );
        setProducts(updatedProducts);
        saveToLocalStorage('billing_products', updatedProducts);
      }
      toast.success("Product updated successfully");
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product");
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      if (uid) {
        const productRef = ref(database, `users/${uid}/products/${id}`);
        await remove(productRef);
      } else {
        // Offline/local mode
        const updatedProducts = products.filter(product => product.id !== id);
        setProducts(updatedProducts);
        saveToLocalStorage('billing_products', updatedProducts);
      }
      toast.success("Product deleted successfully");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  // Category CRUD operations
  const addCategory = async (name: string) => {
    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name,
    };

    try {
      if (uid) {
        const categoryRef = ref(database, `users/${uid}/categories/${newCategory.id}`);
        await set(categoryRef, newCategory);
      } else {
        // Offline/local mode
        const updatedCategories = [...categories, newCategory];
        setCategories(updatedCategories);
        saveToLocalStorage('billing_categories', updatedCategories);
      }
      toast.success("Category added successfully");
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("Failed to add category");
    }
  };

  const updateCategory = async (id: string, name: string) => {
    try {
      if (uid) {
        const categoryRef = ref(database, `users/${uid}/categories/${id}`);
        await update(categoryRef, { name });
      } else {
        // Offline/local mode
        const updatedCategories = categories.map(category => 
          category.id === id ? { ...category, name } : category
        );
        setCategories(updatedCategories);
        saveToLocalStorage('billing_categories', updatedCategories);
      }
      toast.success("Category updated successfully");
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update category");
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      if (uid) {
        const categoryRef = ref(database, `users/${uid}/categories/${id}`);
        await remove(categoryRef);
      } else {
        // Offline/local mode
        const updatedCategories = categories.filter(category => category.id !== id);
        setCategories(updatedCategories);
        saveToLocalStorage('billing_categories', updatedCategories);
      }
      toast.success("Category deleted successfully");
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  // Cart operations (always local)
  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const updateCartItem = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart(cart.map((item) => (item.id === id ? { ...item, quantity } : item)));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
    toast.info("Item removed from cart");
  };

  const clearCart = () => {
    setCart([]);
  };

  const completeSale = async (saleData: {
    paymentMethod: string;
    subtotal: number;
    tax: number;
    discountAmount: number;
    grandTotal: number;
    customerInfo?: {
      name?: string;
      phone?: string;
      email?: string;
    };
  }) => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      items: [...cart],
      subtotal: saleData.subtotal,
      tax: saleData.tax,
      discountAmount: saleData.discountAmount,
      grandTotal: saleData.grandTotal,
      date: new Date().toISOString(),
      paymentMethod: saleData.paymentMethod,
      customerInfo: saleData.customerInfo,
      customer: undefined,
      customerName: undefined,
      customerPhone: undefined
    };

    try {
      if (uid) {
        const saleRef = ref(database, `users/${uid}/sales/${newSale.id}`);
        await set(saleRef, newSale);
      } else {
        const updatedSales = [newSale, ...sales];
        setSales(updatedSales);
        saveToLocalStorage('billing_sales', updatedSales);
      }

      clearCart();
      toast.success("Sale completed successfully");
    } catch (error) {
      console.error("Error completing sale:", error);
      toast.error("Failed to complete sale");
    }
  };

  // Business configuration
  const configBusiness = async (config: BusinessConfig) => {
    try {
      if (uid) {
        const configRef = ref(database, `users/${uid}/businessConfig`);
        await set(configRef, config);
      } else {
        // Offline/local mode
        setBusinessConfig(config);
        saveToLocalStorage('billing_business_config', config);
      }
      toast.success("Business configuration saved");
    } catch (error) {
      console.error("Error saving business config:", error);
      toast.error("Failed to save business configuration");
    }
  };

  const value = {
    products,
    categories,
    cart,
    sales,
    businessConfig,
    isConfigured,
    isLoading,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    completeSale,
    setBusinessConfig: configBusiness,
  };

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
};

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (context === undefined) {
    throw new Error("useBilling must be used within a BillingProvider");
  }
  return context;
};  