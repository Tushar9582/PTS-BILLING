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
  const [userEmail, setUserEmail] = useState(""); // Store the authenticated user's email

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
    // Get the authenticated user's email
    const user = auth.currentUser;
    if (user && user.email) {
      setUserEmail(user.email);
      // Set the email in form state
      setFormState(prev => ({ ...prev, email: user.email || "" }));
    }
  }, []);

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
            countryCode: data.countryCode ? decryptField(data.countryCode) : "+91",
            email: userEmail || decryptField(data.email), // Use authenticated user's email
            taxRate: decryptNumberField(data.taxRate, 10),
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
  }, [userEmail]); // Reload when userEmail is available

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Business Name validation - only alphabets and spaces
    if (!formState.name.trim()) {
      newErrors.name = t("business_name_required");
    } else if (!/^[A-Za-z\s]+$/.test(formState.name)) {
      newErrors.name = t("business_name_alphabets");
    }

    // Address validation - alphanumeric with common punctuation
    if (!formState.address.trim()) {
      newErrors.address = t("address_required");
    } else if (!/^[A-Za-z0-9\s.,#-]+$/.test(formState.address)) {
      newErrors.address = t("address_alphanumeric");
    }

    // Phone validation - exactly 10 digits
    if (!formState.phone.trim()) {
      newErrors.phone = t("phone_required");
    } else if (!/^\d{10}$/.test(formState.phone)) {
      newErrors.phone = t("phone_10_digits");
    }

    // Email validation - only if it's different from the authenticated user's email
    if (formState.email !== userEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email)) {
      newErrors.email = t("valid_email");
    }

    // GST Number validation (Indian format)
    if (formState.gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formState.gstNumber)) {
      newErrors.gstNumber = t("valid_gst");
    }

    // Tax Rate validation
    if (isNaN(formState.taxRate) || formState.taxRate < 0 || formState.taxRate > 100) {
      newErrors.taxRate = t("valid_tax_rate");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Don't allow editing the email field if it's the authenticated user's email
    if (name === "email" && userEmail && value !== userEmail) {
      return;
    }
    
    // Clear error when user starts typing
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
        email: encryptField(userEmail), // Always use the authenticated user's email
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t("error"),
        description: t("only_images"),
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
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

  const goToSubscriptionPage = () => {
    navigate("/subscriptions");
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
                    placeholder="e.g. My Business"
                  />
                  
                  <div className="space-y-2">
                    <Label>{t("Business Type")}</Label>
                    <Select value={isOtherType ? "other" : formState.type} onValueChange={handleSelectChange}>
                      <SelectTrigger><SelectValue placeholder={t("Select_business_type")} /></SelectTrigger>
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
                        placeholder={t("Enter_business_type")}
                      />
                    )}
                  </div>
                  
                  <InputField 
                    name="address" 
                    label={t("Business_address")} 
                    value={formState.address} 
                    onChange={handleChange} 
                    required 
                    error={errors.address}
                    placeholder="e.g. 123 Main St, City"
                  />
                  
                  <div className="space-y-2">
                    <Label>{t("Phone_number")}</Label>
                    <div className="flex gap-2">
                      <Select value={formState.countryCode} onValueChange={handleCountryCodeChange}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countryCodes.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.code} ({country.country})
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
                        placeholder="1234567890"
                        maxLength={10}
                        className="flex-1"
                      />
                    </div>
                    {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t("Email_address")}</Label>
                    <Input
                      name="email"
                      value={userEmail || formState.email}
                      onChange={handleChange}
                      readOnly={!!userEmail}
                      className={userEmail ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed" : ""}
                      placeholder="business@example.com"
                    />
                    {userEmail && (
                      <p className="text-xs text-gray-500">
                        {t("email_locked") || "Email is locked to your account email"}
                      </p>
                    )}
                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                  </div>
                  
                  <InputField 
                    name="taxRate" 
                    label={t("Tax_rate")} 
                    type="number" 
                    value={formState.taxRate.toString()} 
                    onChange={handleChange} 
                    min="0" 
                    max="100" 
                    step="0.1"
                    error={errors.taxRate}
                    placeholder="0-100"
                  />
                  
                  <InputField 
                    name="gstNumber" 
                    label={t("Gst_number")} 
                    value={formState.gstNumber} 
                    onChange={handleChange} 
                    error={errors.gstNumber}
                    placeholder="e.g. 12ABCDE1234F1Z5"
                  />
                  
                  <div className="space-y-2">
                    <Label>{t("Business_logo")}</Label>
                    <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoUpload} 
                      disabled={isUploading} 
                    />
                    <Input 
                      type="url" 
                      value={formState.logo} 
                      onChange={(e) => setFormState({ ...formState, logo: e.target.value })} 
                      placeholder="Or enter image URL"
                    />
                    {formState.logo && (
                      <div className="mt-2">
                        <img src={formState.logo} alt="logo" className="h-20 object-contain" />
                      </div>
                    )}
                    {isUploading && <p className="text-sm text-gray-500">{t("uploading")}</p>}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <Button type="submit" variant={buttonStyle} className="w-full md:w-auto">
                    {t("Save_settings")}
                  </Button>
                  {/* <Button type="button" variant="outline" onClick={goToSubscriptionPage}>
                    {t("Manage Subscriptions")}
                  </Button> */}
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