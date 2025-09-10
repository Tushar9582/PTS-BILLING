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
import { X } from "lucide-react";
import CryptoJS from "crypto-js";
import { getAuth } from "firebase/auth";
import { get, onValue, push, ref, set } from "firebase/database";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import JsBarcode from "jsbarcode";
import { saveAs } from 'file-saver';

const CLOUDINARY_CLOUD_NAME = "db0zuhgnc";
const CLOUDINARY_UPLOAD_PRESET = "quick_bill_image";
const SECRET_KEY = "your-very-secure-secret-key";

// Input sanitization function to prevent XSS
const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=\s*["'][^"']*["']/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, '');
};

const encrypt = (value: string) => {
  const sanitizedValue = sanitizeInput(value);
  return CryptoJS.AES.encrypt(sanitizedValue, SECRET_KEY).toString();
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
  const [barcodeImage, setBarcodeImage] = useState<string | null>(null);
  const [showBarcode, setShowBarcode] = useState(false);
  const [generatedBarcodeData, setGeneratedBarcodeData] = useState<string>("");

  useEffect(() => {
    if (isEditing) {
      const product = products.find((p) => p.id === productId);
      if (product) {
        setFormState({
          name: decrypt(product.name),
          price: decrypt(product.price),
          category: decrypt(product.category), // This should be the category ID
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Sanitize input to prevent XSS
    const sanitizedValue = sanitizeInput(value);
    setFormState((prev) => ({ ...prev, [name]: sanitizedValue }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;
    
    // Check if file is an image (PNG or JPG/JPEG)
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: t("error"),
        description: "Only PNG and JPG images are allowed",
        variant: "destructive",
      });
      e.target.value = ''; // Clear the file input
      return;
    }
    
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      toast({
        title: t("error"),
        description: "Image size must be less than 5MB",
        variant: "destructive",
      });
      e.target.value = ''; // Clear the file input
      return;
    }
    
    setImageFile(file);
    setFormState((prev) => ({ ...prev, imageUrl: "" }));
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

  const generateBarcode = () => {
    if (!formState.name) {
      toast({
        title: t("error"),
        description: "Please enter product name first",
        variant: "destructive",
      });
      return;
    }

    const barcodeData = `${formState.name}-${Date.now()}`;
    setGeneratedBarcodeData(barcodeData);
    
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, barcodeData, {
      format: "CODE128",
      lineColor: "#000",
      width: 2,
      height: 100,
      displayValue: true,
    });
    
    const barcodeDataUrl = canvas.toDataURL('image/png');
    setBarcodeImage(barcodeDataUrl);
    setShowBarcode(true);
  };

  const downloadBarcode = () => {
    if (barcodeImage) {
      saveAs(barcodeImage, `${formState.name}-barcode.png`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { name, price, category, imageUrl } = formState;

    // Additional XSS validation
    if (name.includes('<script>') || name.includes('javascript:') || 
        category.includes('<script>') || category.includes('javascript:')) {
      toast({
        title: t("error"),
        description: "Input contains invalid characters",
        variant: "destructive",
      });
      return;
    }

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

    setIsSubmitting(true);

    try {
      let finalImageUrl = imageUrl;

      if (imageFile) {
        finalImageUrl = await uploadImageToCloudinary(imageFile);
      }

      const productData = {
        name: encrypt(name.trim()),
        price: encrypt(parsedPrice.toString()),
        category: encrypt(category), // This should be the category ID
        imageUrl: encrypt(finalImageUrl),
        barcode: generatedBarcodeData ? encrypt(generatedBarcodeData) : "",
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
        navigate("/products");
      } else {
        const newProductRef = push(ref(database, `users/${user.uid}/products`));
        const id = newProductRef.key;
        if (!id) {
          throw new Error("Failed to generate product ID");
        }
        
        const productWithId = { id, ...productData };
        await set(newProductRef, productWithId);
        addProduct(productWithId);
        
        toast({
          title: t("success"),
          description: t("saved"),
        });

        // Reset form after successful submission
        setFormState({
          name: "",
          price: "",
          category: "",
          imageUrl: "",
        });
        setImageFile(null);
        setGeneratedBarcodeData("");
        setBarcodeImage(null);
        setShowBarcode(false);
      }
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-billing-dark dark:text-white">
            {isEditing ? t("Edit") : t("Add_Product")}
          </h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>
                {isEditing ? t("Edit") : t("Add")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <Label htmlFor="name">{t("ProductName")}</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder={t("ProductName")}
                      value={formState.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <Label htmlFor="price">{t("ProductPrice")}</Label>
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

                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <Label htmlFor="category">{t("ProductCategory")}</Label>
                    <Select
                      value={formState.category}
                      onValueChange={(value) =>
                        setFormState((prev) => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("ProductCategory")} />
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

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="image">{t("ProductImage")}</Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleImageChange}
                      disabled={!!formState.imageUrl}
                    />
                    <p className="text-xs text-muted-foreground">
                      Only PNG and JPG files are allowed (max 5MB)
                    </p>
                    <div className="text-center text-sm text-muted-foreground my-2">
                      {t("or")}
                    </div>
                    <Input
                      type="text"
                      placeholder={t("PasteUrl")}
                      value={formState.imageUrl}
                      onChange={(e) => {
                        const sanitizedValue = sanitizeInput(e.target.value);
                        setFormState((prev) => ({
                          ...prev,
                          imageUrl: sanitizedValue,
                        }))
                      }}
                      disabled={!!imageFile}
                    />
                    {(formState.imageUrl || imageFile) && (
                      <div className="mt-2 flex justify-center">
                        <img
                          src={
                            imageFile
                              ? URL.createObjectURL(imageFile)
                              : formState.imageUrl
                          }
                          alt={t("ProductImage")}
                          className="h-20 rounded object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateBarcode}
                    disabled={!formState.name}
                    className="w-full sm:w-auto"
                  >
                    Generate Barcode
                  </Button>

                  <div className="flex flex-col sm:flex-row justify-end gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/products")}
                      className="w-full sm:w-auto"
                    >
                      {t("Cancel")}
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full sm:w-auto"
                    >
                      {isSubmitting
                        ? t("saving")
                        : isEditing
                        ? t("updateProduct")
                        : t("AddProduct")}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {showBarcode && barcodeImage && (
            <Card className="w-full lg:w-80 h-fit lg:sticky lg:top-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex justify-between items-center text-lg">
                  <span>Product Barcode</span>
                  <button 
                    onClick={() => setShowBarcode(false)}
                    className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Close barcode"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 pt-0">
                <img 
                  src={barcodeImage} 
                  alt="Product Barcode" 
                  className="w-full h-auto max-h-40 object-contain"
                />
                <Button 
                  variant="outline" 
                  onClick={downloadBarcode}
                  className="w-full"
                >
                  Download Barcode
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProductForm;