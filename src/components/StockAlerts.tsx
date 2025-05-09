
import React, { useState } from "react";
import { AlertCircle, AlertTriangle, X, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBilling } from "@/contexts/BillingContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { useTheme } from "@/contexts/ThemeContext";
import { Product } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const StockAlerts: React.FC = () => {
  const { products, updateProduct } = useBilling();
  const { buttonStyle } = useTheme();
  const isMobile = useIsMobile();
  const [showDialog, setShowDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newStock, setNewStock] = useState<number>(0);
  const [dialogContent, setDialogContent] = useState<{
    title: string;
    products: Product[];
    variant: "danger" | "warning";
  }>({
    title: "",
    products: [],
    variant: "warning"
  });
  
  // Type assertion is no longer needed as we've fixed the Product interface
  const outOfStockProducts = products.filter(product => product.stock === 0);
  const lowStockProducts = products.filter(product => product.stock > 0 && product.stock <= 5);
  
  if (outOfStockProducts.length === 0 && lowStockProducts.length === 0) {
    return null;
  }
  
  const handleViewAll = (type: "out" | "low") => {
    if (type === "out") {
      setDialogContent({
        title: "Out of Stock Products",
        products: outOfStockProducts,
        variant: "danger"
      });
    } else {
      setDialogContent({
        title: "Low Stock Products",
        products: lowStockProducts,
        variant: "warning"
      });
    }
    setShowDialog(true);
  };

  const handleUpdateStock = (product: Product) => {
    setSelectedProduct(product);
    setNewStock(product.stock || 0);
    setShowUpdateDialog(true);
  };

  const saveStockUpdate = () => {
    if (selectedProduct && newStock >= 0) {
      updateProduct({
        ...selectedProduct,
        stock: newStock
      });
      toast.success(`Updated ${selectedProduct.name} stock to ${newStock}`);
      setShowUpdateDialog(false);
      
      // Refresh the dialog content if it's still open
      if (showDialog) {
        const updatedType = dialogContent.variant === "danger" ? "out" : "low";
        handleViewAll(updatedType);
      }
    }
  };
  
  return (
    <>
      <Card className={`bg-white dark:bg-gray-800 dark:text-white ${isMobile ? 'mb-4' : ''} animate-fade-in`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <AlertTriangle size={18} className="text-billing-danger" />
            Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {outOfStockProducts.length > 0 && (
            <div className="p-2 bg-red-50 border border-red-100 rounded-md dark:bg-red-900/30 dark:border-red-800">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300 flex items-center gap-1.5">
                <AlertCircle size={14} />
                Out of Stock ({outOfStockProducts.length})
              </h3>
              <ul className="mt-1 pl-5 text-xs text-red-700 dark:text-red-200 list-disc">
                {outOfStockProducts.slice(0, 3).map(product => (
                  <li key={product.id} className="flex items-center justify-between">
                    <span>{product.name}</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 px-2 text-red-600 dark:text-red-300 hover:text-red-700 dark:hover:text-red-200"
                      onClick={() => handleUpdateStock(product)}
                    >
                      <RefreshCw size={12} className="mr-1" /> Update
                    </Button>
                  </li>
                ))}
                {outOfStockProducts.length > 3 && (
                  <li className="cursor-pointer hover:underline" onClick={() => handleViewAll("out")}>
                    + {outOfStockProducts.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )}
          
          {lowStockProducts.length > 0 && (
            <div className="p-2 bg-amber-50 border border-amber-100 rounded-md dark:bg-amber-900/30 dark:border-amber-800">
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <AlertTriangle size={14} />
                Low Stock ({lowStockProducts.length})
              </h3>
              <ul className="mt-1 pl-5 text-xs text-amber-700 dark:text-amber-200 list-disc">
                {lowStockProducts.slice(0, 3).map(product => (
                  <li key={product.id} className="flex items-center justify-between">
                    <span>{product.name} ({product.stock} left)</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 px-2 text-amber-600 dark:text-amber-300 hover:text-amber-700 dark:hover:text-amber-200"
                      onClick={() => handleUpdateStock(product)}
                    >
                      <RefreshCw size={12} className="mr-1" /> Update
                    </Button>
                  </li>
                ))}
                {lowStockProducts.length > 3 && (
                  <li className="cursor-pointer hover:underline" onClick={() => handleViewAll("low")}>
                    + {lowStockProducts.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px] dark:bg-gray-800 dark:text-white">
          <DialogHeader>
            <DialogTitle className={
              dialogContent.variant === "danger" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
            }>
              {dialogContent.title}
            </DialogTitle>
            <DialogDescription className="dark:text-gray-300">
              These items require your attention
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b dark:border-gray-700">
                  <th className="p-2">Product Name</th>
                  <th className="p-2 text-right">Stock</th>
                  <th className="p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {dialogContent.products.map(product => (
                  <tr key={product.id} className="border-b dark:border-gray-700">
                    <td className="p-2">{product.name}</td>
                    <td className="p-2 text-right">
                      <span className={
                        product.stock === 0 
                          ? "text-red-600 dark:text-red-400 font-medium"
                          : "text-amber-600 dark:text-amber-400 font-medium"
                      }>
                        {product.stock === 0 ? "Out of stock" : `${product.stock} left`}
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      <Button 
                        size="sm"
                        variant={buttonStyle === "default" ? "outline" : buttonStyle}
                        onClick={() => handleUpdateStock(product)} 
                        className="h-7"
                      >
                        <RefreshCw size={12} className="mr-1" /> Update
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => {
                toast.success("Stock report generated");
                setShowDialog(false);
              }}
              className="mt-2"
              variant={buttonStyle === "default" ? "default" : buttonStyle}
            >
              Export Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Stock Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="sm:max-w-[400px] dark:bg-gray-800 dark:text-white">
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
            <DialogDescription className="dark:text-gray-300">
              {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Stock: {selectedProduct?.stock}</label>
              <Input
                type="number"
                min="0"
                value={newStock}
                onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                className="dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => setShowUpdateDialog(false)} 
              variant="outline"
              className="dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveStockUpdate} 
              variant={buttonStyle === "default" ? "default" : buttonStyle}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StockAlerts;
