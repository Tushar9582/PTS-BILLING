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
import CryptoJS from "crypto-js";
import { onValue, ref } from "firebase/database";
import { Pen, Plus, Search, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

// Encryption key
const SECRET_KEY = "your-very-secure-secret-key";

// AES Decrypt function
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
  const { products, categories, deleteProduct } = useBilling();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();

  // Correct category match by decrypting both ids
  const getCategoryName = (encryptedCategoryId: string) => {
    const category = categories.find(cat => decrypt(cat.id) === decrypt(encryptedCategoryId));
    return category ? decrypt(category.name) : t('uncategorized');
  };

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
            title: t('account_disabled'),
            description: t('account_disabled_message'),
            variant: "destructive",
          });
        });
      }
    });

    return () => unsubscribe();
  }, [navigate, t]);

  const filteredProducts = searchQuery
    ? products.filter(product =>
        decrypt(product.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
        getCategoryName(product.category).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-billing-dark dark:text-white">
          {t('products')}
        </h1>

        <Button onClick={() => navigate("/products/add")} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> {t('add_product')}
        </Button>
      </div>

      <Card className="mb-8 overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={t('search_products')}
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
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('category')}</TableHead>
                  <TableHead>{t('price')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{decrypt(product.name)}</TableCell>
                      <TableCell>{getCategoryName(product.category)}</TableCell>
                      <TableCell>{formatCurrency(parseFloat(decrypt(product.price)))}</TableCell>
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
                                <AlertDialogTitle>{t('delete_product')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('confirm_delete', { name: decrypt(product.name) })}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-billing-danger hover:bg-red-600"
                                  onClick={() => deleteProduct(product.id)}
                                >
                                  {t('delete')}
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
                      {searchQuery ? t('no_products_search') : t('no_products')}
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
                              <AlertDialogTitle>{t('delete_product')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('confirm_delete', { name: decrypt(product.name) })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-billing-danger hover:bg-red-600"
                                onClick={() => deleteProduct(product.id)}
                              >
                                {t('delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="text-sm text-billing-secondary">
                      <div>{t('category')}: {getCategoryName(product.category)}</div>
                      <div className="font-medium mt-1 text-billing-primary">
                        {formatCurrency(parseFloat(decrypt(product.price)))}
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
