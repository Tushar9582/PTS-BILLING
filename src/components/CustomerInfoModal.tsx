
import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useCustomerStore } from "@/store/customerStore";

interface CustomerInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (customerInfo: { name: string; phone: string }) => void;
}

const CustomerInfoModal: React.FC<CustomerInfoModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
}) => {
  const { toast } = useToast();
  const { recentCustomers, addCustomer } = useCustomerStore();
  const [customerInfo, setCustomerInfo] = React.useState({
    name: "",
    phone: "",
  });
  const [showRecent, setShowRecent] = React.useState(false);

  useEffect(() => {
    // Reset state when modal opens
    if (open) {
      setShowRecent(recentCustomers.length > 0);
    }
  }, [open, recentCustomers.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerInfo.name && !customerInfo.phone) {
      toast({
        title: "Anonymous Customer",
        description: "Continuing with walk-in customer",
      });
      onSubmit({ name: "Walk-in Customer", phone: "" });
    } else {
      addCustomer(customerInfo);
      onSubmit(customerInfo);
      toast({
        title: "Customer Added",
        description: `Bill created for ${customerInfo.name}`,
      });
    }
    setCustomerInfo({ name: "", phone: "" });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomerInfo((prev) => ({ ...prev, [name]: value }));
  };

  const selectRecentCustomer = (customer: { name: string; phone: string }) => {
    setCustomerInfo(customer);
    toast({
      title: "Customer Selected",
      description: `${customer.name} selected from recent customers`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] animate-fade-in max-w-[95vw] mx-auto">
        <DialogHeader>
          <DialogTitle>Customer Information</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {showRecent && (
            <div className="mb-4">
              <Label className="mb-2 block">Recent Customers</Label>
              <div className="max-h-[120px] overflow-y-auto space-y-2">
                {recentCustomers.slice(0, 5).map((customer, index) => (
                  <div 
                    key={index} 
                    onClick={() => selectRecentCustomer(customer)}
                    className="p-2 border rounded-md cursor-pointer hover:bg-accent dark:hover:bg-accent/20 flex justify-between"
                  >
                    <span>{customer.name}</span>
                    <span className="text-sm text-muted-foreground">{customer.phone}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Customer Name</Label>
              <Input
                id="name"
                name="name"
                value={customerInfo.name}
                onChange={handleChange}
                placeholder="Enter customer name"
                className="w-full"
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                value={customerInfo.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                className="w-full"
                type="tel"
                autoComplete="tel"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" variant="neon" className="w-full sm:w-auto">Continue</Button>
            <Button type="submit" onClick={(e) => {
              e.preventDefault();
              onSubmit({ name: "Walk-in Customer", phone: "" });
              onOpenChange(false);
            }} variant="ghost" className="w-full sm:w-auto text-sm">
              Skip (Walk-in)
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerInfoModal;
