
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBilling } from "@/contexts/BillingContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/utils";
import { Search, Plus, Trash, Pen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

const Products = () => {
  const { products, categories, deleteProduct } = useBilling();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();
  
  // Get category name by id
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : "Uncategorized";
  };
  
  // Filter products by search query
  const filteredProducts = searchQuery
    ? products.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getCategoryName(product.category).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;
  
  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-billing-dark mb-4 sm:mb-0">Products</h1>
        <Button onClick={() => navigate("/products/add")} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </div>
      
      <Card className="mb-8 overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search products..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {!isMobile ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{getCategoryName(product.category)}</TableCell>
                      <TableCell>{formatCurrency(product.price)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/products/edit/${product.id}`)}
                          >
                            <Pen className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-billing-danger">
                                <Trash className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{product.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-billing-danger hover:bg-red-600"
                                  onClick={() => deleteProduct(product.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-billing-secondary">
                      {searchQuery ? 'No products match your search' : 'No products found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <div className="divide-y">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => (
                  <div key={product.id} className="p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">{product.name}</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/products/edit/${product.id}`)}
                          className="h-8 w-8"
                        >
                          <Pen className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-billing-danger"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Product</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{product.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-billing-danger hover:bg-red-600"
                                onClick={() => deleteProduct(product.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="text-sm text-billing-secondary">
                      <div>Category: {getCategoryName(product.category)}</div>
                      <div className="font-medium mt-1 text-billing-primary">{formatCurrency(product.price)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-billing-secondary">
                  {searchQuery ? 'No products match your search' : 'No products found'}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </Layout>
  );
};

export default Products;
