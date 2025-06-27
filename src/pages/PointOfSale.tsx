import CustomerInfoModal from "@/components/CustomerInfoModal";
import Layout from "@/components/Layout";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useBilling } from "@/contexts/BillingContext";
import { auth, database } from "@/firebase/firebaseConfig";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency } from "@/lib/utils";
import { get, onValue, ref, set } from "firebase/database";
import { Calculator, Minus, Package, Plus, Search, ShoppingCart, X } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import CalculatorPopup from "./Calculator";
import CryptoJS from "crypto-js";

interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
}

interface SaleTab {
    id: string;
    name: string;
    cart: CartItem[];
    discountType: 'flat' | 'percentage';
    discountValue: number;
    paymentMethod: string;
    status: 'active' | 'completed';
}

interface CustomerInfo {
    name: string;
    phone: string;
    email?: string;
}

interface SaleData {
    id: string;
    date: string;
    customer: CustomerInfo;
    customerName: string;
    customerPhone: string;
    items: {
        id: string;
        name: string;
        price: number;
        quantity: number;
    }[];
    subtotal: number;
    tax: number;
    discountAmount: number;
    grandTotal: number;
    paymentMethod: string;
    businessName: string;
    tabName?: string;
    userId: string;
    status: 'active' | 'completed';
}

const STORAGE_KEYS = {
    TABS: 'pos_tabs',
    ACTIVE_TAB: 'pos_active_tab',
    CUSTOMER_INFO: 'pos_customer_info'
};

const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || "your-very-secure-secret-key";

// Encryption function
const encryptField = (value: string): string => {
    if (!value) return value;
    return CryptoJS.AES.encrypt(value, SECRET_KEY).toString();
};

// Improved decryption function with better error handling
const decryptField = (encrypted: string): string => {
    if (!encrypted || typeof encrypted !== 'string') {
        return encrypted || '';
    }

    try {
        const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted || encrypted; // Return original if decryption fails but doesn't throw
    } catch (err) {
        console.warn("Decryption error for field:", encrypted);
        return encrypted; // Return original value if decryption fails
    }
};

// Safe number decryption with fallback
const decryptNumberField = (encrypted: string, defaultValue = 0): number => {
    const decrypted = decryptField(encrypted);
    const num = parseFloat(decrypted);
    return isNaN(num) ? defaultValue : num;
};

const PointOfSale = () => {
    const { t } = useTranslation(['pos', 'common', 'paymentMethods']);
    const { products, categories, businessConfig } = useBilling();
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    const [initialized, setInitialized] = useState(false);
    const [tabs, setTabs] = useState<SaleTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string>("");
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({ name: "", phone: "" });
    const [searchQuery, setSearchQuery] = useState("");
    const [showCart, setShowCart] = useState(false);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string>("all");

    // Decrypt business config
    const decryptedBusinessConfig = businessConfig ? {
        name: decryptField(businessConfig.name || ''),
        type: decryptField(businessConfig.type || 'cafe'),
        address: decryptField(businessConfig.address || ''),
        phone: decryptField(businessConfig.phone || ''),
        email: decryptField(businessConfig.email || ''),
        taxRate: decryptNumberField(businessConfig.taxRate || '10', 10),
        logo: decryptField(businessConfig.logo || ''),
        gstNumber: decryptField(businessConfig.gstNumber || ''),
        upiId: decryptField(businessConfig.upiId || ''),
        active: businessConfig.active || false
    } : null;

    // Decrypt products
    const decryptedProducts = useMemo(() => {
        return products.map(product => ({
            ...product,
            id: decryptField(product.id),
            name: decryptField(product.name),
            category: decryptField(product.category),
            description: decryptField(product.description || ''),
            price: decryptNumberField(product.price.toString()),
            imageUrl: decryptField(product.imageUrl || '')
        }));
    }, [products]);

    // Decrypt categories
    const decryptedCategories = useMemo(() => {
        return categories.map(category => ({
            ...category,
            id: decryptField(category.id),
            name: decryptField(category.name),
            description: decryptField(category.description || '')
        }));
    }, [categories]);

    const loadInitialState = useCallback(() => {
        try {
            const savedTabs = localStorage.getItem(STORAGE_KEYS.TABS);
            const savedActiveTab = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB);
            const savedCustomerInfo = localStorage.getItem(STORAGE_KEYS.CUSTOMER_INFO);

            if (!savedTabs) {
                const defaultTab = { 
                    id: uuidv4(), 
                    name: `${t('pos:sale')} 1`, 
                    cart: [], 
                    discountType: 'flat', 
                    discountValue: 0, 
                    paymentMethod: "cash",
                    status: 'active'
                };
                return {
                    tabs: [defaultTab],
                    activeTabId: defaultTab.id,
                    customerInfo: savedCustomerInfo ? JSON.parse(savedCustomerInfo) : { name: "", phone: "" }
                };
            }

            // Decrypt cart items in tabs
            const parsedTabs = JSON.parse(savedTabs).map((tab: any) => ({
                ...tab,
                cart: tab.cart.map((item: any) => ({
                    ...item,
                    name: decryptField(item.name),
                    imageUrl: item.imageUrl ? decryptField(item.imageUrl) : undefined
                }))
            }));

            return {
                tabs: parsedTabs,
                activeTabId: savedActiveTab || JSON.parse(savedTabs)[0].id,
                customerInfo: savedCustomerInfo ? {
                    name: decryptField(JSON.parse(savedCustomerInfo).name),
                    phone: decryptField(JSON.parse(savedCustomerInfo).phone),
                    email: JSON.parse(savedCustomerInfo).email ? decryptField(JSON.parse(savedCustomerInfo).email) : undefined
                } : { name: "", phone: "" }
            };
        } catch (error) {
            console.error("Failed to load state from localStorage", error);
            const defaultTab = { 
                id: uuidv4(), 
                name: `${t('pos:sale')} 1`, 
                cart: [], 
                discountType: 'flat', 
                discountValue: 0, 
                paymentMethod: "cash",
                status: 'active'
            };
            return {
                tabs: [defaultTab],
                activeTabId: defaultTab.id,
                customerInfo: { name: "", phone: "" }
            };
        }
    }, [t]);

    useEffect(() => {
        if (!initialized) {
            const initialState = loadInitialState();
            setTabs(initialState.tabs);
            setActiveTabId(initialState.activeTabId);
            setCustomerInfo(initialState.customerInfo);
            setInitialized(true);
        }
    }, [initialized, loadInitialState]);

    const activeTab = useMemo(() => tabs.find(tab => tab.id === activeTabId), [tabs, activeTabId]);
    const activeCart = activeTab?.cart || [];

    useEffect(() => {
        if (!initialized) return;
        
        // Encrypt data before saving to localStorage
        const encryptedTabs = tabs.map(tab => ({
            ...tab,
            cart: tab.cart.map(item => ({
                ...item,
                name: encryptField(item.name),
                imageUrl: item.imageUrl ? encryptField(item.imageUrl) : undefined
            }))
        }));
        
        localStorage.setItem(STORAGE_KEYS.TABS, JSON.stringify(encryptedTabs));
        localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, activeTabId);
        
        const encryptedCustomerInfo = {
            name: encryptField(customerInfo.name),
            phone: encryptField(customerInfo.phone),
            email: customerInfo.email ? encryptField(customerInfo.email) : undefined
        };
        localStorage.setItem(STORAGE_KEYS.CUSTOMER_INFO, JSON.stringify(encryptedCustomerInfo));
    }, [tabs, activeTabId, customerInfo, initialized]);

    useEffect(() => {
        if (!initialized || !activeTab) return;
        const user = auth.currentUser;
        if (!user) return;

        const saveActiveTabToFirebase = async () => {
            try {
                const activeTabRef = ref(database, `users/${user.uid}/activeTabs/${activeTab.id}`);
                
                // Encrypt cart items before saving to Firebase
                const encryptedTab = {
                    ...activeTab,
                    cart: activeTab.cart.map(item => ({
                        ...item,
                        name: encryptField(item.name),
                        imageUrl: item.imageUrl ? encryptField(item.imageUrl) : undefined
                    })),
                    lastUpdated: new Date().toISOString()
                };
                
                await set(activeTabRef, encryptedTab);
            } catch (error) {
                console.error("Error saving active tab to Firebase:", error);
            }
        };

        saveActiveTabToFirebase();
    }, [activeTab, initialized]);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const userRef = ref(database, `users/${user.uid}/business/active`);
        
        const unsubscribe = onValue(userRef, (snapshot) => {
            const isActive = snapshot.exists() ? snapshot.val() : false;
            
            if (!isActive) {
                auth.signOut().then(() => {
                    navigate("/login", {
                        state: { accountDisabled: true },
                        replace: true
                    });
                    toast({
                        title: t('common:accountDisabled'),
                        description: t('common:accountDisabledDescription'),
                        variant: "destructive",
                    });
                });
            }
        });

        return () => unsubscribe();
    }, [navigate, t]);

    const filteredProducts = useMemo(() => {
        return decryptedProducts.filter(product => {
            const matchesCategory = activeCategory === "all" || product.category === activeCategory;
            const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [decryptedProducts, activeCategory, searchQuery]);

    const updateTabState = useCallback((tabId: string, newState: Partial<SaleTab>) => {
        setTabs(prevTabs => {
            return prevTabs.map(tab => {
                if (tab.id !== tabId) return tab;
                const updatedTab = { ...tab, ...newState };
                if (JSON.stringify(tab) === JSON.stringify(updatedTab)) return tab;
                return updatedTab;
            });
        });
    }, []);

    const addToCart = useCallback((product: any) => {
        if (!activeTab) return;

        const currentCart = activeTab.cart || [];
        const existingItem = currentCart.find(item => item.id === product.id);
        
        const updatedCart = existingItem
            ? currentCart.map(item =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
              )
            : [...currentCart, { ...product, quantity: 1 }];

        updateTabState(activeTab.id, { cart: updatedCart });

        if (isMobile) {
            toast({
                title: t('pos:productAdded'),
                description: t('pos:productAddedDescription', { productName: product.name, tabName: activeTab.name }),
                variant: "success",
            });
        }
    }, [activeTab, isMobile, updateTabState, t]);

    const updateCartItem = useCallback((productId: string, quantity: number) => {
        if (!activeTab) return;

        const updatedCart = quantity <= 0
            ? activeTab.cart.filter(item => item.id !== productId)
            : activeTab.cart.map(item =>
                item.id === productId ? { ...item, quantity } : item
              );

        updateTabState(activeTab.id, { cart: updatedCart });
    }, [activeTab, updateTabState]);

    const removeFromCart = useCallback((productId: string) => {
        if (!activeTab) return;
        const updatedCart = activeTab.cart.filter(item => item.id !== productId);
        updateTabState(activeTab.id, { cart: updatedCart });
    }, [activeTab, updateTabState]);

    const clearCart = useCallback(() => {
        if (!activeTab) return;
        updateTabState(activeTab.id, { 
            cart: [], 
            discountType: 'flat', 
            discountValue: 0, 
            paymentMethod: 'cash',
            status: 'active'
        });
        toast({
            title: t('pos:cartCleared'),
            description: t('pos:cartClearedDescription', { tabName: activeTab.name }),
        });
    }, [activeTab, updateTabState, t]);

    const { subtotal, tax, discountAmount, total } = useMemo(() => {
        const subtotal = activeCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const taxRate = decryptedBusinessConfig?.taxRate || 0;
        const tax = subtotal * (taxRate / 100);
        const discountAmount = activeTab?.discountType === "percentage"
            ? subtotal * (activeTab.discountValue / 100)
            : activeTab?.discountValue || 0;
        const total = (subtotal + tax) - discountAmount;

        return { subtotal, tax, discountAmount, total };
    }, [activeCart, activeTab, decryptedBusinessConfig]);

const generateBillDetails = useCallback(() => {
    let billText = `${t('pos:receiptFrom', { businessName: decryptedBusinessConfig?.name || t('pos:ourStore') })}\n\n`;
    billText += `${t('common:date')}: ${new Date().toLocaleDateString()}\n`;
    billText += `${t('common:time')}: ${new Date().toLocaleTimeString()}\n\n`;
    billText += `${t('pos:itemsPurchased')}:\n`;  // Fixed: removed the extra quote
    
    activeCart.forEach(item => {
        billText += `${item.name} - ${item.quantity} x ${formatCurrency(item.price)} = ${formatCurrency(item.price * item.quantity)}\n`;
    });
    
    billText += `\n${t('common:subtotal')}: ${formatCurrency(subtotal)}\n`;
    billText += `${t('pos:taxWithRate', { rate: decryptedBusinessConfig?.taxRate || 0 })}: ${formatCurrency(tax)}\n`;
    billText += `${t('common:discount')}: ${formatCurrency(discountAmount)}\n`;
    billText += `${t('common:total')}: ${formatCurrency(total)}\n\n`;
    billText += `${t('pos:paymentMethod')}: ${activeTab?.paymentMethod?.toUpperCase() || t('paymentMethods:cash')}\n`;
    billText += `${t('pos:thankYou')}`;
    
    return billText;
}, [activeCart, activeTab, decryptedBusinessConfig, subtotal, tax, discountAmount, total, t]);

    const handleCheckout = useCallback(() => {
        if (!activeTab || activeCart.length === 0) {
            toast({
                title: t('pos:emptyCartTitle'),
                description: t('pos:emptyCartDescription'),
                variant: "destructive",
            });
            return;
        }
        setShowConfirmation(true);
    }, [activeTab, activeCart, t]);

    const handleCompleteSale = useCallback(async (collectCustomerInfo: boolean) => {
        if (!activeTab) return;

        if (collectCustomerInfo) {
            setShowCustomerModal(true);
            return;
        }

        await processSale({ name: "", phone: "" });
    }, [activeTab]);

    const processSale = useCallback(async (customerData: CustomerInfo) => {
        if (!activeTab) return;

        const transactionId = uuidv4();
        const user = auth.currentUser;

        if (!user) {
            console.error("No authenticated user found");
            toast({
                title: t('pos:saleFailed'),
                description: t('pos:noUserFound'),
                variant: "destructive",
            });
            return;
        }

        // Encrypt customer data
        const encryptedCustomerData = {
            name: encryptField(customerData.name),
            phone: encryptField(customerData.phone),
            email: customerData.email ? encryptField(customerData.email) : undefined
        };

        const saleData: SaleData = {
            id: transactionId,
            date: new Date().toISOString(),
            customer: encryptedCustomerData,
            customerName: encryptedCustomerData.name,
            customerPhone: encryptedCustomerData.phone,
            items: activeCart.map(item => ({
                id: item.id,
                name: encryptField(item.name),
                price: item.price,
                quantity: item.quantity,
            })),
            subtotal,
            tax,
            discountAmount,
            grandTotal: total,
            paymentMethod: activeTab.paymentMethod || 'cash',
            businessName: encryptField(decryptedBusinessConfig?.name || ""),
            tabName: encryptField(activeTab.name),
            userId: user.uid,
            status: 'completed'
        };

        try {
            const salesRef = ref(database, `sales/${transactionId}`);
            await set(salesRef, saleData);

            const userSalesRef = ref(database, `users/${user.uid}/sales/${transactionId}`);
            await set(userSalesRef, saleData);

            const userSalesByDateRef = ref(database, `users/${user.uid}/salesByDate/${new Date().toISOString().split('T')[0]}/${transactionId}`);
            await set(userSalesByDateRef, saleData);

            await Promise.all(activeCart.map(async (item) => {
                const productSalesRef = ref(database, `products/${item.id}/sales`);
                const snapshot = await get(productSalesRef);
                const currentSales = snapshot.exists() ? snapshot.val() : 0;
                await set(productSalesRef, currentSales + item.quantity);
            }));

            const activeTabRef = ref(database, `users/${user.uid}/activeTabs/${activeTab.id}`);
            await set(activeTabRef, null);

            setTabs(prevTabs => prevTabs.map(tab => 
                tab.id === activeTab.id 
                    ? { ...tab, cart: [], discountValue: 0, status: 'completed' } 
                    : tab
            ));

            toast({
                title: t('pos:paymentSuccess'),
                description: t('pos:saleCompleted', { tabName: activeTab.name }),
                variant: "success",
            });
            
            if (isMobile) setShowCart(false);
        } catch (error) {
            console.error("Error saving sale:", error);
            toast({
                title: t('pos:saleFailed'),
                description: t('pos:saveFailed'),
                variant: "destructive",
            });
        } finally {
            setShowConfirmation(false);
            setShowCustomerModal(false);
        }
    }, [activeTab, activeCart, subtotal, tax, discountAmount, total, decryptedBusinessConfig, isMobile, t]);

    const handleCustomerInfoSubmit = useCallback(async (info: CustomerInfo) => {
        setCustomerInfo(info);
        await processSale(info);
    }, [processSale]);

    const toggleCart = useCallback(() => {
        setShowCart(prev => !prev);
    }, []);
    
    const handleCalculatorToggle = useCallback(() => {
        setShowCalculator(prev => !prev);
    }, []);

    const addTab = useCallback(() => {
        const newTabId = uuidv4();
        const newTabName = `${t('pos:sale')} ${tabs.length + 1}`;
        setTabs(prevTabs => [
            ...prevTabs,
            { 
                id: newTabId, 
                name: newTabName, 
                cart: [], 
                discountType: 'flat', 
                discountValue: 0, 
                paymentMethod: "cash",
                status: 'active'
            }
        ]);
        setActiveTabId(newTabId);
    }, [tabs.length, t]);

    const removeTab = useCallback(async (tabIdToRemove: string) => {
        if (tabs.length === 1) {
            clearCart();
            return;
        }

        const tabToRemove = tabs.find(tab => tab.id === tabIdToRemove);
        const user = auth.currentUser;

        if (user && tabToRemove) {
            try {
                const activeTabRef = ref(database, `users/${user.uid}/activeTabs/${tabToRemove.id}`);
                await set(activeTabRef, null);
            } catch (error) {
                console.error("Error removing tab from Firebase:", error);
            }
        }

        setTabs(prevTabs => {
            const remainingTabs = prevTabs.filter(tab => tab.id !== tabIdToRemove);
            if (activeTabId === tabIdToRemove) {
                setActiveTabId(remainingTabs[0]?.id || "");
            }
            return remainingTabs;
        });

        toast({
            title: t('pos:tabClosed'),
            description: t('pos:tabClosedDescription'),
        });
    }, [tabs.length, activeTabId, clearCart, t]);

    useEffect(() => {
        if (!initialized) return;
        const user = auth.currentUser;
        if (!user) return;

        const activeTabsRef = ref(database, `users/${user.uid}/activeTabs`);
        
        const unsubscribe = onValue(activeTabsRef, (snapshot) => {
            if (snapshot.exists()) {
                const firebaseTabs = snapshot.val();
                const loadedTabs = Object.values(firebaseTabs) as SaleTab[];
                
                // Decrypt cart items from Firebase
                const decryptedTabs = loadedTabs.map(tab => ({
                    ...tab,
                    cart: tab.cart.map(item => ({
                        ...item,
                        name: decryptField(item.name),
                        imageUrl: item.imageUrl ? decryptField(item.imageUrl) : undefined
                    }))
                }));
                
                setTabs(prevTabs => {
                    const firebaseTabIds = loadedTabs.map(t => t.id);
                    const localTabIds = prevTabs.map(t => t.id);
                    
                    if (firebaseTabIds.length === localTabIds.length && 
                        firebaseTabIds.every(id => localTabIds.includes(id))) {
                        return prevTabs;
                    }
                    
                    return decryptedTabs;
                });
            }
        });

        return () => unsubscribe();
    }, [initialized]);

    return (
        <Layout>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-billing-dark dark:text-white">
                    {t('pos:title')}
                </h1>
                
                <div className="flex gap-3 w-full lg:w-auto">
                    <Button
                        onClick={handleCalculatorToggle}
                        className="bg-indigo-600 text-white hover:bg-indigo-700 flex-1 lg:flex-none"
                        size={isMobile ? "sm" : "default"}
                    >
                        {showCalculator ? t('common:hideCalculator') : <Calculator size={18} />}
                    </Button>
                    
                    {isMobile && (
                        <Button 
                            onClick={toggleCart} 
                            className="bg-billing-primary text-white flex items-center gap-2 flex-1"
                            size={isMobile ? "sm" : "default"}
                        >
                            <ShoppingCart size={18} />
                            {activeCart.length > 0 ? `(${activeCart.length})` : t('common:cart')}
                        </Button>
                    )}
                </div>
                
                {showCalculator && <CalculatorPopup onClose={handleCalculatorToggle} />}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Products Section */}
                <div className={`${(isMobile && showCart) ? "hidden" : ""} lg:col-span-2 space-y-6`}>
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder={t('pos:searchPlaceholder')}
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                        <TabsList className="w-full overflow-x-auto flex flex-nowrap whitespace-nowrap">
                            <TabsTrigger value="all">{t('pos:allProducts')}</TabsTrigger>
                            {decryptedCategories.map(category => (
                                <TabsTrigger key={category.id} value={category.id}>
                                    {category.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                        
                        <TabsContent value={activeCategory} className="mt-6">
                            {filteredProducts.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                                    {filteredProducts.map(product => (
                                        <Card 
                                            key={product.id}
                                            onClick={() => addToCart(product)}
                                            className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
                                        >
                                            <CardContent className="p-3 md:p-4 flex flex-col items-center">
                                                <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                                    {product.imageUrl ? (
                                                        <img 
                                                            src={product.imageUrl} 
                                                            alt={product.name} 
                                                            className="w-full h-full object-cover rounded-full"
                                                        />
                                                    ) : (
                                                        <Package className="h-6 w-6 md:h-8 md:w-8 text-billing-secondary" />
                                                    )}
                                                </div>
                                                <h3 className="font-medium text-center truncate w-full text-sm md:text-base">{product.name}</h3>
                                                <p className="text-billing-primary font-bold">{formatCurrency(product.price)}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-billing-secondary">
                                    {searchQuery ? t('pos:noProductsFound') : t('pos:noProductsInCategory')}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
                
                {/* Cart Section */}
                <div className={`${(isMobile && !showCart) ? "hidden" : ""} space-y-6`}>
                    <Card className="animate-fade-in">
                        <div className="bg-billing-dark text-white p-3 md:p-4 flex justify-between items-center">
                            <h2 className="text-lg md:text-xl font-bold">{t('pos:currentSale')}</h2>
                            {isMobile && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={toggleCart} 
                                    className="text-white hover:bg-billing-dark"
                                >
                                    <X size={18} />
                                </Button>
                            )}
                        </div>
                        
                        {/* Sale Tabs */}
                        <div className="border-b border-gray-200 dark:border-gray-700">
                            <Tabs value={activeTabId} onValueChange={setActiveTabId} className="w-full">
                                <TabsList className="w-full overflow-x-auto flex flex-nowrap whitespace-nowrap justify-start p-2">
                                    {tabs.map(tab => (
                                        <TabsTrigger key={tab.id} value={tab.id} className="group relative pr-8">
                                            {tab.name}
                                            {tabs.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeTab(tab.id);
                                                    }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </TabsTrigger>
                                    ))}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="ml-2 h-8 w-8 text-billing-primary hover:bg-billing-primary/10"
                                        onClick={addTab}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </TabsList>
                            </Tabs>
                        </div>

                        <div className="p-3 md:p-4 max-h-[calc(100vh-450px)] overflow-y-auto">
                            {activeCart.length > 0 ? (
                                <div className="space-y-4">
                                    {activeCart.map(item => (
                                        <div key={item.id} className="flex justify-between items-center border-b pb-3 animate-fade-in">
                                            <div className="flex-1">
                                                <h3 className="font-medium text-sm md:text-base">{item.name}</h3>
                                                <p className="text-billing-secondary text-xs md:text-sm">
                                                    {formatCurrency(item.price)} x {item.quantity}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 md:gap-3">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-6 w-6 md:h-7 md:w-7"
                                                    onClick={() => updateCartItem(item.id, item.quantity - 1)}
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="text-sm md:text-base w-4 text-center">{item.quantity}</span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-6 w-6 md:h-7 md:w-7"
                                                    onClick={() => updateCartItem(item.id, item.quantity + 1)}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 md:h-7 md:w-7 text-billing-danger"
                                                    onClick={() => removeFromCart(item.id)}
                                                >
                                                    <X className="h-3 w-3 md:h-4 md:w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-billing-secondary">
                                    {t('pos:emptyCart', { tabName: activeTab?.name || t('common:thisTab') })}
                                </div>
                            )}
                        </div>
                        
                        <div className="border-t p-3 md:p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>{t('common:subtotal')}</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>{t('pos:taxWithRate', { rate: decryptedBusinessConfig?.taxRate || 0 })}</span>
                                <span>{formatCurrency(tax)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>{t('common:discount')}</span>
                                <div className="flex gap-2">
                                    <Select
                                        value={activeTab?.discountType || "flat"}
                                        onValueChange={(val) =>
                                            activeTab && updateTabState(activeTab.id, { discountType: val as 'flat' | 'percentage' })
                                        }
                                    >
                                        <SelectTrigger className="w-[100px]">
                                            <SelectValue placeholder={t('common:type')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="flat">{t('common:flat')}</SelectItem>
                                            <SelectItem value="percentage">%</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        value={activeTab?.discountValue ?? 0}
                                        onChange={(e) =>
                                            activeTab && updateTabState(activeTab.id, { discountValue: Number(e.target.value) })
                                        }
                                        className="w-20"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>{t('common:discountAmount')}</span>
                                <span>{formatCurrency(discountAmount)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg pt-2 border-t">
                                <span>{t('common:total')}</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                        </div>
                    </Card>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('pos:paymentMethod')}</label>
                            <Select 
                                value={activeTab?.paymentMethod || 'cash'}
                                onValueChange={(val) => activeTab && updateTabState(activeTab.id, { paymentMethod: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">{t('paymentMethods:cash')}</SelectItem>
                                    <SelectItem value="card">{t('paymentMethods:card')}</SelectItem>
                                    <SelectItem value="upi">{t('paymentMethods:upi')}</SelectItem>
                                </SelectContent>
                            </Select>

                            {activeTab?.paymentMethod === 'upi' && (
                                <div className="border rounded p-3 bg-gray-50 mt-2 text-center">
                                    <p className="text-sm font-semibold mb-2">{t('pos:scanUPI')}</p>
                                    <QRCodeSVG
                                        value={`upi://pay?pa=${decryptedBusinessConfig?.upiId || 'shantanusupekar26@okicici'}&pn=${decryptedBusinessConfig?.name || 'Business'}&am=${total.toFixed(2)}&cu=INR`}
                                        size={160}
                                    />
                                    <p className="text-xs text-billing-secondary mt-2">
                                        {t('pos:upiId')}: {decryptedBusinessConfig?.upiId || 'shantanusupekar26@okicici'}
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="outline" onClick={clearCart}>
                                {t('common:clearTab')}
                            </Button>
                            <Button 
                                onClick={handleCheckout} 
                                disabled={activeCart.length === 0}
                                className="bg-billing-success hover:bg-green-600 transition-colors"
                            >
                                {t('pos:completeSale')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Confirmation Dialog */}
            <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('pos:addCustomerInfo')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('pos:customerInfoDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleCompleteSale(false)}>
                            {t('pos:noCompleteSale')}
                        </AlertDialogAction>
                        <AlertDialogAction onClick={() => handleCompleteSale(true)} className="bg-billing-primary">
                            {t('pos:yesAddInfo')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <CustomerInfoModal
                open={showCustomerModal}
                onOpenChange={setShowCustomerModal}
                onSubmit={handleCustomerInfoSubmit}
                billDetails={generateBillDetails()}
            />
        </Layout>
    );
};

export default PointOfSale;