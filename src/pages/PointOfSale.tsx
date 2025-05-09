
import React, { useState } from "react";
import { useBilling } from "@/contexts/BillingContext";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Plus, Minus, X, Search, Package } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const PointOfSale = () => {
  const { products, categories, cart, addToCart, updateCartItem, removeFromCart, clearCart, completeSale, businessConfig } = useBilling();
  
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  
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
    
    completeSale(paymentMethod);
    toast.success("Payment successful! Receipt generated.");
  };
  
  return (
    <Layout>
      <h1 className="text-3xl font-bold text-billing-dark mb-6">Point of Sale</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-6">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredProducts.map(product => (
                    <Card 
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4 flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name} 
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <Package className="h-8 w-8 text-billing-secondary" />
                          )}
                        </div>
                        <h3 className="font-medium text-center truncate w-full">{product.name}</h3>
                        <p className="text-billing-primary font-bold">{formatCurrency(product.price)}</p>
                      </CardContent>
                    </Card>
                  ))}
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
        <div className="space-y-6">
          <Card>
            <div className="bg-billing-dark text-white p-4">
              <h2 className="text-xl font-bold">Current Sale</h2>
            </div>
            
            <div className="p-4 max-h-[calc(100vh-350px)] overflow-y-auto">
              {cart.length > 0 ? (
                <div className="space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center border-b pb-3">
                      <div className="flex-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-billing-secondary text-sm">
                          {formatCurrency(item.price)} x {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateCartItem(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span>{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateCartItem(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-billing-danger"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <X className="h-4 w-4" />
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
            
            <div className="border-t p-4 space-y-2">
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
              <Button onClick={handleCheckout} disabled={cart.length === 0}>
                Complete Sale
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PointOfSale;
