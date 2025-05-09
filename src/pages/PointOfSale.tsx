
import React, { useState } from "react";
import { useBilling } from "@/contexts/BillingContext";
import { useIsMobile } from "@/hooks/use-mobile";
import Layout from "@/components/Layout";
import CustomerInfoModal from "@/components/CustomerInfoModal";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Plus, Minus, X, Search, Package, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

const PointOfSale = () => {
  const { products, categories, cart, addToCart, updateCartItem, removeFromCart, clearCart, completeSale, businessConfig } = useBilling();
  
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [showCart, setShowCart] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "" });
  const isMobile = useIsMobile();
  
  // Filter products by category and search query
  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === "all" || product.category === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  // Calculate cart totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxRate = businessConfig?.taxRate || 0;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  
  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    
    setShowCustomerModal(true);
  };

  const handleCustomerInfoSubmit = (info: { name: string; phone: string }) => {
    setCustomerInfo(info);
    setShowCustomerModal(false);
    
    // Fix the arguments passed to completeSale
    completeSale(paymentMethod, info);
    toast.success("Payment successful! Receipt generated.");
    if (isMobile) setShowCart(false);
  };
  
  // Mobile cart toggle
  const toggleCart = () => {
    setShowCart(!showCart);
  };
  
  return (
    <Layout>
      <div className="flex flex-col lg:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-billing-dark mb-2 lg:mb-0">Point of Sale</h1>
        
        {/* Mobile cart button */}
        {isMobile && (
          <Button 
            onClick={toggleCart} 
            className="bg-billing-primary text-white flex items-center gap-2 mb-4 animate-fade-in"
          >
            <ShoppingCart size={18} />
            View Cart {cart.length > 0 && `(${cart.length})`}
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className={`${(isMobile && showCart) ? "hidden" : ""} lg:col-span-2 space-y-6`}>
          {/* Search and filter */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {/* Category tabs */}
          <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="w-full overflow-x-auto flex flex-nowrap whitespace-nowrap">
              <TabsTrigger value="all">All Products</TabsTrigger>
              {categories.map(category => (
                <TabsTrigger key={category.id} value={category.id}>
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value={activeCategory} className="mt-6">
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {filteredProducts.map(product => {
                    // TypeScript can't infer the stock property, so we'll use a type assertion
                    const productStock = (product as any).stock || 0;
                    return (
                      <Card 
                        key={product.id}
                        onClick={() => {
                          if (productStock === 0) {
                            toast.error(`${product.name} is out of stock`);
                            return;
                          }
                          addToCart(product);
                          if (isMobile) toast.success(`${product.name} added to cart`);
                        }}
                        className={`cursor-pointer hover:shadow-md transition-all duration-200 ${
                          productStock === 0 ? 'opacity-60' : 'hover:scale-105'
                        }`}
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
                          {productStock === 0 && (
                            <span className="text-xs text-red-500 mt-1">Out of stock</span>
                          )}
                          {productStock > 0 && productStock <= 5 && (
                            <span className="text-xs text-amber-500 mt-1">Low stock: {productStock}</span>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-billing-secondary">
                  {searchQuery ? 'No products match your search' : 'No products in this category'}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Cart Section */}
        <div className={`${(isMobile && !showCart) ? "hidden" : ""} space-y-6`}>
          <Card className="animate-fade-in">
            <div className="bg-billing-dark text-white p-3 md:p-4 flex justify-between items-center">
              <h2 className="text-lg md:text-xl font-bold">Current Sale</h2>
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
            
            <div className="p-3 md:p-4 max-h-[calc(100vh-350px)] overflow-y-auto">
              {cart.length > 0 ? (
                <div className="space-y-4">
                  {cart.map(item => (
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
                  Cart is empty
                </div>
              )}
            </div>
            
            <div className="border-t p-3 md:p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax ({taxRate}%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </Card>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" onClick={() => clearCart()}>
                Clear Cart
              </Button>
              <Button 
                onClick={handleCheckout} 
                disabled={cart.length === 0}
                className="bg-billing-success hover:bg-green-600 transition-colors"
              >
                Complete Sale
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <CustomerInfoModal
        open={showCustomerModal}
        onOpenChange={setShowCustomerModal}
        onSubmit={handleCustomerInfoSubmit}
      />
    </Layout>
  );
};

export default PointOfSale;
