import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "@/components/ui/sonner";
import { database } from "@/firebase/firebaseConfig";
import { ref, set, remove, onValue, update, push } from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// Types
export interface Product {
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
  id: string;
  name: string;
}

export interface BusinessConfig {
  name: string;
  type: string;
  address: string;
  phone: string;
  email: string;
  taxRate: number;
  logo?: string;
}

export interface Sale {
  id: string;
  items: CartItem[];
  total: number;
  subtotal: number; // ✅ Added this
  tax: number;
  grandTotal: number;
  date: string;
  paymentMethod: string;
}

interface BillingContextType {
  products: Product[];
  categories: Category[];
  cart: CartItem[];
  sales: Sale[];
  businessConfig: BusinessConfig | null;
  isConfigured: boolean;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addCategory: (name: string) => void;
  deleteCategory: (id: string) => void;
  addToCart: (product: Product) => void;
  updateCartItem: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  completeSale: (paymentMethod: string) => void;
  setBusinessConfig: (config: BusinessConfig) => void;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(() => {
    const savedCategories = localStorage.getItem("billing_categories");
    return savedCategories
      ? JSON.parse(savedCategories)
      : [
          { id: "cat-1", name: "Beverages" },
          { id: "cat-2", name: "Food" },
          { id: "cat-3", name: "Grocery" },
          { id: "cat-4", name: "Stationery" },
        ];
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [sales, setSales] = useState<Sale[]>(() => {
    const savedSales = localStorage.getItem("billing_sales");
    return savedSales ? JSON.parse(savedSales) : [];
  });

  const [businessConfig, setBusinessConfig] = useState<BusinessConfig | null>(() => {
    const savedConfig = localStorage.getItem("billing_business_config");
    return savedConfig ? JSON.parse(savedConfig) : null;
  });

  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
      } else {
        setUid(null);
        setProducts([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem("billing_categories", JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem("billing_sales", JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem("billing_business_config", JSON.stringify(businessConfig));
  }, [businessConfig]);

  const isConfigured = !!businessConfig;

  useEffect(() => {
    if (!uid) return;

    const productsRef = ref(database, `users/${uid}/products`);
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedProducts = Object.values(data) as Product[];
        setProducts(loadedProducts);
      } else {
        setProducts([]);
      }
    });

    return () => unsubscribe();
  }, [uid]);

  const addProduct = async (product: Product) => {
    if (!uid) {
      toast.error("User not logged in");
      return;
    }

    try {
      const productRef = ref(database, `users/${uid}/products/${product.id}`);
      await set(productRef, product);
      toast.success("Product added successfully");
    } catch (error) {
      console.error("Error adding product:", error);
      toast.error("Failed to save product to database");
    }
  };

  const updateProduct = async (id: string, updatedFields: Partial<Product>) => {
    if (!uid) {
      toast.error("User not logged in");
      return;
    }

    try {
      const productRef = ref(database, `users/${uid}/products/${id}`);
      await update(productRef, updatedFields);
      toast.success("Product updated successfully");
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product in database");
    }
  };

  const deleteProduct = async (id: string) => {
    if (!uid) return;
    try {
      const productRef = ref(database, `users/${uid}/products/${id}`);
      await remove(productRef);
      toast.success("Product deleted successfully");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product from database");
    }
  };

  const addCategory = (name: string) => {
    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name,
    };
    setCategories([...categories, newCategory]);
    toast.success("Category added successfully");
  };

  const deleteCategory = (id: string) => {
    setCategories(categories.filter((category) => category.id !== id));
    toast.success("Category deleted successfully");
  };

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

  const completeSale = async (paymentMethod: string) => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    const taxRate = businessConfig?.taxRate || 0;
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * (taxRate / 100);
    const grandTotal = subtotal + tax;

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      items: [...cart],
      total: subtotal,         // ⬅️ existing field
      subtotal,                // ✅ new field added
      tax,
      grandTotal,
      date: new Date().toISOString(),
      paymentMethod,
    };

    if (uid) {
      try {
        const saleRef = ref(database, `users/${uid}/sales`);
        await push(saleRef, newSale);
        toast.success("Sale saved to Firebase");
      } catch (error) {
        console.error("Error saving sale:", error);
        toast.error("Failed to save sale to Firebase");
      }
    }

    setSales([newSale, ...sales]);
    clearCart();
    toast.success("Sale completed successfully");
  };

  const configBusiness = (config: BusinessConfig) => {
    setBusinessConfig(config);
    toast.success("Business configuration saved");
  };

  const value = {
    products,
    categories,
    cart,
    sales,
    businessConfig,
    isConfigured,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
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
