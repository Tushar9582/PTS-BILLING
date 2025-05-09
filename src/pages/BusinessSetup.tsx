
import React from "react";
import { useNavigate } from "react-router-dom";
import { useBilling } from "@/contexts/BillingContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";

const BusinessSetup = () => {
  const navigate = useNavigate();
  const { setBusinessConfig, businessConfig } = useBilling();
  const [formState, setFormState] = React.useState({
    name: businessConfig?.name || "",
    type: businessConfig?.type || "cafe",
    address: businessConfig?.address || "",
    phone: businessConfig?.phone || "",
    email: businessConfig?.email || "",
    taxRate: businessConfig?.taxRate || 10,
    logo: businessConfig?.logo || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState({
      ...formState,
      [name]: name === "taxRate" ? parseFloat(value) : value,
    });
  };

  const handleSelectChange = (value: string) => {
    setFormState({
      ...formState,
      type: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formState.name.trim() || !formState.address.trim() || !formState.phone.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setBusinessConfig({
      name: formState.name,
      type: formState.type,
      address: formState.address,
      phone: formState.phone,
      email: formState.email,
      taxRate: formState.taxRate,
      logo: formState.logo,
    });

    toast.success("Business setup completed!");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-billing-background flex items-center justify-center">
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
                    value={formState.type}
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
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="(123) 456-7890"
                    value={formState.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@business.com"
                    value={formState.email}
                    onChange={handleChange}
                  />
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
                  <Label htmlFor="logo">Logo URL (optional)</Label>
                  <Input
                    id="logo"
                    name="logo"
                    placeholder="https://your-logo-url.com/logo.png"
                    value={formState.logo}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg">
              Complete Setup
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessSetup;
