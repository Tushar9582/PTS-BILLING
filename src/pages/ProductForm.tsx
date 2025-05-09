
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useBilling } from "@/contexts/BillingContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";

const ProductForm = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { products, categories, addProduct, updateProduct } = useBilling();
  const isEditing = !!productId;
  
  const [formState, setFormState] = useState({
    name: "",
    price: "",
    category: "",
    imageUrl: "",
  });
  
  // If editing, load the product data
  useEffect(() => {
    if (isEditing) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setFormState({
          name: product.name,
          price: product.price.toString(),
          category: product.category,
          imageUrl: product.imageUrl || "",
        });
      } else {
        toast.error("Product not found");
        navigate("/products");
      }
    }
  }, [isEditing, productId, products, navigate]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formState.name.trim() || !formState.price || !formState.category) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    const price = parseFloat(formState.price);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    
    if (isEditing && productId) {
      updateProduct(productId, {
        name: formState.name,
        price,
        category: formState.category,
        imageUrl: formState.imageUrl || undefined,
      });
      toast.success("Product updated successfully");
    } else {
      addProduct({
        name: formState.name,
        price,
        category: formState.category,
        imageUrl: formState.imageUrl || undefined,
      });
      toast.success("Product added successfully");
    }
    
    navigate("/products");
  };
  
  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-billing-dark">
          {isEditing ? "Edit Product" : "Add New Product"}
        </h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Product Details" : "Enter Product Details"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter product name"
                  value={formState.name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formState.price}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formState.category}
                  onValueChange={(value) => setFormState(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL (optional)</Label>
                <Input
                  id="imageUrl"
                  name="imageUrl"
                  placeholder="https://example.com/image.jpg"
                  value={formState.imageUrl}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate("/products")}>
                Cancel
              </Button>
              <Button type="submit">{isEditing ? "Update Product" : "Add Product"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default ProductForm;
