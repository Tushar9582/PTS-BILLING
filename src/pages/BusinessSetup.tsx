import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useBilling } from "@/contexts/BillingContext";
import CryptoJS from "crypto-js";
import { ref, update, get } from "firebase/database";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, database } from "../firebase/firebaseConfig";

const SECRET_KEY = "your-very-secure-secret-key";

const encrypt = (value: string) => {
  return CryptoJS.AES.encrypt(value, SECRET_KEY).toString();
};

const BusinessSetup = () => {
  const navigate = useNavigate();
  const { setBusinessConfig, businessConfig } = useBilling();
  const [uploading, setUploading] = React.useState(false);
  const [isOtherType, setIsOtherType] = React.useState(
    businessConfig?.type === "other"
  );
  const [userData, setUserData] = useState<any>(null);

  // Fetch user data from Firebase on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userRef = ref(database, `users/${user.uid}`);
          const snapshot = await get(userRef);
          
          if (snapshot.exists()) {
            const userData = snapshot.val();
            setUserData(userData);
            
            // Pre-fill form with user data
            setFormState(prev => ({
              ...prev,
              email: userData.email || "",
              phone: userData.mobileNumber || "",
            }));
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    fetchUserData();
  }, []);

  const [formState, setFormState] = React.useState({
    name: businessConfig?.name || "",
    type: businessConfig?.type || "",
    address: businessConfig?.address || "",
    phone: "", // Will be populated from user data
    email: "", // Will be populated from user data
    taxRate: businessConfig?.taxRate || 0,
    logo: businessConfig?.logo || "",
    gstNumber: businessConfig?.gstNumber || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Prevent changing email and phone if they come from registration
    if ((name === "email" && userData?.email) || (name === "phone" && userData?.mobileNumber)) {
      return;
    }
    
    setFormState(prev => ({
      ...prev,
      [name]: name === "taxRate" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSelectChange = (value: string) => {
    setIsOtherType(value === "other");
    setFormState(prev => ({
      ...prev,
      type: value === "other" ? "" : value,
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "quick_bill_image");

    setUploading(true);
    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/db0zuhgnc/image/upload",
        { method: "POST", body: formData }
      );

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setFormState(prev => ({ ...prev, logo: data.secure_url }));
      toast.success("Logo uploaded successfully!");
    } catch (error) {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formState.name || !formState.address || !formState.phone) {
      toast.error("Please fill required fields");
      return;
    }

    setUploading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated user");

      const completeConfig = {
        name: encrypt(formState.name),
        type: encrypt(formState.type),
        address: encrypt(formState.address),
        phone: encrypt(formState.phone),
        email: encrypt(formState.email),
        gstNumber: encrypt(formState.gstNumber),
        logo: encrypt(formState.logo),
        taxRate: formState.taxRate,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updates = {
        [`users/${user.uid}/business`]: completeConfig,
        [`users/${user.uid}/accountStatus`]: "active",
        [`users/${user.uid}/lastUpdated`]: new Date().toISOString()
      };

      await update(ref(database), updates);

      await user.getIdToken(true);
      await auth.currentUser?.reload();

      setBusinessConfig(completeConfig);

      await new Promise(resolve => setTimeout(resolve, 1000));

      navigate("/dashboard", { replace: true });
      toast.success("Business setup completed successfully!");
    } catch (error: any) {
      console.error("Setup error:", error);
      toast.error(`Setup failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-billing-background flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-lg animate-fade-in">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">Set Up Your Business</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Business Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Your Business Name"
                    value={formState.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Business Type</Label>
                  <Select
                    value={isOtherType ? "other" : formState.type}
                    onValueChange={handleSelectChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Business Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cafe">Cafe</SelectItem>
                      <SelectItem value="grocery">Grocery Store</SelectItem>
                      <SelectItem value="retail">Retail Store</SelectItem>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {isOtherType && (
                    <Input
                      name="type"
                      placeholder="Enter your business type"
                      value={formState.type}
                      onChange={handleChange}
                      required
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Business Address *</Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="123 Business St, City"
                    value={formState.address}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                {/* Phone Number (from registration, not changeable) */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="(123) 456-7890"
                    value={formState.phone}
                    onChange={handleChange}
                    required
                    inputMode="tel"
                    readOnly={!!userData?.mobileNumber}
                    className={userData?.mobileNumber ? "bg-gray-100 cursor-not-allowed" : ""}
                  />
                  {userData?.mobileNumber && (
                    <p className="text-xs text-gray-500">
                      Phone number from registration (cannot be changed)
                    </p>
                  )}
                </div>

                {/* Email (from registration, not changeable) */}
                <div className="space-y-2">
  <Label htmlFor="email" className="dark:text-white">Email Address</Label>
  <Input
    id="email"
    name="email"
    type="email"
    placeholder="your@business.com"
    value={formState.email}
    onChange={handleChange}
    readOnly={!!userData?.email}
    className={userData?.email ? "bg-gray-100 cursor-not-allowed dark:bg-gray-700 dark:text-gray-300" : ""}
  />
  {userData?.email && (
    <p className="text-xs text-gray-500 dark:text-gray-400">
      Email from registration (cannot be changed)
    </p>
  )}
</div>
                
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    name="taxRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="10"
                    value={formState.taxRate}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    name="gstNumber"
                    type="text"
                    placeholder="27ABCDE1234F1Z5"
                    value={formState.gstNumber}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2 col-span-full">
                  <Label htmlFor="logoUrl">Business Logo</Label>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Input
                        id="logoUrl"
                        name="logoUrl"
                        type="url"
                        placeholder="Paste image URL"
                        value={formState.logo}
                        onChange={(e) =>
                          setFormState(prev => ({ ...prev, logo: e.target.value }))
                        }
                        disabled={uploading}
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-500 flex items-center">OR</span>
                      <Input
                        id="logoFile"
                        name="logoFile"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="flex-1"
                      />
                    </div>
                    {formState.logo && (
                      <img
                        src={formState.logo}
                        alt="Business Logo Preview"
                        className="h-32 mt-2 object-contain border rounded-md mx-auto"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={uploading}
            >
              {uploading ? "Saving..." : "Complete Setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessSetup;