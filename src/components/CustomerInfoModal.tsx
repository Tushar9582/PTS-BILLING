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
import { Checkbox } from "@/components/ui/checkbox";
import { useBilling } from "@/contexts/BillingContext";

interface CustomerInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (customerInfo: { name: string; phone: string; email?: string }) => void;
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
  const { businessConfig } = useBilling();
  const [customerInfo, setCustomerInfo] = React.useState({
    name: "",
    phone: "",
    email: "",
  });
  const [showRecent, setShowRecent] = React.useState(false);
  const [sendReceipt, setSendReceipt] = React.useState(false);
  const [includeGST, setIncludeGST] = React.useState(false);
  const [deliveryMethods, setDeliveryMethods] = React.useState<Array<"whatsapp" | "sms" | "email">>([]);

  useEffect(() => {
    if (open) {
      setShowRecent(recentCustomers.length > 0);
      setSendReceipt(false);
      setIncludeGST(false);
      setDeliveryMethods([]);
    }
  }, [open, recentCustomers.length]);

  const formatWhatsAppMessage = () => {
    let message = `Dear ${customerInfo.name || 'Valued Customer'},\n\nHere's your receipt:\n\n${billDetails}`;
    if (includeGST && businessConfig?.gstNumber) {
      message += `\n\nGST Number: ${businessConfig.gstNumber}`;
    }
    message += `\n\nThank you for shopping with us!`;
    return message;
  };

  const formatSMSMessage = () => {
    const lines = billDetails.split('\n');
    const items = lines.filter(line => line.includes('x') && line.includes('=')).slice(0, 3);
    const totalLine = lines.find(line => line.startsWith('Total:'));
    let message = `${customerInfo.name || 'Customer'}, your receipt:\n${items.join('\n')}\n${totalLine}`;
    if (includeGST && businessConfig?.gstNumber) {
      message += `\nGST: ${businessConfig.gstNumber}`;
    }
    message += `\nThank you!`;
    return message;
  };

  const formatEmailMessage = () => {
    let message = `Dear ${customerInfo.name || "Customer"},\n\nThank you for your purchase!\n\nHere's your receipt:\n\n${billDetails}`;
    if (includeGST && businessConfig?.gstNumber) {
      message += `\n\nGST Number: ${businessConfig.gstNumber}`;
    }
    message += `\n\nBest regards,\nYour Company`;
    return message;
  };

  const formatPrintedReceipt = () => {
    let receipt = billDetails;
    if (includeGST && businessConfig?.gstNumber) {
      receipt += `\nGST Number: ${businessConfig.gstNumber}`;
    }
    return receipt;
  };

  const sendReceiptToCustomer = () => {
    const phone = customerInfo.phone.replace(/[^0-9]/g, '');
    const email = customerInfo.email;

    deliveryMethods.forEach(method => {
      let url = "";

      if (method === "whatsapp" && phone) {
        const message = encodeURIComponent(formatWhatsAppMessage());
        url = `https://wa.me/${phone}?text=${message}`;
      } else if (method === "sms" && phone) {
        const message = encodeURIComponent(formatSMSMessage());
        url = `sms:${phone}?body=${message}`;
      } else if (method === "email" && email) {
        const subject = encodeURIComponent("Your Receipt from Our Store");
        const body = encodeURIComponent(formatEmailMessage());
        url = `mailto:${email}?subject=${subject}&body=${body}`;
      }

      if (url) window.open(url, "_blank", "noopener,noreferrer");
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const customerData = {
        name: customerInfo.name || "Walk-in Customer",
        phone: customerInfo.phone,
        email: customerInfo.email,
      };

      if (!customerInfo.name && !customerInfo.phone && !customerInfo.email) {
        onSubmit({ name: "Walk-in Customer", phone: "" });
      } else {
        addCustomer(customerData);
        onSubmit(customerData);
      }

      if (sendReceipt && deliveryMethods.length > 0) {
        sendReceiptToCustomer();
        toast.success(`Receipt sent via ${deliveryMethods.map(m => m.toUpperCase()).join(', ')}!`);
      }

      onOpenChange(false);
      setCustomerInfo({ name: "", phone: "", email: "" });
    } catch (error) {
      toast.error("Failed to complete transaction. Please try again.");
    }
  };

  const handlePrintPDF = () => {
    const receiptWindow = window.open('', '_blank');
    if (receiptWindow) {
      receiptWindow.document.write(`
        <html>
          <head>
            <title>Receipt</title>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              pre { white-space: pre-wrap; font-size: 14px; }
            </style>
          </head>
          <body>
            <h2>Receipt</h2>
            <pre>${formatPrintedReceipt()}</pre>
            <p>Thank you for shopping with us!</p>
            <script>
              window.onload = function () {
                window.print();
                window.onafterprint = function () {
                  window.close();
                };
              };
            </script>
          </body>
        </html>
      `);
      receiptWindow.document.close();
    }
  };

  const handleDeliveryMethodChange = (method: "whatsapp" | "sms" | "email", checked: boolean) => {
    if (checked) {
      setDeliveryMethods([...deliveryMethods, method]);
    } else {
      setDeliveryMethods(deliveryMethods.filter(m => m !== method));
    }
  };

  const handleSelectAllChange = (checked: boolean) => {
    if (checked) {
      setDeliveryMethods(['whatsapp', 'sms', 'email']);
    } else {
      setDeliveryMethods([]);
    }
  };

  const getPreviewMessage = () => {
    if (deliveryMethods.includes('whatsapp')) return formatWhatsAppMessage();
    if (deliveryMethods.includes('sms')) return formatSMSMessage();
    if (deliveryMethods.includes('email')) return formatEmailMessage();
    return "Select a delivery method to preview";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>Customer Information</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Customer Name</Label>
              <Input
                id="name"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                placeholder="Enter customer name"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                placeholder="Enter phone number"
                type="tel"
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                placeholder="Enter email address"
                type="email"
              />
            </div>

            {businessConfig?.gstNumber && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-gst"
                  checked={includeGST}
                  onCheckedChange={(checked) => setIncludeGST(!!checked)}
                />
                <Label htmlFor="include-gst">Include GST Number in receipt</Label>
              </div>
            )}

            {(customerInfo.phone || customerInfo.email) && (
              <div className="space-y-4 border-t pt-4">
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
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="select-all"
                          checked={deliveryMethods.length === 3}
                          onCheckedChange={handleSelectAllChange}
                        />
                        <Label htmlFor="select-all">Select All</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="whatsapp"
                          checked={deliveryMethods.includes('whatsapp')}
                          disabled={!customerInfo.phone}
                          onCheckedChange={(checked) => handleDeliveryMethodChange('whatsapp', checked)}
                        />
                        <Label htmlFor="whatsapp">WhatsApp</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="sms"
                          checked={deliveryMethods.includes('sms')}
                          disabled={!customerInfo.phone}
                          onCheckedChange={(checked) => handleDeliveryMethodChange('sms', checked)}
                        />
                        <Label htmlFor="sms">SMS</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="email"
                          checked={deliveryMethods.includes('email')}
                          disabled={!customerInfo.email}
                          onCheckedChange={(checked) => handleDeliveryMethodChange('email', checked)}
                        />
                        <Label htmlFor="email">Email</Label>
                      </div>
                    </div>

                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                      <Label>Receipt Preview:</Label>
                      <div className="mt-2 text-sm whitespace-pre-wrap overflow-y-auto max-h-40">
                        {getPreviewMessage()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between items-center">
            <div>
              <Button type="button" variant="outline" onClick={handlePrintPDF}>
                Print PDF
              </Button>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {sendReceipt && deliveryMethods.length > 0
                  ? `Complete & Send via ${deliveryMethods.map(m => m.toUpperCase()).join(', ')}`
                  : "Complete Sale"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerInfoModal;