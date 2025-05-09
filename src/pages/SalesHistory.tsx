
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
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { Search, FileText, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

const SalesHistory = () => {
  const { sales } = useBilling();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const isMobile = useIsMobile();
  
  // Filter sales by search query and date
  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = dateFilter ? sale.date.startsWith(dateFilter) : true;
    return matchesSearch && matchesDate;
  });
  
  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-billing-dark mb-4 sm:mb-0">Sales History</h1>
      </div>
      
      <Card className="mb-6">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by sale ID..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="text-billing-secondary h-4 w-4" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {!isMobile ? (
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
                        {formatDate(sale.date)}
                        <div className="text-xs text-billing-secondary">
                          {formatTime(sale.date)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{sale.id}</TableCell>
                      <TableCell>
                        {sale.items.reduce((sum, item) => sum + item.quantity, 0)} items
                      </TableCell>
                      <TableCell>{formatCurrency(sale.grandTotal)}</TableCell>
                      <TableCell className="capitalize">{sale.paymentMethod}</TableCell>
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
          ) : (
            <div className="divide-y">
              {filteredSales.length > 0 ? (
                filteredSales.map(sale => (
                  <div key={sale.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">{formatDate(sale.date)}</div>
                        <div className="text-xs text-billing-secondary">{formatTime(sale.date)}</div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8">
                            <FileText className="h-4 w-4 mr-1" /> Details
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
                    </div>
                    <div className="grid grid-cols-2 text-sm mt-3">
                      <div>
                        <div className="text-billing-secondary">Items</div>
                        <div>{sale.items.reduce((sum, item) => sum + item.quantity, 0)} items</div>
                      </div>
                      <div>
                        <div className="text-billing-secondary">Payment</div>
                        <div className="capitalize">{sale.paymentMethod}</div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t flex justify-between items-center">
                      <span className="text-sm text-billing-secondary">Sale ID: {sale.id.substring(0, 8)}...</span>
                      <span className="font-bold text-billing-primary">{formatCurrency(sale.grandTotal)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-billing-secondary">
                  {searchQuery || dateFilter ? 'No sales match your search' : 'No sales records found'}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </Layout>
  );
};

export default SalesHistory;
