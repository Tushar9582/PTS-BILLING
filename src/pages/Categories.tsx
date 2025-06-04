import React, { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Plus, Trash } from "lucide-react";
import { database } from "@/firebase/firebaseConfig";
import { ref, set, push, remove } from "firebase/database"; // ✅ NOTE: `remove` is imported here
import { getAuth } from "firebase/auth";

const Categories = () => {
  const { categories, addCategory, deleteCategory, products } = useBilling();
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    const categoryExists = categories.some(
      cat => cat.name.toLowerCase() === newCategoryName.toLowerCase()
    );

    if (categoryExists) {
      toast.error("A category with this name already exists");
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    const categoryRef = ref(database, `users/${user.uid}/categories`);
    const newCategoryRef = push(categoryRef);
    const id = newCategoryRef.key!;

    try {
      await set(newCategoryRef, {
        id,
        name: newCategoryName
      });

      addCategory(newCategoryName);
      setNewCategoryName("");
      toast.success("Category added successfully");
    } catch (err) {
      toast.error("Failed to save category to database");
      console.error(err);
    }
  };

  const getProductCount = (categoryId: string) => {
    return products.filter(product => product.category === categoryId).length;
  };

  const canDeleteCategory = (categoryId: string) => {
    return getProductCount(categoryId) === 0;
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-billing-dark">Categories</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>All Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length > 0 ? (
                    categories.map(category => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>{getProductCount(category.id)}</TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-billing-danger"
                                disabled={!canDeleteCategory(category.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{category.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-billing-danger hover:bg-red-600"
                                  onClick={async () => {
                                    try {
                                      const auth = getAuth();
                                      const user = auth.currentUser;
                                      if (!user) {
                                        toast.error("User not authenticated");
                                        return;
                                      }

                                      const categoryRef = ref(database, `users/${user.uid}/categories/${category.id}`);
                                      await remove(categoryRef); // ✅ Correct method to delete category

                                      deleteCategory(category.id); // Local state update
                                      toast.success("Category deleted successfully");
                                    } catch (err) {
                                      toast.error("Failed to delete category");
                                      console.error(err);
                                    }
                                  }}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-billing-secondary">
                        No categories found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Add New Category</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="categoryName">Category Name</Label>
                  <Input
                    id="categoryName"
                    placeholder="Enter category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full">
                  <Plus className="mr-2 h-4 w-4" /> Add Category
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Category Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-billing-secondary space-y-2">
              <p>• Categories help organize your products</p>
              <p>• Categories with products cannot be deleted</p>
              <p>• Well-organized categories speed up sales</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Categories;
