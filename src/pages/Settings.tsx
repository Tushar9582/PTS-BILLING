import AppearanceSettings from "@/components/AppearanceSettings";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useBilling } from "@/contexts/BillingContext";
import { useTheme } from "@/contexts/ThemeContext";
import { auth, database } from "@/firebase/firebaseConfig";
import CryptoJS from "crypto-js";
import { get, ref, update } from "firebase/database";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const SECRET_KEY = "your-very-secure-secret-key";

const encryptField = (val: any) => CryptoJS.AES.encrypt(val.toString(), SECRET_KEY).toString();

const decryptField = (cipherText: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (err) {
    console.error("Decryption error:", err);
    return cipherText;
  }
};

// New safe number decryption function
const decryptNumberField = (cipherText: string, defaultValue = 10) => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    const num = parseFloat(decrypted);
    return isNaN(num) ? defaultValue : num;
  } catch (err) {
    console.error("Decryption error:", err);
    return defaultValue;
  }
};

interface FormState {
  name: string;
  type: string;
  address: string;
  phone: string;
  email: string;
  taxRate: number;
  logo: string;
  gstNumber: string;
}

const Settings = () => {
  const { t, i18n } = useTranslation("setting");
  const { businessConfig, setBusinessConfig } = useBilling();
  const { buttonStyle } = useTheme();
  const navigate = useNavigate();

  const [isUploading, setIsUploading] = useState(false);
  const [isOtherType, setIsOtherType] = useState(false);

  const [formState, setFormState] = useState<FormState>({
    name: "",
    type: "cafe",
    address: "",
    phone: "",
    email: "",
    taxRate: 10,
    logo: "",
    gstNumber: "",
  });

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
  };

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language");
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);

  useEffect(() => {
    const loadDecryptedData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const snapshot = await get(ref(database, `users/${user.uid}/business`));
        if (snapshot.exists()) {
          const data = snapshot.val();

          const decrypted = {
            name: decryptField(data.name),
            type: decryptField(data.type),
            address: decryptField(data.address),
            phone: decryptField(data.phone),
            email: decryptField(data.email),
            taxRate: decryptNumberField(data.taxRate, 10), // Using safe number decryption
            logo: decryptField(data.logo),
            gstNumber: decryptField(data.gstNumber),
          };

          setFormState(decrypted);
          setIsOtherType(decrypted.type === "other");
          setBusinessConfig(decrypted);
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      }
    };

    loadDecryptedData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState({
      ...formState,
      [name]: name === "taxRate" ? 
        (value === "" ? 0 : Math.max(0, Math.min(100, parseFloat(value) || 0))) : 
        value,
    });
  };

  const handleSelectChange = (value: string) => {
    if (value === "other") {
      setIsOtherType(true);
      setFormState({ ...formState, type: "" });
    } else {
      setIsOtherType(false);
      setFormState({ ...formState, type: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formState.name.trim() || !formState.address.trim() || !formState.phone.trim()) {
      toast({
        title: t("error"),
        description: t("fill_required_fields"),
        variant: "destructive",
      });
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      // Ensure taxRate is a valid number
      const taxRate = isNaN(formState.taxRate) ? 10 : formState.taxRate;

      const encryptedConfig = {
        name: encryptField(formState.name),
        type: encryptField(formState.type),
        address: encryptField(formState.address),
        phone: encryptField(formState.phone),
        email: encryptField(formState.email),
        taxRate: encryptField(taxRate),
        logo: encryptField(formState.logo),
        gstNumber: encryptField(formState.gstNumber),
        active: true,
      };

      await update(ref(database, `users/${user.uid}/businessConfig`), encryptedConfig);
      setBusinessConfig({ ...formState, taxRate });

      toast({
        title: t("success"),
        description: t("Settings_updated"),
      });
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: t("error"),
        description: t("update_failed"),
        variant: "destructive",
      });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "quick_bill_image");

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/db0zuhgnc/image/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.secure_url) {
        setFormState((prev) => ({ ...prev, logo: data.secure_url }));
        toast({
          title: t("success"),
          description: t("logo_uploaded"),
        });
      } else {
        throw new Error("Invalid response from upload");
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast({
        title: t("error"),
        description: t("upload_failed"),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-billing-dark dark:text-white">{t("settings")}</h1>
        <div className="flex items-center space-x-2">
          <Label>{t("language")}</Label>
          <Select value={i18n.language} onValueChange={changeLanguage}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={t("language")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t("english")}</SelectItem>
              <SelectItem value="hi">{t("hindi")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="business">
        <TabsList className="mb-6">
          <TabsTrigger value="business">{t("business")}</TabsTrigger>
          <TabsTrigger value="appearance">{t("appearance")}</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card>
            <CardHeader><CardTitle>{t("business_settings")}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField name="name" label={t("Business Name")} value={formState.name} onChange={handleChange} required />
                  <div className="space-y-2">
                    <Label>{t("Business Type")}</Label>
                    <Select value={isOtherType ? "other" : formState.type} onValueChange={handleSelectChange}>
                      <SelectTrigger><SelectValue placeholder={t("select_business_type")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cafe">{t("Cafe")}</SelectItem>
                        <SelectItem value="grocery">{t("Grocery Store")}</SelectItem>
                        <SelectItem value="retail">{t("Retail Store")}</SelectItem>
                        <SelectItem value="restaurant">{t("Restaurant")}</SelectItem>
                        <SelectItem value="other">{t("Other")}</SelectItem>
                      </SelectContent>
                    </Select>
                    {isOtherType && <Input name="type" value={formState.type} onChange={handleChange} required />}
                  </div>
                  <InputField name="address" label={t("business_address")} value={formState.address} onChange={handleChange} required />
                  <InputField name="phone" label={t("phone_number")} value={formState.phone} onChange={handleChange} required inputMode="numeric" />
                  <InputField name="email" label={t("email_address")} value={formState.email} onChange={handleChange} />
                  <InputField 
                    name="taxRate" 
                    label={t("tax_rate")} 
                    type="number" 
                    value={formState.taxRate.toString()} 
                    onChange={handleChange} 
                    min="0" 
                    max="100" 
                    step="0.1"
                  />
                  <InputField name="gstNumber" label={t("gst_number")} value={formState.gstNumber} onChange={handleChange} />

                  <div className="space-y-2">
                    <Label>{t("business_logo")}</Label>
                    <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={isUploading} />
                    <Input type="url" value={formState.logo} onChange={(e) => setFormState({ ...formState, logo: e.target.value })} />
                    {formState.logo && <img src={formState.logo} alt="logo" className="h-20 mt-2" />}
                  </div>
                </div>
                <Button type="submit" variant={buttonStyle} className="w-full md:w-auto">{t("save_settings")}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceSettings />
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

interface InputFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  min?: string;
  max?: string;
  step?: string;
}

const InputField = ({ name, label, ...props }: InputFieldProps) => (
  <div className="space-y-2">
    <Label htmlFor={name}>{label}</Label>
    <Input id={name} name={name} {...props} />
  </div>
);

export default Settings;