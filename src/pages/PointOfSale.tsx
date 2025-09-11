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
import { Calculator, Minus, Package, Plus, Search, ShoppingCart, X, Star, Gift, CreditCard, Landmark, WalletCards, Banknote, Wallet } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import CalculatorPopup from "./Calculator";
import CryptoJS from "crypto-js";
import OffersPanel from "@/pages/Offerspanel"; // New component for offers

interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
    originalPrice: number; // Added to store original price in base currency
}

interface SaleTab {
    id: string;
    name: string;
    cart: CartItem[];
    discountType: 'flat' | 'percentage';
    discountValue: number;
    paymentMethod: string;
    status: 'active' | 'completed';
    appliedOffers?: string[];
    currency: string;
}

interface CustomerInfo {
    name: string;
    phone: string;
    email?: string;
    isRegular?: boolean;
    lastPurchaseDate?: string;
    purchaseCount?: number;
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
    appliedOffers?: string[];
    currency: string;
    exchangeRate?: number;
    thirdPartyPayment?: {
        provider: string;
        transactionId?: string;
        status?: string;
    };
}

interface Offer {
    id: string;
    name: string;
    description: string;
    type: 'regular' | 'combo' | 'seasonal';
    discountType: 'percentage' | 'flat';
    discountValue: number;
    applicableProducts?: string[];
    minPurchase?: number;
    validUntil?: string;
}

interface Currency {
    code: string;
    name: string;
    symbol: string;
    exchangeRate: number;
}

interface PaymentProvider {
    id: string;
    name: string;
    icon: JSX.Element;
    supportedCurrencies: string[];
    requiresSetup: boolean;
}

const STORAGE_KEYS = {
    TABS: 'pos_tabs',
    ACTIVE_TAB: 'pos_active_tab',
    CUSTOMER_INFO: 'pos_customer_info',
    OFFERS: 'pos_offers',
    CURRENCIES: 'pos_currencies',
    PAYMENT_PROVIDERS: 'pos_payment_providers'
};

const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || "your-very-secure-secret-key";

const DEFAULT_CURRENCIES: Currency[] = [
    // Asian currencies
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', exchangeRate: 1 },
    { code: 'USD', name: 'US Dollar', symbol: '$', exchangeRate: 0.012 },
    { code: 'EUR', name: 'Euro', symbol: '€', exchangeRate: 0.011 },
    { code: 'GBP', name: 'British Pound', symbol: '£', exchangeRate: 0.0095 },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', exchangeRate: 1.77 },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', exchangeRate: 0.087 },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩', exchangeRate: 16.19 },
    
    // Middle East currencies
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', exchangeRate: 0.044 },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', exchangeRate: 0.045 },
    { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼', exchangeRate: 0.044 },
    
    // European currencies
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', exchangeRate: 0.011 },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', exchangeRate: 0.13 },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', exchangeRate: 0.13 },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr', exchangeRate: 0.085 },
    { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', exchangeRate: 0.049 },
    
    // Americas currencies
    { code: 'CAD', name: 'Canadian Dollar', symbol: '$', exchangeRate: 0.016 },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$', exchangeRate: 0.20 },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', exchangeRate: 0.063 },
    { code: 'ARS', name: 'Argentine Peso', symbol: '$', exchangeRate: 10.18 },
    
    // Africa currencies
    { code: 'ZAR', name: 'South African Rand', symbol: 'R', exchangeRate: 0.23 },
    { code: 'EGP', name: 'Egyptian Pound', symbol: '£', exchangeRate: 0.37 },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', exchangeRate: 18.03 },
    
    // Oceania currencies
    { code: 'AUD', name: 'Australian Dollar', symbol: '$', exchangeRate: 0.018 },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: '$', exchangeRate: 0.020 },
    
    // Other major currencies
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', exchangeRate: 0.016 },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', exchangeRate: 0.094 },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', exchangeRate: 0.057 },
    { code: 'THB', name: 'Thai Baht', symbol: '฿', exchangeRate: 0.44 },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', exchangeRate: 193.18 },
    { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', exchangeRate: 298.12 },
    { code: 'PHP', name: 'Philippine Peso', symbol: '₱', exchangeRate: 0.70 },
    { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', exchangeRate: 3.34 },
    { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', exchangeRate: 1.32 },
    { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', exchangeRate: 3.62 },
    { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨', exchangeRate: 1.60 }
];

const PAYMENT_PROVIDERS: PaymentProvider[] = [
    {
        id: 'Stripe',
        name: 'Stripe',
        icon: <CreditCard className="h-4 w-4" />,
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'JPY', 'CHF'],
        requiresSetup: true
    },
    {
        id: 'Razorpay',
        name: 'Razorpay',
        icon: <Landmark className="h-4 w-4" />,
        supportedCurrencies: ['INR', 'USD', 'EUR', 'GBP', 'SGD', 'AED'],
        requiresSetup: true
    },
    {
        id: 'Paypal',
        name: 'PayPal',
        icon: <WalletCards className="h-4 w-4" />,
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'HKD'],
        requiresSetup: true
    },
    {
        id: 'Paytm',
        name: 'Paytm',
        icon: <WalletCards className="h-4 w-4" />,
        supportedCurrencies: ['INR'],
        requiresSetup: true
    }
];

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'upi', label: 'UPI' },
    { code: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'wallet', label: 'Wallet' },
    { value: 'credit', label: 'Credit' },
    { value: 'other', label: 'Other' },
    ...PAYMENT_PROVIDERS.map(provider => ({
        value: provider.id,
        label: provider.name,
        supportedCurrencies: provider.supportedCurrencies
    }))
];

