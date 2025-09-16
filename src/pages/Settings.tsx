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
    if (!cipherText || typeof cipherText !== 'string' || cipherText.trim() === '') {
      return cipherText;
    }
    
    if (/^[A-Za-z0-9\s.,@\-_]+$/.test(cipherText)) {
      return cipherText;
    }
    
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      return cipherText;
    }
    
    return decrypted;
  } catch (err) {
    console.error("Decryption error:", err, "for value:", cipherText);
    return cipherText;
  }
};

const decryptNumberField = (cipherText: string, defaultValue = 10) => {
  try {
    const decryptedText = decryptField(cipherText);
    
    if (decryptedText === cipherText) {
      const num = parseFloat(cipherText);
      return isNaN(num) ? defaultValue : num;
    }
    
    const num = parseFloat(decryptedText);
    return isNaN(num) ? defaultValue : num;
  } catch (err) {
    console.error("Number decryption error:", err);
    return defaultValue;
  }
};

interface FormState {
  name: string;
  type: string;
  address: string;
  phone: string;
  countryCode: string;
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userEmail, setUserEmail] = useState("");

  const [formState, setFormState] = useState<FormState>({
    name: "",
    type: "cafe",
    address: "",
    phone: "",
    countryCode: "+91",
    email: "",
    taxRate: 10,
    logo: "",
    gstNumber: "",
  });

  const countryCodes = [
    { code: "+91", country: "India" },
    { code: "+1", country: "USA/Canada" },
    { code: "+44", country: "UK" },
    { code: "+61", country: "Australia" },
    { code: "+971", country: "UAE" },
    { code: "+65", country: "Singapore" },
    { code: "+60", country: "Malaysia" },
    { code: "+86", country: "China" },
    { code: "+81", country: "Japan" },
    { code: "+82", country: "South Korea" },
  ];

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
    const user = auth.currentUser;
    if (user && user.email) {
      setUserEmail(user.email);
      setFormState(prev => ({ ...prev, email: user.email || "" }));
    }
  }, []);

  useEffect(() => {
    const loadDecryptedData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const snapshot = await get(ref(database, `users/${user.uid}/businessConfig`));
        if (snapshot.exists()) {
          const data = snapshot.val();

          const decrypted = {
            name: data.name ? decryptField(data.name) : "",
            type: data.type ? decryptField(data.type) : "",
            address: data.address ? decryptField(data.address) : "",
            phone: data.phone ? decryptField(data.phone) : "",
            countryCode: data.countryCode ? decryptField(data.countryCode) : "+91",
            email: userEmail || (data.email ? decryptField(data.email) : ""),
            taxRate: data.taxRate ? decryptNumberField(data.taxRate, 10) : 10,
            logo: data.logo ? decryptField(data.logo) : "",
            gstNumber: data.gstNumber ? decryptField(data.gstNumber) : "",
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
  }, [userEmail]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formState.name.trim()) {
      newErrors.name = t("business_name_required");
    } else if (!/^[A-Za-z\s]+$/.test(formState.name)) {
      newErrors.name = t("business_name_alphabets");
    }

    if (!formState.address.trim()) {
      newErrors.address = t("address_required");
    } else if (!/^[A-Za-z0-9\s.,#-]+$/.test(formState.address)) {
      newErrors.address = t("address_alphanumeric");
    }

    if (!formState.phone.trim()) {
      newErrors.phone = t("phone_required");
    } else if (!/^\d{10}$/.test(formState.phone)) {
      newErrors.phone = t("phone_10_digits");
    }

    if (formState.email !== userEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
      newErrors.email = t("valid_email");
    }

    if (formState.gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formState.gstNumber)) {
      newErrors.gstNumber = t("valid_gst");
    }

    if (isNaN(formState.taxRate) || formState.taxRate < 0 || formState.taxRate > 100) {
      newErrors.taxRate = t("valid_tax_rate");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === "email" && userEmail && value !== userEmail) {
      return;
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }

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

  const handleCountryCodeChange = (value: string) => {
    setFormState({ ...formState, countryCode: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: t("error"),
        description: t("fix_errors"),
        variant: "destructive",
      });
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");

      const taxRate = isNaN(formState.taxRate) ? 10 : formState.taxRate;

      const encryptedConfig = {
        name: encryptField(formState.name),
        type: encryptField(formState.type),
        address: encryptField(formState.address),
        phone: encryptField(formState.phone),
        countryCode: encryptField(formState.countryCode),
        email: encryptField(userEmail),
        taxRate: encryptField(taxRate),
        logo: encryptField(formState.logo),
        gstNumber: encryptField(formState.gstNumber),
        active: true,
      };

      await update(ref(database, `users/${user.uid}/businessConfig`), encryptedConfig);
      setBusinessConfig({ ...formState, taxRate, email: userEmail });

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

    if (!file.type.startsWith('image/')) {
      toast({
        title: t("error"),
        description: t("only_images"),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t("error"),
        description: t("image_too_large"),
        variant: "destructive",
      });
      return;
    }

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
        <h1 className="text-3xl font-bold text-billing-dark dark:text-white">{t("Settings")}</h1>
        <div className="flex items-center space-x-2">
          <Label>{t("Language")}</Label>
          <Select value={i18n.language} onValueChange={changeLanguage}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={t("Language")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t("English")}</SelectItem>
              <SelectItem value="hi">{t("Hindi")}</SelectItem>
              <SelectItem value="mr">{t("Marathi")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="business">
        <TabsList className="mb-6">
          <TabsTrigger value="business">{t("Business")}</TabsTrigger>
          <TabsTrigger value="appearance">{t("Appearance")}</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card>
            <CardHeader><CardTitle>{t("Business_Settings")}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField 
                    name="name" 
                    label={t("Business Name")} 
                    value={formState.name} 
                    onChange={handleChange} 
                    required 
                    error={errors.name}
                    placeholder={t("business name placeholder")}
                  />
                  
                  <div className="space-y-2">
                    <Label>{t("Business Type")}</Label>
                    <Select value={isOtherType ? "other" : formState.type} onValueChange={handleSelectChange}>
                      <SelectTrigger><SelectValue placeholder={t("Select business type")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cafe">{t("Cafe")}</SelectItem>
                        <SelectItem value="grocery">{t("Grocery Store")}</SelectItem>
                        <SelectItem value="retail">{t("Retail Store")}</SelectItem>
                        <SelectItem value="restaurant">{t("Restaurant")}</SelectItem>
                        <SelectItem value="other">{t("Other")}</SelectItem>
                      </SelectContent>
                    </Select>
                    {isOtherType && (
                      <Input 
                        name="type" 
                        value={formState.type} 
                        onChange={handleChange} 
                        required 
                        placeholder={t("Enter business type")}
                      />
                    )}
                  </div>
                  
                  <InputField 
                    name="address" 
                    label={t("Business Address")} 
                    value={formState.address} 
                    onChange={handleChange} 
                    required 
                    error={errors.address}
                    placeholder={t("address placeholder")}
                  />
                  
                  <div className="space-y-2">
                    <Label>{t("Phone Number")}</Label>
                    <div className="flex gap-2">
                      <Select value={formState.countryCode} onValueChange={handleCountryCodeChange}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue placeholder={t("select country code")} />
                        </SelectTrigger>
                        <SelectContent>
                          {countryCodes.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.code} ({t(country.country)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        name="phone"
                        value={formState.phone}
                        onChange={handleChange}
                        required
                        inputMode="numeric"
                        placeholder={t("phone placeholder")}
                        maxLength={10}
                        className="flex-1"
                      />
                    </div>
                    {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t("Email Address")}</Label>
                    <Input
                      name="email"
                      value={userEmail || formState.email}
                      onChange={handleChange}
                      readOnly={!!userEmail}
                      className={userEmail ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed" : ""}
                      placeholder={t("email placeholder")}
                    />
                    {userEmail && (
                      <p className="text-xs text-gray-500">
                        {t("email locked")}
                      </p>
                    )}
                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                  </div>
                  
                  <InputField 
                    name="taxRate" 
                    label={t("Tax Rate")} 
                    type="number" 
                    value={formState.taxRate.toString()} 
                    onChange={handleChange} 
                    min="0" 
                    max="100" 
                    step="0.1"
                    error={errors.taxRate}
                    placeholder={t("tax rate placeholder")}
                  />
                  
                  <InputField 
                    name="gstNumber" 
                    label={t("GST Number")} 
                    value={formState.gstNumber} 
                    onChange={handleChange} 
                    error={errors.gstNumber}
                    placeholder={t("gst placeholder")}
                  />
                  
                  <div className="space-y-2">
                    <Label>{t("Business Logo")}</Label>
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoUpload} 
                      disabled={isUploading}
                      placeholder={t("upload logo")}
                    />
                    <Input 
                      type="url" 
                      value={formState.logo} 
                      onChange={(e) => setFormState({ ...formState, logo: e.target.value })} 
                      placeholder={t("logo url placeholder")}
                    />
                    {formState.logo && (
                      <div className="mt-2">
                        <img src={formState.logo} alt={t("logo alt")} className="h-20 object-contain" />
                      </div>
                    )}
                    {isUploading && <p className="text-sm text-gray-500">{t("uploading")}</p>}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <Button type="submit" variant={buttonStyle} className="w-full md:w-auto">
                    {t("Save Settings")}
                  </Button>
                </div>
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
  error?: string;
  placeholder?: string;
}

const InputField = ({ name, label, error, ...props }: InputFieldProps) => (
  <div className="space-y-2">
    <Label htmlFor={name}>{label}</Label>
    <Input id={name} name={name} {...props} />
    {error && <p className="text-sm text-red-500">{error}</p>}
  </div>
);

export default Settings;