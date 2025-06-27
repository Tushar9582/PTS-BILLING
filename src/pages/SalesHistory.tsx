import React, { useEffect, useState } from "react";
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
import { Search, FileText, Calendar, Download, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { auth, database } from "@/firebase/firebaseConfig";
import { onValue, ref, remove } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import * as XLSX from 'xlsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import CryptoJS from "crypto-js";

const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || "your-very-secure-secret-key";

// Encryption function
const encryptField = (value: string): string => {
    if (!value) return value;
    return CryptoJS.AES.encrypt(value, SECRET_KEY).toString();
};

// Decryption function
const decryptField = (encrypted: string): string => {
    if (!encrypted || typeof encrypted !== 'string') {
        return encrypted || '';
    }

    try {
        const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted || encrypted;
    } catch (err) {
        console.warn("Decryption error for field:", encrypted);
        return encrypted;
    }
};

// Safe number decryption with fallback
const decryptNumberField = (encrypted: string, defaultValue = 0): number => {
    const decrypted = decryptField(encrypted);
    const num = parseFloat(decrypted);
    return isNaN(num) ? defaultValue : num;
};

const decryptSaleData = (sale: any) => {
    if (!sale) return null;
    
    return {
        ...sale,
        id: decryptField(sale.id),
        date: sale.date, // Date is not encrypted
        customerName: decryptField(sale.customerName || ''),
        customerPhone: decryptField(sale.customerPhone || ''),
        businessName: decryptField(sale.businessName || ''),
        tabName: sale.tabName ? decryptField(sale.tabName) : undefined,
        paymentMethod: decryptField(sale.paymentMethod || 'cash'),
        items: sale.items?.map((item: any) => ({
            ...item,
            id: decryptField(item.id),
            name: decryptField(item.name),
            price: decryptNumberField(item.price.toString()),
            quantity: item.quantity // Quantity is not sensitive
        })) || [],
        subtotal: decryptNumberField(sale.subtotal.toString()),
        tax: decryptNumberField(sale.tax?.toString() || '0'),
        discountAmount: decryptNumberField(sale.discountAmount?.toString() || '0'),
        grandTotal: decryptNumberField(sale.grandTotal.toString()),
        customerInfo: sale.customerInfo ? {
            name: decryptField(sale.customerInfo.name || ''),
            phone: decryptField(sale.customerInfo.phone || ''),
            email: sale.customerInfo.email ? decryptField(sale.customerInfo.email) : undefined
        } : undefined
    };
};

const SalesHistory = () => {
    const { t } = useTranslation("sale history");
    const { sales: contextSales, isLoading, refreshSales } = useBilling();
    const [sales, setSales] = useState(contextSales.map(decryptSaleData));
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFilter, setDateFilter] = useState("");
    const [timeRange, setTimeRange] = useState<"all" | "todays" | "week" | "month" | "year">("all");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [saleToDelete, setSaleToDelete] = useState<string | null>(null);
    const isMobile = useIsMobile();
    const navigate = useNavigate();
    
    useEffect(() => {
        if (contextSales.length > 0) {
            const sortedSales = [...contextSales]
                .map(decryptSaleData)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setSales(sortedSales);
        } else {
            setSales([]);
        }
    }, [contextSales]);

    const getFilteredSales = () => {
        const now = new Date();
        let filtered = [...sales];

        switch (timeRange) {
            case "todays":
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                filtered = filtered.filter(sale => {
                    const saleDate = new Date(sale.date);
                    return saleDate >= today && saleDate < tomorrow;
                });
                break;
            case "week":
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                filtered = filtered.filter(sale => new Date(sale.date) >= oneWeekAgo);
                break;
            case "month":
                const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                filtered = filtered.filter(sale => new Date(sale.date) >= oneMonthAgo);
                break;
            case "year":
                const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                filtered = filtered.filter(sale => new Date(sale.date) >= oneYearAgo);
                break;
            default:
                break;
        }

        return filtered.filter(sale => {
            if (!sale) return false;
            const matchesSearch = sale.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                sale.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                sale.customerPhone?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDate = dateFilter ? sale.date?.startsWith(dateFilter) : true;
            return matchesSearch && matchesDate;
        });
    };

    const filteredSales = getFilteredSales();

    const handleDeleteSale = async () => {
        if (!saleToDelete) return;
        
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error(t('notSignedIn'));
            }

            const saleData = sales.find(s => s.id === saleToDelete);
            if (!saleData) {
                throw new Error(t('saleNotFound'));
            }

            const saleRef = ref(database, `users/${user.uid}/sales/${saleToDelete}`);
            const saleByDateRef = ref(database, `users/${user.uid}/salesByDate/${new Date(saleData.date).toISOString().split('T')[0]}/${saleToDelete}`);

            await Promise.all([
                remove(saleRef),
                remove(saleByDateRef)
            ]);
            
            setSales(prevSales => prevSales.filter(sale => sale.id !== saleToDelete));
            
            toast({
                title: t('success'),
                description: t('saleDeleted'),
            });
            
            await refreshSales();
            
        } catch (error: any) {
            console.error("Deletion error:", error);
            await refreshSales();
        } finally {
            setSaleToDelete(null);
            setDeleteDialogOpen(false);
        }
    };

    const exportToExcel = () => {
        if (filteredSales.length === 0) {
            toast({
                title: t('error'),
                description: t('noDataToExport'),
                variant: "destructive",
            });
            return;
        }
        
        const dataToExport = filteredSales.map(sale => ({
            [t('saleId')]: sale.id,
            [t('date')]: new Date(sale.date).toLocaleString(),
            [t('customerName')]: sale.customerName || t('na'),
            [t('customerPhone')]: sale.customerPhone || t('na'),
            [t('itemsCount')]: sale.items?.reduce((sum, item) => sum + (item.quantity || 0), 0),
            [t('subtotal')]: sale.subtotal,
            [t('discount')]: sale.discountAmount || 0,
            [t('tax')]: sale.tax || 0,
            [t('total')]: sale.grandTotal,
            [t('paymentMethod')]: sale.paymentMethod,
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, t('salesHistory'));
        
        let fileName = t('salesHistory');
        if (timeRange !== "all") {
            fileName += `_${t(timeRange)}`;
        }
        fileName += `_${new Date().toISOString().slice(0,10)}.xlsx`;
        
        XLSX.writeFile(workbook, fileName);
        
        toast({
            title: t('success'),
            description: t('exportSuccess', { count: filteredSales.length }),
        });
    };

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        const userRef = ref(database, `users/${user.uid}/business/active`);
        
        const unsubscribe = onValue(userRef, (snapshot) => {
            const isActive = snapshot.exists() ? snapshot.val() : false;
            
            if (!isActive) {
                auth.signOut().then(() => {
                    navigate("/login", {
                        state: { accountDisabled: true },
                        replace: true
                    });
                    toast({
                        title: t('accountDisabledTitle'),
                        description: t('accountDisabled'),
                        variant: "destructive",
                    });
                });
            }
        });

        return () => unsubscribe();
    }, [navigate, t]);

    if (isLoading) {
        return (
            <Layout>
                <div className="space-y-4">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-[500px] w-full" />
                </div>
            </Layout>
        );
    }
    
    return (
        <Layout>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-billing-dark dark:text-white">
                    {t('salesHistory')}
                </h1>
                <div className="flex gap-2">
                    <Select 
                        value={timeRange} 
                        onValueChange={(value: "all" | "todays" | "week" | "month" | "year") => setTimeRange(value)}
                    >
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder={t('timeRange')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t('allTime')}</SelectItem>
                            <SelectItem value="todays">{t('todays')}</SelectItem>
                            <SelectItem value="week">{t('thisWeek')}</SelectItem>
                            <SelectItem value="month">{t('thisMonth')}</SelectItem>
                            <SelectItem value="year">{t('thisYear')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={exportToExcel}>
                        <Download className="mr-2 h-4 w-4" />
                        {t('export')}
                    </Button>
                </div>
            </div>
            
            <Card className="mb-6">
                <div className="p-4 border-b flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            placeholder={t('searchPlaceholder')}
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
                                    <TableHead>{t('date')}</TableHead>
                                    <TableHead>{t('saleId')}</TableHead>
                                    <TableHead>{t('customer')}</TableHead>
                                    <TableHead>{t('phone')}</TableHead>
                                    <TableHead>{t('items')}</TableHead>
                                    <TableHead>{t('total')}</TableHead>
                                    <TableHead>{t('discount')}</TableHead>
                                    <TableHead>{t('payment')}</TableHead>
                                    <TableHead>{t('actions')}</TableHead>
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
                                            <TableCell>{sale.customerName || t('na')}</TableCell>
                                            <TableCell>{sale.customerPhone || t('na')}</TableCell>
                                            <TableCell>
                                                {sale.items?.reduce((sum, item) => sum + (item.quantity || 0), 0)} {t('items')}
                                            </TableCell>
                                            <TableCell>{formatCurrency(sale.grandTotal)}</TableCell>
                                            <TableCell className="text-red-500">
                                                {formatCurrency(sale.discountAmount || 0)}
                                            </TableCell>
                                            <TableCell className="capitalize">{sale.paymentMethod}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <FileText className="h-4 w-4" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-md print:text-xl print:scale-[1.25] print:p-6">
                                                            <DialogHeader>
                                                                <DialogTitle className="print:text-2xl">
                                                                    {t('saleDetails')}
                                                                </DialogTitle>
                                                            </DialogHeader>
                                                            <div className="flex justify-end mt-2 print:hidden">
                                                                <Button variant="outline" onClick={() => window.print()}>
                                                                    {t('print')}
                                                                </Button>
                                                            </div>
                                                            
                                                            <div className="py-4 space-y-4">
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-billing-secondary">{t('saleId')}:</span>
                                                                    <span className="font-medium">{sale.id}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-billing-secondary">{t('date')}:</span>
                                                                    <span className="font-medium">
                                                                        {new Date(sale.date).toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-billing-secondary">{t('customerName')}:</span>
                                                                    <span className="font-medium">{sale.customerName || t('na')}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-billing-secondary">{t('customerPhone')}:</span>
                                                                    <span className="font-medium">{sale.customerPhone || t('na')}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm">
                                                                    <span className="text-billing-secondary">{t('paymentMethod')}:</span>
                                                                    <span className="font-medium capitalize">{sale.paymentMethod}</span>
                                                                </div>
                                                                
                                                                <div className="border-t pt-4">
                                                                    <h4 className="font-medium mb-2">{t('items')}</h4>
                                                                    <div className="space-y-2">
                                                                        {sale.items?.map((item, index) => (
                                                                            <div key={index} className="flex justify-between text-sm">
                                                                                <span>
                                                                                    {item.name} x {item.quantity}
                                                                                </span>
                                                                                <span>{formatCurrency((item.price || 0) * (item.quantity || 0))}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="border-t pt-4 space-y-2">
                                                                    <div className="flex justify-between text-sm">
                                                                        <span>{t('subtotal')}</span>
                                                                        <span>{formatCurrency(sale.subtotal)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-sm text-red-500">
                                                                        <span>{t('discount')}</span>
                                                                        <span>-{formatCurrency(sale.discountAmount || 0)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-sm">
                                                                        <span>{t('tax')}</span>
                                                                        <span>{formatCurrency(sale.tax || 0)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between font-bold pt-2 border-t">
                                                                        <span>{t('total')}</span>
                                                                        <span>{formatCurrency(sale.grandTotal)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="text-red-500 hover:text-red-700"
                                                        onClick={() => {
                                                            setSaleToDelete(sale.id);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-billing-secondary">
                                            {searchQuery || dateFilter ? t('noSalesMatch') : t('noSalesFound')}
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
                                            <div className="flex gap-2">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm" className="h-8">
                                                            <FileText className="h-4 w-4 mr-1" /> {t('details')}
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-md">
                                                        <DialogHeader>
                                                            <DialogTitle>{t('saleDetails')}</DialogTitle>
                                                        </DialogHeader>
                                                        
                                                        <div className="py-4 space-y-4">
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-billing-secondary">{t('saleId')}:</span>
                                                                <span className="font-medium">{sale.id}</span>
                                                            </div>
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-billing-secondary">{t('date')}:</span>
                                                                <span className="font-medium">
                                                                    {new Date(sale.date).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-billing-secondary">{t('customerName')}:</span>
                                                                <span className="font-medium">{sale.customerName || t('na')}</span>
                                                            </div>
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-billing-secondary">{t('customerPhone')}:</span>
                                                                <span className="font-medium">{sale.customerPhone || t('na')}</span>
                                                            </div>
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-billing-secondary">{t('paymentMethod')}:</span>
                                                                <span className="font-medium capitalize">{sale.paymentMethod}</span>
                                                            </div>
                                                            
                                                            <div className="border-t pt-4">
                                                                <h4 className="font-medium mb-2">{t('items')}</h4>
                                                                <div className="space-y-2">
                                                                    {sale.items?.map((item, index) => (
                                                                        <div key={index} className="flex justify-between text-sm">
                                                                            <span>
                                                                                {item.name} x {item.quantity}
                                                                            </span>
                                                                            <span>{formatCurrency((item.price || 0) * (item.quantity || 0))}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="border-t pt-4 space-y-2">
                                                                <div className="flex justify-between text-sm">
                                                                    <span>{t('subtotal')}</span>
                                                                    <span>{formatCurrency(sale.subtotal)}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm text-red-500">
                                                                    <span>{t('discount')}</span>
                                                                    <span>{formatCurrency(sale.discountAmount || 0)}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm">
                                                                    <span>{t('tax')}</span>
                                                                    <span>{formatCurrency(sale.tax || 0)}</span>
                                                                </div>
                                                                <div className="flex justify-between font-bold pt-2 border-t">
                                                                    <span>{t('total')}</span>
                                                                    <span>{formatCurrency(sale.grandTotal)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-8 text-red-500 hover:text-red-700"
                                                    onClick={() => {
                                                        setSaleToDelete(sale.id);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1" /> {t('delete')}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 text-sm mt-3 gap-2">
                                            <div>
                                                <div className="text-billing-secondary">{t('customer')}</div>
                                                <div>{sale.customerInfo?.name || t('na')}</div>
                                            </div>
                                            <div>
                                                <div className="text-billing-secondary">{t('phone')}</div>
                                                <div>{sale.customerInfo?.phone || t('na')}</div>
                                            </div>
                                            <div>
                                                <div className="text-billing-secondary">{t('items')}</div>
                                                <div>{sale.items?.reduce((sum, item) => sum + (item.quantity || 0), 0)}</div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 text-sm mt-2 gap-2">
                                            <div>
                                                <div className="text-billing-secondary">{t('discount')}</div>
                                                <div className="text-red-500">-{formatCurrency(sale.discountAmount || 0)}</div>
                                            </div>
                                            <div>
                                                <div className="text-billing-secondary">{t('payment')}</div>
                                                <div className="capitalize">{sale.paymentMethod}</div>
                                            </div>
                                            <div>
                                                <div className="text-billing-secondary">{t('total')}</div>
                                                <div className="font-bold text-billing-primary">{formatCurrency(sale.grandTotal)}</div>
                                            </div>
                                        </div>
                                        <div className="mt-2 pt-2 border-t">
                                            <span className="text-sm text-billing-secondary">
                                                {t('saleId')}: {sale.id?.substring(0, 8)}...
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-billing-secondary">
                                    {searchQuery || dateFilter ? t('noSalesMatch') : t('noSalesFound')}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('confirmDeleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('confirmDeleteMessage')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction 
                            className="bg-red-500 hover:bg-red-600"
                            onClick={handleDeleteSale}
                        >
                            {t('delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Layout>
    );
};

export default SalesHistory;