const encryptField = (value: string): string => {
    if (!value) return value;
    return CryptoJS.AES.encrypt(value, SECRET_KEY).toString();
};

const decryptField = (encrypted: string): string => {
    if (!encrypted || typeof encrypted !== 'string') {
        return encrypted || '';
    }

    try {
        const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted || encrypted;
    } catch (err) {
        console.warn("Decryption error for field:", encrypted);
        return encrypted;
    }
};

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
    const [showOffers, setShowOffers] = useState(false);
    const [availableOffers, setAvailableOffers] = useState<Offer[]>([]);
    const [currencies, setCurrencies] = useState<Currency[]>(DEFAULT_CURRENCIES);
    const [paymentProviders, setPaymentProviders] = useState<PaymentProvider[]>(PAYMENT_PROVIDERS);
    const [showPaymentProcessing, setShowPaymentProcessing] = useState(false);
    const [currentPaymentProvider, setCurrentPaymentProvider] = useState<string | null>(null);
    const [currencySearch, setCurrencySearch] = useState('');

    const decryptedBusinessConfig = businessConfig ? {
        name: decryptField(businessConfig.name || ''),
        type: decryptField(businessConfig.type || 'Cafe'),
        address: decryptField(businessConfig.address || ''),
        phone: decryptField(businessConfig.phone || ''),
        email: decryptField(businessConfig.email || ''),
        taxRate: decryptNumberField(businessConfig.taxRate || '10', 10),
        logo: decryptField(businessConfig.logo || ''),
        gstNumber: decryptField(businessConfig.gstNumber || ''),
        upiId: decryptField(businessConfig.upiId || ''),
        bankName: decryptField(businessConfig.bankName || ''),
        accountNumber: decryptField(businessConfig.accountNumber || ''),
        ifscCode: decryptField(businessConfig.ifscCode || ''),
        active: businessConfig.active || false,
        paymentProviders: businessConfig.paymentProviders || [],
        defaultCurrency: decryptField(businessConfig.defaultCurrency || 'INR')
    } : null;

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

    const decryptedCategories = useMemo(() => {
        return categories.map(category => ({
            ...category,
            id: decryptField(category.id),
            name: decryptField(category.name),
            description: decryptField(category.description || '')
        }));
    }, [categories]);

    const filteredCurrencies = useMemo(() => {
        if (!currencySearch) return currencies;
        const searchTerm = currencySearch.toLowerCase();
        return currencies.filter(c => 
            c.code.toLowerCase().includes(searchTerm) || 
            c.name.toLowerCase().includes(searchTerm) ||
            c.symbol.toLowerCase().includes(searchTerm)
        );
    }, [currencySearch, currencies]);

    useEffect(() => {
        const today = new Date();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        const defaultOffers: Offer[] = [
            {
                id: 'regular-10',
                name: 'Regular Customer (10% Off)',
                description: '10% discount for our regular customers',
                type: 'regular',
                discountType: 'percentage',
                discountValue: 10,
                minPurchase: 100
            },
            {
                id: 'combo-1',
                name: 'Monthly Combo Special',
                description: 'Special discount on selected combo items',
                type: 'combo',
                discountType: 'percentage',
                discountValue: 15,
                applicableProducts: ['1', '3', '5'],
                validUntil: endOfMonth.toISOString()
            },
            {
                id: 'first-time-5',
                name: 'First Time Buyer',
                description: '5% off for first time customers',
                type: 'seasonal',
                discountType: 'percentage',
                discountValue: 5
            },
            {
                id: 'weekend-special',
                name: 'Weekend Special',
                description: 'Flat ₹50 off on weekends',
                type: 'seasonal',
                discountType: 'flat',
                discountValue: 50,
                validUntil: endOfMonth.toISOString()
            }
        ];

        try {
            const savedOffers = localStorage.getItem(STORAGE_KEYS.OFFERS);
            if (savedOffers) {
                const parsedOffers = JSON.parse(savedOffers);
                setAvailableOffers(parsedOffers);
            } else {
                setAvailableOffers(defaultOffers);
                localStorage.setItem(STORAGE_KEYS.OFFERS, JSON.stringify(defaultOffers));
            }
        } catch (error) {
            console.error("Failed to load offers", error);
            setAvailableOffers(defaultOffers);
        }
    }, []);

    const loadInitialState = useCallback(() => {
        try {
            const savedTabs = localStorage.getItem(STORAGE_KEYS.TABS);
            const savedActiveTab = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB);
            const savedCustomerInfo = localStorage.getItem(STORAGE_KEYS.CUSTOMER_INFO);

            if (!savedTabs) {
                const defaultTab = { 
                    id: uuidv4(), 
                    name: `${t('Sale')} 1`, 
                    cart: [], 
                    discountType: 'flat', 
                    discountValue: 0, 
                    paymentMethod: "cash",
                    status: 'active',
                    currency: decryptedBusinessConfig?.defaultCurrency || 'INR'
                };
                return {
                    tabs: [defaultTab],
                    activeTabId: defaultTab.id,
                    customerInfo: savedCustomerInfo ? JSON.parse(savedCustomerInfo) : { name: "", phone: "" }
                };
            }

            const parsedTabs = JSON.parse(savedTabs).map((tab: any) => ({
                ...tab,
                cart: tab.cart.map((item: any) => ({
                    ...item,
                    name: decryptField(item.name),
                    imageUrl: item.imageUrl ? decryptField(item.imageUrl) : undefined,
                    originalPrice: item.originalPrice || item.price // Ensure originalPrice exists
                }))
            }));

            return {
                tabs: parsedTabs,
                activeTabId: savedActiveTab || JSON.parse(savedTabs)[0].id,
                customerInfo: savedCustomerInfo ? {
                    name: decryptField(JSON.parse(savedCustomerInfo).name),
                    phone: decryptField(JSON.parse(savedCustomerInfo).phone),
                    email: JSON.parse(savedCustomerInfo).email ? decryptField(JSON.parse(savedCustomerInfo).email) : undefined,
                    isRegular: JSON.parse(savedCustomerInfo).isRegular || false,
                    lastPurchaseDate: JSON.parse(savedCustomerInfo).lastPurchaseDate,
                    purchaseCount: JSON.parse(savedCustomerInfo).purchaseCount || 0
                } : { name: "", phone: "" }
            };
        } catch (error) {
            console.error("Failed to load state from localStorage", error);
            const defaultTab = { 
                id: uuidv4(), 
                name: `${t('Sale')} 1`, 
                    cart: [], 
                    discountType: 'flat', 
                    discountValue: 0, 
                    paymentMethod: "cash",
                    status: 'active',
                    currency: decryptedBusinessConfig?.defaultCurrency || 'INR'
                };
                return {
                    tabs: [defaultTab],
                    activeTabId: defaultTab.id,
                    customerInfo: { name: "", phone: "" }
                };
            }
        }, [t, decryptedBusinessConfig]);

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
        const currentCurrency = useMemo(() => 
            currencies.find(c => c.code === activeTab?.currency) || currencies[0], 
        [currencies, activeTab]);

        // Convert price to current currency
        const convertPrice = useCallback((price: number) => {
            if (!currentCurrency) return price;
            return price * currentCurrency.exchangeRate;
        }, [currentCurrency]);

        // Create displayed products with converted prices
        const displayedProducts = useMemo(() => {
            return decryptedProducts.map(product => ({
                ...product,
                displayPrice: convertPrice(product.price)
            }));
        }, [decryptedProducts, convertPrice]);

        const filteredProducts = useMemo(() => {
            return displayedProducts.filter(product => {
                const matchesCategory = activeCategory === "all" || product.category === activeCategory;
                const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
                return matchesCategory && matchesSearch;
            });
        }, [displayedProducts, activeCategory, searchQuery]);

        useEffect(() => {
            if (!initialized) return;
            
            const encryptedTabs = tabs.map(tab => ({
                ...tab,
                cart: tab.cart.map(item => ({
                    ...item,
                    name: encryptField(item.name),
                    imageUrl: item.imageUrl ? encryptField(item.imageUrl) : undefined,
                    originalPrice: item.originalPrice || item.price // Ensure originalPrice is preserved
                }))
            }));
            
            localStorage.setItem(STORAGE_KEYS.TABS, JSON.stringify(encryptedTabs));
            localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, activeTabId);
            
            const encryptedCustomerInfo = {
                name: encryptField(customerInfo.name),
                phone: encryptField(customerInfo.phone),
                email: customerInfo.email ? encryptField(customerInfo.email) : undefined,
                isRegular: customerInfo.isRegular || false,
                lastPurchaseDate: customerInfo.lastPurchaseDate,
                purchaseCount: customerInfo.purchaseCount || 0
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
                    
                    const encryptedTab = {
                        ...activeTab,
                        cart: activeTab.cart.map(item => ({
                            ...item,
                            name: encryptField(item.name),
                            imageUrl: item.imageUrl ? encryptField(item.imageUrl) : undefined,
                            originalPrice: item.originalPrice || item.price
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
                            Title: t('AccountDisabled'),
                            description: t('AccountDisabledDescription'),
                            variant: "destructive",
                        });
                    });
                }
            });

            return () => unsubscribe();
        }, [navigate, t]);

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
            
            const newItem = {
                ...product,
                price: convertPrice(product.price), // Convert to current currency
                originalPrice: product.price // Store original price in base currency
            };

            const updatedCart = existingItem
                ? currentCart.map(item =>
                    item.id === product.id ? { 
                        ...item, 
                        quantity: item.quantity + 1,
                        price: convertPrice(item.originalPrice) // Recalculate price in case currency changed
                    } : item
                  )
                : [...currentCart, { ...newItem, quantity: 1 }];

            updateTabState(activeTab.id, { cart: updatedCart });

            if (isMobile) {
                toast({
                    Title: t('ProductAdded'),
                    description: t('ProductAddedDescription', { productName: product.name, tabName: activeTab.name }),
                    variant: "Success",
                });
            }
        }, [activeTab, isMobile, updateTabState, t, convertPrice]);

        const updateCartItem = useCallback((productId: string, quantity: number) => {
            if (!activeTab) return;

            const updatedCart = quantity <= 0
                ? activeTab.cart.filter(item => item.id !== productId)
                : activeTab.cart.map(item =>
                    item.id === productId ? { 
                        ...item, 
                        quantity,
                        price: convertPrice(item.originalPrice) // Recalculate price in case currency changed
                    } : item
                  );

            updateTabState(activeTab.id, { cart: updatedCart });
        }, [activeTab, updateTabState, convertPrice]);

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
                status: 'active',
                appliedOffers: []
            });
            toast({
                Title: t('CartCleared'),
                description: t('CartClearedDescription', { tabName: activeTab.name }),
            });
        }, [activeTab, updateTabState, t]);

        const { subtotal, tax, discountAmount, total } = useMemo(() => {
            const subtotal = activeCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
            const taxRate = decryptedBusinessConfig?.taxRate || 0;
            const tax = subtotal * (taxRate / 100);
            
            const manualDiscount = activeTab?.discountType === "percentage"
                ? subtotal * (activeTab.discountValue / 100)
                : activeTab?.discountValue || 0;
                
            let offerDiscounts = 0;
            if (activeTab?.appliedOffers && activeTab.appliedOffers.length > 0) {
                activeTab.appliedOffers.forEach(offerId => {
                    const offer = availableOffers.find(o => o.id === offerId);
                    if (offer) {
                        if (offer.type === 'regular' && !customerInfo.isRegular) return;
                        
                        if (offer.applicableProducts) {
                            const hasApplicableProducts = activeCart.some(item => 
                                offer.applicableProducts?.includes(item.id)
                            );
                            if (!hasApplicableProducts) return;
                        }
                        
                        if (offer.minPurchase && subtotal < offer.minPurchase) return;
                        
                        if (offer.validUntil && new Date(offer.validUntil) < new Date()) return;
                        
                        if (offer.discountType === 'percentage') {
                            offerDiscounts += subtotal * (offer.discountValue / 100);
                        } else {
                            offerDiscounts += convertPrice(offer.discountValue); // Convert discount to current currency
                        }
                    }
                });
            }
            
            const totalDiscount = manualDiscount + offerDiscounts;
            const total = (subtotal + tax) - totalDiscount;

            return { 
                subtotal, 
                tax, 
                discountAmount: totalDiscount,
                total 
            };
        }, [activeCart, activeTab, decryptedBusinessConfig, availableOffers, customerInfo, convertPrice]);

        const generateBillDetails = useCallback(() => {
            let billText = `${t('ReceiptFrom', { businessName: decryptedBusinessConfig?.name || t('OurStore') })}\n\n`;
            billText += `${t('Date')}: ${new Date().toLocaleDateString()}\n`;
            billText += `${t('Time')}: ${new Date().toLocaleTimeString()}\n\n`;
            billText += `${t('ItemsPurchased')}:\n`;
            
            activeCart.forEach(item => {
                billText += `${item.name} - ${item.quantity} x ${formatCurrency(item.price, currentCurrency)} = ${formatCurrency(item.price * item.quantity, currentCurrency)}\n`;
            });
            
            billText += `\n${t('Subtotal')}: ${formatCurrency(subtotal, currentCurrency)}\n`;
            billText += `${t('TaxWithRate', { rate: decryptedBusinessConfig?.taxRate || 0 })}: ${formatCurrency(tax, currentCurrency)}\n`;
            
            if (activeTab?.appliedOffers && activeTab.appliedOffers.length > 0) {
                billText += `\n${t('AppliedOffers')}:\n`;
                activeTab.appliedOffers.forEach(offerId => {
                    const offer = availableOffers.find(o => o.id === offerId);
                    if (offer) {
                        billText += `${offer.name}: ${offer.discountType === 'percentage' ? 
                            `${offer.discountValue}%` : 
                            formatCurrency(offer.discountValue, currentCurrency)}\n`;
                    }
                });
            }
            
            billText += `${t('Discount')}: ${formatCurrency(discountAmount, currentCurrency)}\n`;
            billText += `${t('Total')}: ${formatCurrency(total, currentCurrency)}\n\n`;
            billText += `${t('PaymentMethod')}: ${t(`paymentMethods:${activeTab?.paymentMethod || 'cash'}`)}\n`;
            billText += `${t('Currency')}: ${currentCurrency.code}\n`;
            
            if (customerInfo.name) {
                billText += `\n${t('Customer')}: ${customerInfo.name}\n`;
                if (customerInfo.phone) billText += `${t('Phone')}: ${customerInfo.phone}\n`;
            }
            
            billText += `\n${t('ThankYou')}`;
            
            return billText;
        }, [activeCart, activeTab, decryptedBusinessConfig, subtotal, tax, discountAmount, total, t, customerInfo, availableOffers, currentCurrency]);

        const handleCheckout = useCallback(() => {
            if (!activeTab || activeCart.length === 0) {
                toast({
                    Title: t('EmptyCartTitle'),
                    description: t('EmptyCartDescription'),
                    variant: "destructive",
                });
                return;
            }

            if (['stripe', 'razorpay', 'paypal', 'paytm'].includes(activeTab.paymentMethod)) {
                setCurrentPaymentProvider(activeTab.paymentMethod);
                setShowPaymentProcessing(true);
                return;
            }

            setShowConfirmation(true);
        }, [activeTab, activeCart, t]);

        const processThirdPartyPayment = useCallback(async (provider: string) => {
            if (!activeTab) return { success: false };

            try {
                await new Promise(resolve => setTimeout(resolve, 2000));
                return { 
                    success: true, 
                    transactionId: `txn_${Math.random().toString(36).substring(2, 10)}`
                };
            } catch (error) {
                console.error("Payment processing error:", error);
                return { success: false, error: "Payment failed" };
            }
        }, [activeTab]);

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
                    Title: t('SaleFailed'),
                    description: t('NoUserFound'),
                    variant: "destructive",
                });
                return;
            }

            const encryptedCustomerData = {
                name: customerData.name ? encryptField(customerData.name) : "",
                phone: customerData.phone ? encryptField(customerData.phone) : "",
                email: customerData.email ? encryptField(customerData.email) : "",
                isRegular: customerData.isRegular || false,
                lastPurchaseDate: new Date().toISOString(),
                purchaseCount: (customerData.purchaseCount || 0) + 1
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
                    price: item.originalPrice, // Store original price in base currency
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
                status: 'completed',
                appliedOffers: activeTab.appliedOffers,
                currency: activeTab.currency,
                exchangeRate: currentCurrency.exchangeRate,
                ...(['stripe', 'razorpay', 'paypal', 'paytm'].includes(activeTab.paymentMethod) ? {
                    thirdPartyPayment: {
                        provider: activeTab.paymentMethod,
                        transactionId: `txn_${Math.random().toString(36).substring(2, 10)}`,
                        status: 'completed'
                    }
                } : {})
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
                        ? { ...tab, cart: [], discountValue: 0, status: 'completed', appliedOffers: [] } 
                        : tab
                ));

                if (customerData.name || customerData.phone) {
                    setCustomerInfo(prev => ({
                        ...prev,
                        ...encryptedCustomerData,
                        name: customerData.name,
                        phone: customerData.phone,
                        email: customerData.email,
                        isRegular: encryptedCustomerData.isRegular,
                        lastPurchaseDate: encryptedCustomerData.lastPurchaseDate,
                        purchaseCount: encryptedCustomerData.purchaseCount
                    }));
                }

                toast({
                    Title: t('PaymentSuccess'),
                    description: t('SaleCompleted', { tabName: activeTab.name }),
                    variant: "success",
                });
                
                if (isMobile) setShowCart(false);
            } catch (error) {
                console.error("Error saving sale:", error);
                toast({
                    Title: t('SaleFailed'),
                    description: t('SaveFailed'),
                    variant: "destructive",
                });
            } finally {
                setShowConfirmation(false);
                setShowCustomerModal(false);
                setShowPaymentProcessing(false);
            }
        }, [activeTab, activeCart, subtotal, tax, discountAmount, total, decryptedBusinessConfig, isMobile, t, currentCurrency]);

        const handleCustomerInfoSubmit = useCallback(async (info: CustomerInfo) => {
            const isRegular = (info.purchaseCount || 0) >= 5;
            const updatedInfo = { ...info, isRegular };
            
            setCustomerInfo(updatedInfo);
            await processSale(updatedInfo);
        }, [processSale]);

        const toggleCart = useCallback(() => {
            setShowCart(prev => !prev);
        }, []);
        
        const handleCalculatorToggle = useCallback(() => {
            setShowCalculator(prev => !prev);
        }, []);

        const addTab = useCallback(() => {
            const newTabId = uuidv4();
            const newTabName = `${t('Sale')} ${tabs.length + 1}`;
            setTabs(prevTabs => [
                ...prevTabs,
                { 
                    id: newTabId, 
                    name: newTabName, 
                    cart: [], 
                    discountType: 'flat', 
                    discountValue: 0, 
                    paymentMethod: "cash",
                    status: 'active',
                    appliedOffers: [],
                    currency: decryptedBusinessConfig?.defaultCurrency || 'INR'
                }
            ]);
            setActiveTabId(newTabId);
        }, [tabs.length, t, decryptedBusinessConfig]);

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
                Title: t('TabClosed'),
                description: t('TabClosedDescription'),
            });
        }, [tabs.length, activeTabId, clearCart, t]);

        const applyOffer = useCallback((offerId: string) => {
            if (!activeTab) return;
            
            const offer = availableOffers.find(o => o.id === offerId);
            if (!offer) return;
            
            if (activeTab.appliedOffers?.includes(offerId)) {
                toast({
                    Title: t('OfferAlreadyApplied'),
                    description: t('OfferAlreadyAppliedDescription'),
                    variant: "default",
                });
                return;
            }
            
            if (offer.type === 'regular' && !customerInfo.isRegular) {
                toast({
                    Title: t('OfferNotApplicable'),
                    description: t('RegularCustomerOnly'),
                    variant: "destructive",
                });
                return;
            }
            
            const currentSubtotal = activeCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
            if (offer.minPurchase && currentSubtotal < offer.minPurchase) {
                toast({
                    Title: t('OfferNotApplicable'),
                    description: t('MinPurchaseRequired', { amount: formatCurrency(offer.minPurchase, currentCurrency) }),
                    variant: "destructive",
                });
                return;
            }
            
            if (offer.validUntil && new Date(offer.validUntil) < new Date()) {
                toast({
                    Title: t('OfferExpired'),
                    description: t('OfferExpiredDescription'),
                    variant: "destructive",
                });
                return;
            }
            
            if (offer.applicableProducts) {
                const hasApplicableProducts = activeCart.some(item => 
                    offer.applicableProducts?.includes(item.id)
                );
                if (!hasApplicableProducts) {
                    toast({
                        Title: t('OfferNotApplicable'),
                        description: t('OfferProductsNotInCart'),
                        variant: "destructive",
                    });
                    return;
                }
            }
            
            const updatedOffers = [...(activeTab.appliedOffers || []), offerId];
            updateTabState(activeTab.id, { appliedOffers: updatedOffers });
            
            toast({
                Title: t('OfferApplied'),
                description: t('OfferAppliedDescription', { offerName: offer.name }),
                variant: "success",
            });
        }, [activeTab, activeCart, availableOffers, customerInfo, updateTabState, t, currentCurrency]);

        const removeOffer = useCallback((offerId: string) => {
            if (!activeTab) return;
            
            const updatedOffers = activeTab.appliedOffers?.filter(id => id !== offerId) || [];
            updateTabState(activeTab.id, { appliedOffers: updatedOffers });
            
            toast({
                Title: t('OfferRemoved'),
                description: t('OfferRemovedDescription'),
                variant: "default",
            });
        }, [activeTab, updateTabState, t]);

        const changeCurrency = useCallback((currencyCode: string) => {
            if (!activeTab) return;
            const selectedCurrency = currencies.find(c => c.code === currencyCode);
            if (selectedCurrency) {
                // Update cart items with new currency prices
                const updatedCart = activeTab.cart.map(item => ({
                    ...item,
                    price: item.originalPrice * selectedCurrency.exchangeRate
                }));
                
                updateTabState(activeTab.id, { 
                    currency: currencyCode,
                    cart: updatedCart
                });
            }
        }, [activeTab, currencies, updateTabState]);

        const handleThirdPartyPayment = useCallback(async () => {
            if (!currentPaymentProvider || !activeTab) return;

            try {
                const result = await processThirdPartyPayment(currentPaymentProvider);
                
                if (result.success) {
                    setShowConfirmation(true);
                } else {
                    toast({
                        Title: t('PaymentFailed'),
                        description: t('PaymentFailedDescription'),
                        variant: "destructive",
                    });
                }
            } catch (error) {
                console.error("Payment processing error:", error);
                toast({
                    Title: t('PaymentFailed'),
                    description: t('PaymentFailedDescription'),
                    variant: "destructive",
                });
            } finally {
                setShowPaymentProcessing(false);
            }
        }, [currentPaymentProvider, activeTab, processThirdPartyPayment, t]);

        useEffect(() => {
            if (!initialized) return;
            const user = auth.currentUser;
            if (!user) return;

            const activeTabsRef = ref(database, `users/${user.uid}/activeTabs`);
            
            const unsubscribe = onValue(activeTabsRef, (snapshot) => {
                if (snapshot.exists()) {
                    const firebaseTabs = snapshot.val();
                    const loadedTabs = Object.values(firebaseTabs) as SaleTab[];
                    
                    const decryptedTabs = loadedTabs.map(tab => ({
                        ...tab,
                        cart: tab.cart.map(item => ({
                            ...item,
                            name: decryptField(item.name),
                            imageUrl: item.imageUrl ? decryptField(item.imageUrl) : undefined,
                            originalPrice: item.originalPrice || item.price
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
                <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
                    {/* <h1 className="text-3xl font-bold text-billing-dark dark:text-white">
                        {t('Title')}
                    </h1> */}
                    
                    <div className="flex gap-3 w-full lg:w-auto">
                        <Button
                            onClick={handleCalculatorToggle}
                            className="bg-indigo-600 text-white hover:bg-indigo-700 flex-1 lg:flex-none"
                            size={isMobile ? "sm" : "default"}
                        >
                            {showCalculator ? t('HideCalculator') : <Calculator size={18} />}
                        </Button>
                        
                        <Button
                            onClick={() => setShowOffers(!showOffers)}
                            className="bg-purple-600 text-white hover:bg-purple-700 flex-1 lg:flex-none"
                            size={isMobile ? "sm" : "default"}
                        >
                            {showOffers ? t('HideOffers') : <Gift size={18} />}
                        </Button>
                        
                        {isMobile && (
                            <Button 
                                onClick={toggleCart} 
                                className="bg-billing-primary text-white flex items-center gap-2 flex-1"
                                size={isMobile ? "sm" : "default"}
                            >
                                <ShoppingCart size={18} />
                                {activeCart.length > 0 ? `(${activeCart.length})` : t('Cart')}
                            </Button>
                        )}
                    </div>
                    
                    {showCalculator && <CalculatorPopup onClose={handleCalculatorToggle} />}
                </div>
                
                {showOffers && (
                    <OffersPanel
                        availableOffers={availableOffers}
                        activeTab={activeTab}
                        customerInfo={customerInfo}
                        currentCurrency={currentCurrency}
                        onClose={() => setShowOffers(false)}
                        onApplyOffer={applyOffer}
                        onRemoveOffer={removeOffer}
                        t={t}
                    />
                )}
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className={`${(isMobile && showCart) ? "hidden" : ""} lg:col-span-2 space-y-6`}>
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    placeholder={t('SearchPlaceholder')}
                                    className="pl-10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                            <TabsList className="w-full overflow-x-auto flex flex-nowrap whitespace-nowrap">
                                <TabsTrigger value="all">{t('AllProducts')}</TabsTrigger>
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
                                                    <p className="text-billing-primary font-bold">{formatCurrency(product.displayPrice, currentCurrency)}</p>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-billing-secondary">
                                        {searchQuery ? t('NoProductsFound') : t('NoProductsInCategory')}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                    
                    <div className={`${(isMobile && !showCart) ? "hidden" : ""} space-y-6`}>
                        <Card className="animate-fade-in">
                            <div className="bg-billing-dark text-white p-3 md:p-4 flex justify-between items-center">
                                <h2 className="text-lg md:text-xl font-bold">{t('CurrentSale')}</h2>
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
                            
                            <div className="border-b border-gray-200 dark:border-gray-700" >
                                <Tabs value={activeTabId} onValueChange={setActiveTabId} className="w-full">
                                    <TabsList className="w-full overflow-x-auto scrollbar-hide flex flex-nowrap whitespace-nowrap justify-start p-2" >
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

                            <div className="p-3 md:p-4 max-h-[calc(100vh-450px)] overflow-y-auto scrollbar-hide">
                                {activeCart.length > 0 ? (
                                    <div className="space-y-4">
                                        {activeCart.map(item => (
                                            <div key={item.id} className="flex justify-between items-center border-b pb-3 animate-fade-in">
                                                <div className="flex-1">
                                                    <h3 className="font-medium text-sm md:text-base">{item.name}</h3>
                                                    <p className="text-billing-secondary text-xs md:text-sm">
                                                        {formatCurrency(item.price, currentCurrency)} x {item.quantity}
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
                                        {t('EmptyCart', { tabName: activeTab?.name || t('ThisTab') })}
                                    </div>
                                )}
                            </div>
                            
                            <div className="border-t p-3 md:p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>{t('Subtotal')}</span>
                                    <span>{formatCurrency(subtotal, currentCurrency)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>{t('TaxWithRate', { rate: decryptedBusinessConfig?.taxRate || 0 })}</span>
                                    <span>{formatCurrency(tax, currentCurrency)}</span>
                                </div>
                                
                                {activeTab?.appliedOffers && activeTab.appliedOffers.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">{t('AppliedOffers')}</p>
                                        {activeTab.appliedOffers.map(offerId => {
                                            const offer = availableOffers.find(o => o.id === offerId);
                                            if (!offer) return null;
                                            
                                            return (
                                                <div key={offerId} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                                                    <span className="flex items-center gap-1">
                                                        {offer.name}
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-4 w-4 text-red-500"
                                                            onClick={() => removeOffer(offerId)}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </span>
                                                    <span className="font-medium text-billing-primary">
                                                        {offer.discountType === 'percentage' ? 
                                                            `${offer.discountValue}%` : 
                                                            formatCurrency(offer.discountValue, currentCurrency)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                            
                            <div className="flex justify-between items-center">
                                <span>{t('Discount')}</span>
                                <div className="flex gap-2">
                                    <Select
                                        value={activeTab?.discountType || "flat"}
                                        onValueChange={(val) =>
                                            activeTab && updateTabState(activeTab.id, { discountType: val as 'flat' | 'percentage' })
                                        }
                                    >
                                        <SelectTrigger className="w-[100px]">
                                            <SelectValue placeholder={t('Type')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="flat">{t('Flat')}</SelectItem>
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
                                <span>{t('DiscountAmount')}</span>
                                <span>{formatCurrency(discountAmount, currentCurrency)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg pt-2 border-t">
                                <span>{t('Total')}</span>
                                <span>{formatCurrency(total, currentCurrency)}</span>
                            </div>
                        </div>
                    </Card>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('Currency')}</label>
                            <Select 
                                value={activeTab?.currency || decryptedBusinessConfig?.defaultCurrency || 'INR'}
                                onValueChange={changeCurrency}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('SelectCurrency')} />
                                </SelectTrigger>
                                <SelectContent className="max-h-60 overflow-y-auto">
                                    <div className="px-2 pb-2">
                                        <Input
                                            placeholder={t('SearchCurrency')}
                                            value={currencySearch}
                                            onChange={(e) => setCurrencySearch(e.target.value)}
                                            className="h-8"
                                        />
                                    </div>
                                    {filteredCurrencies.map(currency => (
                                        <SelectItem 
                                            key={currency.code} 
                                            value={currency.code}
                                            className="flex items-center gap-2"
                                        >
                                            <span className="font-medium">{currency.symbol}</span>
                                            <span>{currency.code}</span>
                                            <span className="text-gray-500 ml-2">{currency.name}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('PaymentMethod')}</label>
                            <Select 
                                value={activeTab?.paymentMethod || 'cash'}
                                onValueChange={(val) => activeTab && updateTabState(activeTab.id, { paymentMethod: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_METHODS.map(method => (
                                        <SelectItem 
                                            key={method.value} 
                                            value={method.value}
                                            className="flex items-center gap-2"
                                            disabled={
                                                method.value === 'Stripe' || 
                                                method.value === 'Razorpay' || 
                                                method.value === 'Paypal' || 
                                                method.value === 'Paytm'
                                                    ? !method.supportedCurrencies?.includes(activeTab?.currency || 'INR')
                                                    : false
                                            }
                                        >
                                            {method.icon}
                                            {t(`${method.value}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {activeTab?.paymentMethod === 'upi' && (
                                <div className="border rounded p-3 bg-gray-50 mt-2 text-center">
                                    <p className="text-sm font-semibold mb-2">{t('ScanUPI')}</p>
                                    <QRCodeSVG
                                        value={`upi://pay?pa=${decryptedBusinessConfig?.upiId || 'shantanusupekar26@okicici'}&pn=${decryptedBusinessConfig?.name || 'Business'}&am=${total.toFixed(2)}&cu=${activeTab?.currency || 'INR'}`}
                                        size={160}
                                    />
                                    <p className="text-xs text-billing-secondary mt-2">
                                        {t('UPIId')}: {decryptedBusinessConfig?.upiId || 'shantanusupekar26@okicici'}
                                    </p>
                                </div>
                            )}

                            {activeTab?.paymentMethod === 'Bank_transfer' && (
                                <div className="border rounded p-3 bg-gray-50 mt-2">
                                    <p className="text-sm font-semibold mb-2">{t('BankTransferDetails')}</p>
                                    <div className="space-y-1 text-sm">
                                        <p><span className="font-medium">{t('BankName')}:</span> {decryptedBusinessConfig?.bankName || 'Your Bank Name'}</p>
                                        <p><span className="font-medium">{t('AccountNumber')}:</span> {decryptedBusinessConfig?.accountNumber || 'XXXXXXX'}</p>
                                        <p><span className="font-medium">{t('IfscCode')}:</span> {decryptedBusinessConfig?.ifscCode || 'XXXXXXX'}</p>
                                    </div>
                                </div>
                            )}

                            {paymentProviders.some(p => p.id === activeTab?.paymentMethod) && (
                                <div className="border rounded p-3 bg-gray-50 mt-2 text-center">
                                    <p className="text-sm font-semibold mb-2">
                                        {t('ThirdPartyPayment', { 
                                            provider: paymentProviders.find(p => p.id === activeTab?.paymentMethod)?.name || 'Payment Provider'
                                        })}
                                    </p>
                                    <p className="text-xs text-billing-secondary">
                                        {t('ThirdPartyPaymentDescription')}
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="outline" onClick={clearCart}>
                                {t('ClearTab')}
                            </Button>
                            <Button 
                                onClick={handleCheckout} 
                                disabled={activeCart.length === 0}
                                className="bg-billing-success hover:bg-green-600 transition-colors"
                            >
                                {t('CompleteSale')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            
            <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('AddCustomerInfo')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('CustomerInfoDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleCompleteSale(false)}>
                            {t('NoCompleteSale')}
                        </AlertDialogAction>
                        <AlertDialogAction onClick={() => handleCompleteSale(true)} className="bg-billing-primary">
                            {t('YesAddInfo')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={showPaymentProcessing} onOpenChange={setShowPaymentProcessing}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t('ProcessingPayment', { 
                                provider: paymentProviders.find(p => p.id === currentPaymentProvider)?.name || 'Payment Provider'
                            })}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('PaymentProcessingDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleThirdPartyPayment} className="bg-billing-primary">
                            {t('ConfirmPayment')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <CustomerInfoModal
                open={showCustomerModal}
                onOpenChange={setShowCustomerModal}
                onSubmit={handleCustomerInfoSubmit}
                billDetails={generateBillDetails()}
                customerInfo={customerInfo}
            />
        </Layout>
    );
};

export default PointOfSale;