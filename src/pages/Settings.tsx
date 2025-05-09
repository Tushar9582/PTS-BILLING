
import React, { useState } from "react";
import { useBilling } from "@/contexts/BillingContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";

const Settings = () => {
  const { businessConfig, setBusinessConfig } = useBilling();
  
  const [formState, setFormState] = useState({
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
    
    toast.success("Settings updated successfully");
  };
  
  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-billing-dark">Settings</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Business Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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
            
            <Button type="submit" className="w-full md:w-auto">
              Save Settings
            </Button>
          </form>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default Settings;
