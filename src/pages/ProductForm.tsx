import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { useBilling } from "@/contexts/BillingContext";
import { auth, database } from "@/firebase/firebaseConfig";
import PlanModal from "@/pages/PlanModal";
import CryptoJS from "crypto-js";
import { getAuth } from "firebase/auth";
import { get, onValue, push, ref, set } from "firebase/database";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

const CLOUDINARY_CLOUD_NAME = "db0zuhgnc";
const CLOUDINARY_UPLOAD_PRESET = "quick_bill_image";
const SECRET_KEY = "your-very-secure-secret-key";

const encrypt = (value: string) => {
  return CryptoJS.AES.encrypt(value, SECRET_KEY).toString();
};

const decrypt = (cipherText: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return cipherText;
  }
};

interface FormState {
  name: string;
  price: string;
  category: string;
  imageUrl: string;
}

const ProductForm = () => {
  const { t } = useTranslation("productform");
  const { productId } = useParams();
  const navigate = useNavigate();
  const { products, categories, addProduct, updateProduct } = useBilling();
  const isEditing = !!productId;

  const [formState, setFormState] = useState<FormState>({
    name: "",
    price: "",
    category: "",
    imageUrl: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productLimit, setProductLimit] = useState<number | null>(null);
  const [currentProductCount, setCurrentProductCount] = useState(0);
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    if (isEditing) {
      const product = products.find((p) => p.id === productId);
      if (product) {
        setFormState({
          name: decrypt(product.name),
          price: decrypt(product.price),
          category: decrypt(product.category),
          imageUrl: product.imageUrl ? decrypt(product.imageUrl) : "",
        });
      } else {
        toast({
          title: t("error"),
          description: t("productNotFound"),
          variant: "destructive",
        });
        navigate("/products");
      }
    }
  }, [isEditing, productId, products, navigate, t]);

  useEffect(() => {
    const checkProductLimits = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      try {
        const configRef = ref(database, `users/${user.uid}/business`);
        const configSnapshot = await get(configRef);
        const limit = configSnapshot.val()?.productLimit;
        setProductLimit(limit);

        const productsRef = ref(database, `users/${user.uid}/products`);
        const productsSnapshot = await get(productsRef);
        setCurrentProductCount(productsSnapshot.size || 0);
      } catch (error) {
        console.error("Error checking product limits:", error);
      }
    };

    checkProductLimits();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setFormState((prev) => ({ ...prev, imageUrl: "" }));
    }
  };

  const uploadImageToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );

    if (!response.ok) {
      toast({
        title: t("error"),
        description: t("uploadFailed"),
        variant: "destructive",
      });
      throw new Error("Image upload failed");
    }

    const data = await response.json();
    return data.secure_url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { name, price, category, imageUrl } = formState;

    if (!name.trim() || !price || !category) {
      toast({
        title: t("error"),
        description: t("fillAll"),
        variant: "destructive",
      });
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast({
        title: t("error"),
        description: t("validPrice"),
        variant: "destructive",
      });
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      toast({
        title: t("error"),
        description: t("notSignedIn"),
        variant: "destructive",
      });
      return;
    }

    if (!isEditing && productLimit !== null && currentProductCount >= productLimit) {
      setShowPlanModal(true);
      return;
    }

    setIsSubmitting(true);

    try {
      let finalImageUrl = imageUrl;

      if (imageFile) {
        finalImageUrl = await uploadImageToCloudinary(imageFile);
      }

      const productData = {
        name: encrypt(name.trim()),
        price: encrypt(parsedPrice.toString()),
        category: encrypt(category),
        imageUrl: encrypt(finalImageUrl),
        createdAt: new Date().toISOString(),
      };

      if (isEditing && productId) {
        updateProduct(productId, productData);
        await set(ref(database, `users/${user.uid}/products/${productId}`), {
          id: productId,
          ...productData,
        });
        toast({
          title: t("success"),
          description: t("updated"),
        });
      } else {
        const newProductRef = push(ref(database, `users/${user.uid}/products`));
        const id = newProductRef.key!;
        const productWithId = { id, ...productData };
        await set(newProductRef, productWithId);
        addProduct(productWithId);
        toast({
          title: t("success"),
          description: t("saved"),
        });
      }

      navigate("/products");
    } catch (err) {
      console.error("Error saving product:", err);
      toast({
        title: t("error"),
        description: t("saveFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
            replace: true,
          });
          toast({
            title: t("accountDisabledTitle"),
            description: t("accountDisabled"),
            variant: "destructive",
          });
        });
      }
    });

    return () => unsubscribe();
  }, [navigate, t]);

  const handlePlanSelected = (plan: string) => {
    toast.info(`${t("planSelected")}: ${plan}`);
    setShowPlanModal(false);
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-billing-dark dark:text-white">
          {isEditing ? t("titleEdit") : t("titleAdd")}
        </h1>
        {!isEditing && productLimit !== null && (
          <div className="text-sm text-gray-600">
            {t("productLimit")}: {currentProductCount}/{productLimit}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? t("formTitleEdit") : t("formTitleAdd")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">{t("productName")}</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={t("productName")}
                  value={formState.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">{t("productPrice")}</Label>
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
                <Label htmlFor="category">{t("productCategory")}</Label>
                <Select
                  value={formState.category}
                  onValueChange={(value) =>
                    setFormState((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("productCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {decrypt(cat.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">{t("productImage")}</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={!!formState.imageUrl}
                />
                <div className="text-center text-sm text-muted-foreground">
                  {t("or")}
                </div>
                <Input
                  type="text"
                  placeholder={t("pasteUrl")}
                  value={formState.imageUrl}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      imageUrl: e.target.value,
                    }))
                  }
                  disabled={!!imageFile}
                />
                {(formState.imageUrl || imageFile) && (
                  <img
                    src={
                      imageFile
                        ? URL.createObjectURL(imageFile)
                        : formState.imageUrl
                    }
                    alt={t("productImage")}
                    className="h-20 mt-2 rounded object-contain"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/products")}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? t("saving")
                  : isEditing
                  ? t("updateProduct")
                  : t("addProduct")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {showPlanModal && (
        <PlanModal
          isOpen={showPlanModal}
          onClose={() => setShowPlanModal(false)}
        />
      )}
    </Layout>
  );
};

export default ProductForm;
