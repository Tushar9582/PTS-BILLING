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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

interface CustomerInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (customerInfo: { name: string; phone: string }) => void;
  billDetails: string;
}

const CustomerInfoModal: React.FC<CustomerInfoModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  billDetails,
}) => {
  const { toast } = useToast();
  const { recentCustomers, addCustomer } = useCustomerStore();
  const [customerInfo, setCustomerInfo] = React.useState({
    name: "",
    phone: "",
  });
  const [showRecent, setShowRecent] = React.useState(false);
  const [sendReceipt, setSendReceipt] = React.useState(false);
  const [deliveryMethod, setDeliveryMethod] = React.useState<"whatsapp" | "sms">("whatsapp");

  useEffect(() => {
    if (open) {
      setShowRecent(recentCustomers.length > 0);
      setSendReceipt(false);
      setDeliveryMethod("whatsapp");
    }
  }, [open, recentCustomers.length]);

  const formatWhatsAppMessage = () => {
    return `Dear ${customerInfo.name || 'Valued Customer'},\n\nHere's your receipt:\n\n${billDetails}\n\nThank you for shopping with us!`;
  };

  const formatSMSMessage = () => {
    // Extract key information for SMS
    const lines = billDetails.split('\n');
    const items = lines.filter(line => line.includes('x') && line.includes('=')).slice(0, 3);
    const totalLine = lines.find(line => line.startsWith('Total:'));
    
    return `${customerInfo.name || 'Customer'}, your receipt:\n${items.join('\n')}\n${totalLine}\nThank you!`;
  };

  const sendReceiptToCustomer = (phone: string) => {
    if (!phone) return;

    const formattedPhone = phone.replace(/[^0-9]/g, ''); // Remove any non-numeric characters
    let url = '';

    if (deliveryMethod === "whatsapp") {
      const message = encodeURIComponent(formatWhatsAppMessage());
      url = `https://wa.me/${formattedPhone}?text=${message}`;
    } else {
      const message = encodeURIComponent(formatSMSMessage());
      url = `sms:${formattedPhone}?body=${message}`;
    }

    // Open the URL in a new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // First complete the sale
      if (!customerInfo.name && !customerInfo.phone) {
        onSubmit({ name: "Walk-in Customer", phone: "" });
      } else {
        addCustomer(customerInfo);
        onSubmit(customerInfo);
      }

      // Then send receipt if requested
      if (sendReceipt && customerInfo.phone) {
        sendReceiptToCustomer(customerInfo.phone);
        toast.success(`Receipt sent via ${deliveryMethod.toUpperCase()}!`);
      }

      // Close modal and reset
      onOpenChange(false);
      setCustomerInfo({ name: "", phone: "" });
      
    } catch (error) {
      toast.error("Failed to complete transaction. Please try again.");
    }
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
                onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
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
                onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                placeholder="Enter phone number"
                className="w-full"
                type="tel"
                autoComplete="tel"
              />
            </div>
          
            {customerInfo.phone && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="send-receipt" 
                    checked={sendReceipt}
                    onCheckedChange={(checked) => setSendReceipt(!!checked)}
                  />
                  <Label htmlFor="send-receipt">Send receipt to customer</Label>
                </div>

                {sendReceipt && (
                  <div className="space-y-3">
                    <RadioGroup 
                      value={deliveryMethod} 
                      onValueChange={(value) => setDeliveryMethod(value as "whatsapp" | "sms")}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="whatsapp" id="whatsapp" />
                        <Label htmlFor="whatsapp">WhatsApp</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sms" id="sms" />
                        <Label htmlFor="sms">SMS</Label>
                      </div>
                    </RadioGroup>

                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                      <Label>Receipt Preview:</Label>
                      <div className="mt-2 text-sm whitespace-pre-wrap overflow-y-auto max-h-40">
                        {deliveryMethod === "whatsapp" ? formatWhatsAppMessage() : formatSMSMessage()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="default" 
              className="w-full sm:w-auto"
            >
              {sendReceipt ? `Complete & Send via ${deliveryMethod.toUpperCase()}` : 'Complete Sale'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerInfoModal;