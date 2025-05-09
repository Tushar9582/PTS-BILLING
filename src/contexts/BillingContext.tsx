
import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "@/components/ui/sonner";

// Define types
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
  addProduct: (product: Omit<Product, "id">) => void;
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
  const [products, setProducts] = useState<Product[]>(() => {
    const savedProducts = localStorage.getItem("billing_products");
    return savedProducts ? JSON.parse(savedProducts) : [];
  });

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

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem("billing_products", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem("billing_categories", JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem("billing_sales", JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem("billing_business_config", JSON.stringify(businessConfig));
  }, [businessConfig]);

  // Check if business is configured
  const isConfigured = !!businessConfig;

  // Products functions
  const addProduct = (product: Omit<Product, "id">) => {
    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}`,
    };
    setProducts([...products, newProduct]);
    toast.success("Product added successfully");
  };

  const updateProduct = (id: string, updatedFields: Partial<Product>) => {
    setProducts(
      products.map((product) =>
        product.id === id ? { ...product, ...updatedFields } : product
      )
    );
    toast.success("Product updated successfully");
  };

  const deleteProduct = (id: string) => {
    setProducts(products.filter((product) => product.id !== id));
    toast.success("Product deleted successfully");
  };

  // Category functions
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

  // Cart functions
  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
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
    setCart(
      cart.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
    toast.info("Item removed from cart");
  };

  const clearCart = () => {
    setCart([]);
  };

  // Sales functions
  const completeSale = (paymentMethod: string) => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    const taxRate = businessConfig?.taxRate || 0;
    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const tax = subtotal * (taxRate / 100);
    const grandTotal = subtotal + tax;

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      items: [...cart],
      total: subtotal,
      tax,
      grandTotal,
      date: new Date().toISOString(),
      paymentMethod,
    };

    setSales([newSale, ...sales]);
    clearCart();
    toast.success("Sale completed successfully");
  };

  // Business config function
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
