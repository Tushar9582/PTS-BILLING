import Layout from "@/components/Layout";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { useBilling } from "@/contexts/BillingContext";
import { auth, database } from "@/firebase/firebaseConfig";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency } from "@/lib/utils";
import { X } from "lucide-react";
import CryptoJS from "crypto-js";
import { onValue, ref } from "firebase/database";
import { Pen, Plus, Search, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Barcode } from "@/components/ui/barcode";

const SECRET_KEY = "your-very-secure-secret-key";

const decrypt = (cipherText: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8) || cipherText;
  } catch {
    return cipherText;
  }
};

const Products = () => {
  const { t } = useTranslation("product");
  const { products, categories, deleteProduct, updateProduct } = useBilling();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    price: "",
    category: "",
    barcode: ""
  });

  const getCategoryName = (encryptedCategoryId: string) => {
    const category = categories.find(cat => decrypt(cat.id) === decrypt(encryptedCategoryId));
    return category ? decrypt(category.name) : t('uncategorized');
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/auth/login");
      return;
    }

    const userRef = ref(database, `users/${user.uid}/business/active`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (!snapshot.exists() || !snapshot.val()) {
        auth.signOut().then(() => {
          navigate("/auth/login", { state: { accountDisabled: true }, replace: true });
          toast({
            title: t('account_disabled'),
            description: t('account_disabled_message'),
            variant: "destructive",
          });
        });
      }
    });
    return () => unsubscribe();
  }, [navigate, t]);

  const handleAddProduct = () => {
    navigate("/products/add");
  };

const handleEditClick = (product: any) => {
  setEditingProduct(product);
  setEditFormData({
    name: decrypt(product.name),
    price: decrypt(product.price),
    category: decrypt(product.category), // ✅ Decrypt category for correct selection
    barcode: decrypt(product.barcode || "")
  });
};


  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveEdit = () => {
    if (!editingProduct) return;
    
    const updatedProduct = {
      ...editingProduct,
      name: editFormData.name,
      price: editFormData.price,
      category: editFormData.category,
      barcode: editFormData.barcode
    };

    updateProduct(editingProduct.id, updatedProduct);
    
    toast({
      title: "Product updated",
      description: `${editFormData.name} has been updated successfully`,
    });
    setEditingProduct(null);
  };

  const filteredProducts = searchQuery
    ? products.filter(product =>
        decrypt(product.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
        getCategoryName(product.category).toLowerCase().includes(searchQuery.toLowerCase()) ||
        decrypt(product.barcode || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  return (
    <Layout>
      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Edit Product</h2>
                <button 
                  onClick={() => setEditingProduct(null)}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Product Name</label>
                  <Input
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditFormChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Price</label>
                  <Input
                    name="price"
                    type="number"
                    value={editFormData.price}
                    onChange={handleEditFormChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                 <select
  name="category"
  value={editFormData.category}
  onChange={(e) => setEditFormData(prev => ({...prev, category: e.target.value}))}
  className="w-full p-2 border rounded"
>
  <option value="">{t('Uncategorized')}</option>
  {categories.map(category => (
    <option 
      key={category.id} 
      value={decrypt(category.id)} // ✅ Decrypt here
    >
      {decrypt(category.name)}
    </option>
  ))}
</select>

                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Barcode</label>
                  <Input
                    name="barcode"
                    value={editFormData.barcode}
                    onChange={handleEditFormChange}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setEditingProduct(null)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-billing-dark dark:text-white">
          {t('Products')}
        </h1>

        <Button onClick={handleAddProduct} className=" sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> {t('Add_Product')}
        </Button>
      </div>

      <Card className="mb-8 overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={t('Search_products')}
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
                  <TableHead>{t('Name')}</TableHead>
                  <TableHead>{t('Category')}</TableHead>
                  <TableHead>{t('Barcode')}</TableHead>
                  <TableHead>{t('Price')}</TableHead>
                  <TableHead className="text-right">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{decrypt(product.name)}</TableCell>
                      <TableCell>{getCategoryName(product.category)}</TableCell>
                      <TableCell>
                        {product.barcode && (
                          <div className="flex items-center gap-2">
                            <Barcode value={decrypt(product.barcode)} width={1.5} height={40} />
                            <span className="text-sm text-gray-500">{decrypt(product.barcode)}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(parseFloat(decrypt(product.price)))}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(product)}
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
                                <AlertDialogTitle>{t('Delete_product')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('Confirm_delete', { name: decrypt(product.name) })}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-billing-danger hover:bg-red-600"
                                  onClick={() => deleteProduct(product.id)}
                                >
                                  {t('Delete')}
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
                    <TableCell colSpan={5} className="text-center py-8 text-billing-secondary">
                      {searchQuery ? t('no_products_search') : t('No_products')}
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
                      <h3 className="font-medium">{decrypt(product.name)}</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(product)}
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
                              <AlertDialogTitle>{t('Delete_product')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('Confirm_delete', { name: decrypt(product.name) })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-billing-danger hover:bg-red-600"
                                onClick={() => deleteProduct(product.id)}
                              >
                                {t('Delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="text-sm text-billing-secondary">
                      <div>{t('Category')}: {getCategoryName(product.category)}</div>
                      {product.barcode && (
                        <div className="mt-2">
                          <div className="font-medium mb-1">{t('Barcode')}:</div>
                          <div className="flex items-center gap-2">
                            <Barcode value={decrypt(product.barcode)} width={1} height={30} />
                            <span className="text-xs">{decrypt(product.barcode)}</span>
                          </div>
                        </div>
                      )}
                      <div className="font-medium mt-2 text-billing-primary">
                        {t('Price')}: {formatCurrency(parseFloat(decrypt(product.price)))}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-billing-secondary">
                  {searchQuery ? t('no_products_search') : t('no_products')}
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