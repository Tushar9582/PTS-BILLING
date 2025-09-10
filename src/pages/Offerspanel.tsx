import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Star, Calendar, Tag, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Offer, SaleTab, CustomerInfo, Currency, CartItem } from "@/pages/PointOfSale";

interface OffersPanelProps {
    availableOffers: Offer[];
    activeTab: SaleTab | undefined;
    customerInfo: CustomerInfo;
    currentCurrency: Currency;
    onClose: () => void;
    onApplyOffer: (offerId: string) => void;
    onRemoveOffer: (offerId: string) => void;
    onAddToCart: (productId: string, quantity?: number) => void;
    t: (key: string, options?: any) => string;
}

const OffersPanel = ({
    availableOffers,
    activeTab,
    customerInfo,
    currentCurrency,
    onClose,
    onApplyOffer,
    onRemoveOffer,
    onAddToCart,
    t
}: OffersPanelProps) => {
    // Check if required products are in cart for product-specific offers
    const isProductInCart = (offer: Offer): boolean => {
        if (!offer.applicableProducts || offer.applicableProducts.length === 0) {
            return true; // No product restrictions
        }
        
        if (!activeTab || !activeTab.cart || activeTab.cart.length === 0) {
            return false; // No items in cart
        }
        
        return offer.applicableProducts.some(productId => 
            activeTab.cart.some((item: CartItem) => item.productId === productId)
        );
    };

    // Check if minimum purchase requirement is met
    const isMinPurchaseMet = (offer: Offer): boolean => {
        if (!offer.minPurchase) return true;
        
        const cartTotal = activeTab?.cart?.reduce((total: number, item: CartItem) => {
            return total + (item.price * item.quantity);
        }, 0) || 0;
        
        return cartTotal >= offer.minPurchase;
    };

    // Check if all combo products are in cart for monthly combo offers
    const isComboComplete = (offer: Offer): boolean => {
        if (offer.type !== 'monthly' || !offer.comboProducts || offer.comboProducts.length === 0) {
            return true; // Not a combo offer or no combo products specified
        }
        
        if (!activeTab || !activeTab.cart || activeTab.cart.length === 0) {
            return false; // No items in cart
        }
        
        // Check if all combo products are in the cart
        return offer.comboProducts.every(comboProduct => 
            activeTab.cart.some((item: CartItem) => item.productId === comboProduct.productId)
        );
    };

    // Add combo products to cart
    const handleAddComboProducts = (offer: Offer) => {
        if (!offer.comboProducts || offer.comboProducts.length === 0) return;
        
        offer.comboProducts.forEach(comboProduct => {
            // Check if product is already in cart
            const isInCart = activeTab?.cart?.some(item => item.productId === comboProduct.productId);
            
            if (!isInCart) {
                onAddToCart(comboProduct.productId, comboProduct.quantity || 1);
            }
        });
    };

    return (
        <div className="mb-6 animate-fade-in">
            <Card>
                <div className="bg-purple-700 text-white p-3 md:p-4 flex justify-between items-center">
                    <h2 className="text-lg md:text-xl font-bold">{t('AvailableOffers')}</h2>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={onClose} 
                        className="text-white hover:bg-purple-800"
                    >
                        <X size={18} />
                    </Button>
                </div>
                
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {availableOffers.map(offer => {
                        const isApplied = activeTab?.appliedOffers?.includes(offer.id);
                        const isExpired = offer.validUntil ? new Date(offer.validUntil) < new Date() : false;
                        const isRegularOnly = offer.type === 'regular' && !customerInfo.isRegular;
                        const isMonthlyOnly = offer.type === 'monthly' && !customerInfo.isMonthly;
                        const isProductNotInCart = !isProductInCart(offer);
                        const isMinPurchaseNotMet = !isMinPurchaseMet(offer);
                        const isComboIncomplete = offer.type === 'monthly' && offer.comboProducts && !isComboComplete(offer);
                        const isDisabled = isExpired || isRegularOnly || isMonthlyOnly || isProductNotInCart || isMinPurchaseNotMet || isComboIncomplete;
                        
                        return (
                            <Card key={offer.id} className={`relative ${isExpired || isDisabled ? 'opacity-60' : ''}`}>
                                <CardContent className="p-4 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold">{offer.name}</h3>
                                        <div className="flex items-center">
                                            {offer.type === 'regular' && (
                                                <Star className="h-4 w-4 text-yellow-500" fill="currentColor" />
                                            )}
                                            {offer.type === 'monthly' && (
                                                <Calendar className="h-4 w-4 text-blue-500" fill="currentColor" />
                                            )}
                                            {(offer.applicableProducts && offer.applicableProducts.length > 0) && (
                                                <Tag className="h-4 w-4 text-green-500 ml-1" />
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600">{offer.description}</p>
                                    
                                    {/* Combo products section for monthly offers */}
                                    {offer.type === 'monthly' && offer.comboProducts && offer.comboProducts.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold">{t('comboIncludes')}:</p>
                                            <ul className="text-xs text-gray-500 space-y-1">
                                                {offer.comboProducts.map((comboProduct, index) => {
                                                    const isInCart = activeTab?.cart?.some(item => item.productId === comboProduct.productId);
                                                    return (
                                                        <li key={index} className={`flex justify-between items-center ${isInCart ? 'text-green-600' : ''}`}>
                                                            <span>{comboProduct.name}</span>
                                                            {!isInCart && (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="h-5 w-5 p-0"
                                                                    onClick={() => onAddToCart(comboProduct.productId, comboProduct.quantity || 1)}
                                                                >
                                                                    <Plus size={12} />
                                                                </Button>
                                                            )}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                            {isComboIncomplete && (
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="w-full text-xs"
                                                    onClick={() => handleAddComboProducts(offer)}
                                                >
                                                    {t('addAllComboProducts')}
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-billing-primary">
                                            {offer.discountType === 'percentage' ? 
                                                `${offer.discountValue}%` : 
                                                formatCurrency(offer.discountValue || 0, currentCurrency)}
                                        </span>
                                        {isApplied ? (
                                            <Button 
                                                variant="destructive" 
                                                size="sm" 
                                                onClick={() => onRemoveOffer(offer.id)}
                                            >
                                                {t('Remove')}
                                            </Button>
                                        ) : (
                                            <Button 
                                                variant="default" 
                                                size="sm" 
                                                onClick={() => onApplyOffer(offer.id)}
                                                disabled={isDisabled}
                                            >
                                                {t('Apply')}
                                            </Button>
                                        )}
                                    </div>
                                    
                                    {offer.minPurchase !== undefined && (
                                        <p className={`text-xs ${isMinPurchaseNotMet ? 'text-red-500' : 'text-gray-500'}`}>
                                            {t('minPurchase')}: {formatCurrency(offer.minPurchase, currentCurrency)}
                                        </p>
                                    )}
                                    
                                    {offer.validUntil && (
                                        <p className={`text-xs ${isExpired ? 'text-red-500' : 'text-gray-500'}`}>
                                            {t('validUntil')}: {new Date(offer.validUntil).toLocaleDateString()}
                                        </p>
                                    )}
                                    
                                    {offer.applicableProducts && offer.applicableProducts.length > 0 && !offer.comboProducts && (
                                        <p className={`text-xs ${isProductNotInCart ? 'text-red-500' : 'text-gray-500'}`}>
                                            {t('productSpecificOffer')}
                                        </p>
                                    )}
                                    
                                    {(isRegularOnly || isMonthlyOnly) && (
                                        <p className="text-xs text-red-500">
                                            {offer.type === 'regular' 
                                                ? t('regularCustomerOnly') 
                                                : t('monthlyCustomerOnly')}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
};

export default OffersPanel;