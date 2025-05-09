
import React, { useState } from "react";
import { useBilling } from "@/contexts/BillingContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { Search, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";

const SalesHistory = () => {
  const { sales } = useBilling();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  
  // Filter sales by search query and date
  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = dateFilter ? sale.date.startsWith(dateFilter) : true;
    return matchesSearch && matchesDate;
  });
  
  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-billing-dark">Sales History</h1>
      </div>
      
      <Card className="mb-6">
        <div className="p-4 border-b flex flex-wrap gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by sale ID..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full md:w-auto"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Sale ID</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length > 0 ? (
                filteredSales.map(sale => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      {new Date(sale.date).toLocaleDateString()}
                      <div className="text-xs text-billing-secondary">
                        {new Date(sale.date).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{sale.id}</TableCell>
                    <TableCell>
                      {sale.items.reduce((sum, item) => sum + item.quantity, 0)} items
                    </TableCell>
                    <TableCell>{formatCurrency(sale.grandTotal)}</TableCell>
                    <TableCell>{sale.paymentMethod}</TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Sale Details</DialogTitle>
                          </DialogHeader>
                          
                          <div className="py-4 space-y-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-billing-secondary">Sale ID:</span>
                              <span className="font-medium">{sale.id}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-billing-secondary">Date:</span>
                              <span className="font-medium">
                                {new Date(sale.date).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-billing-secondary">Payment Method:</span>
                              <span className="font-medium capitalize">{sale.paymentMethod}</span>
                            </div>
                            
                            <div className="border-t pt-4">
                              <h4 className="font-medium mb-2">Items</h4>
                              <div className="space-y-2">
                                {sale.items.map((item, index) => (
                                  <div key={index} className="flex justify-between text-sm">
                                    <span>
                                      {item.name} x {item.quantity}
                                    </span>
                                    <span>{formatCurrency(item.price * item.quantity)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div className="border-t pt-4 space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Subtotal</span>
                                <span>{formatCurrency(sale.total)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Tax</span>
                                <span>{formatCurrency(sale.tax)}</span>
                              </div>
                              <div className="flex justify-between font-bold pt-2 border-t">
                                <span>Total</span>
                                <span>{formatCurrency(sale.grandTotal)}</span>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-billing-secondary">
                    {searchQuery || dateFilter ? 'No sales match your search' : 'No sales records found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </Layout>
  );
};

export default SalesHistory;
