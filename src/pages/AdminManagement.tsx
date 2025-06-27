import React, { useEffect, useState, useMemo } from "react";
import { ref, onValue, update, remove } from "firebase/database";
import { database } from "../firebase/firebaseConfig";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Trash2 } from "lucide-react";

interface AdminUser {
  uid: string;
  name: string;
  email: string;
  active: boolean;
  productCount: number;
  categoryCount: number;
  categoryLimit: number;
  productLimit: number;
}

const ITEMS_PER_PAGE = 10;

const AdminManagement: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const usersRef = ref(database, "users");

    const unsubscribe = onValue(
      usersRef,
      (snapshot) => {
        const usersData = snapshot.val();
        const adminUsers: AdminUser[] = [];

        if (usersData) {
          Object.entries(usersData).forEach(([uid, userNode]: any) => {
            const config = userNode.businessConfig;
            const products = userNode.products || {};
            const categories = userNode.categories || {};

            if (config) {
              adminUsers.push({
                uid,
                name: config.name || "No Name",
                email: config.email || "No Email",
                active: config.active ?? true,
                productCount: Object.keys(products).length,
                categoryCount: Object.keys(categories).length,
                categoryLimit: config.categoryLimit ?? 5,
                productLimit: config.productLimit ?? 20,
              });
            }
          });
        }

        setAdmins(adminUsers);
        setLoading(false);
      },
      (error) => {
        toast({ title: "Error loading admins", description: error.message, variant: "destructive" });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const toggleActiveStatus = async (uid: string, newStatus: boolean) => {
    try {
      await update(ref(database, `users/${uid}/businessConfig`), { active: newStatus });
      toast({
        title: "Status Updated",
        description: `User has been ${newStatus ? "activated" : "deactivated"}`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const deleteAdmin = async (uid: string) => {
    try {
      await remove(ref(database, `users/${uid}`));
      setAdmins((prev) => prev.filter((admin) => admin.uid !== uid));
      toast({ title: "Deleted", description: "Admin deleted successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to delete admin", variant: "destructive" });
    }
  };

  const handleLimitChange = (
    uid: string,
    field: "categoryLimit" | "productLimit",
    value: number
  ) => {
    setAdmins((prevAdmins) =>
      prevAdmins.map((admin) =>
        admin.uid === uid ? { ...admin, [field]: Math.max(0, value) } : admin
      )
    );
  };

  const saveLimits = async (uid: string) => {
    const admin = admins.find((a) => a.uid === uid);
    if (!admin) return;

    try {
      await update(ref(database, `users/${uid}/businessConfig`), {
        categoryLimit: admin.categoryLimit,
        productLimit: admin.productLimit,
      });
      toast({ title: "Limits Updated", description: "Limits updated successfully" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update limits",
        variant: "destructive",
      });
    }
  };

  const filteredAdmins = useMemo(() => {
    return admins.filter(
      (admin) =>
        admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.uid.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [admins, searchTerm]);

  const totalPages = Math.ceil(filteredAdmins.length / ITEMS_PER_PAGE);
  const paginatedAdmins = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAdmins.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAdmins, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-center">Admin Management</h2>

      <div className="relative max-w-md mx-auto">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <Input
          type="text"
          placeholder="Search by name, email or ID..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading admins...</p>
      ) : filteredAdmins.length === 0 ? (
        <p className="text-center text-gray-500">
          {searchTerm ? "No matching admins found" : "No admins found"}
        </p>
      ) : (
        <>
          {paginatedAdmins.map((admin) => (
            <Card key={admin.uid} className="p-6 shadow-sm rounded-xl">
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{admin.name}</h3>
                    <p className="text-sm text-gray-600">{admin.email}</p>
                    <div className="flex gap-4 text-sm">
                      <span>
                        <strong>Products:</strong> {admin.productCount}/{admin.productLimit}
                      </span>
                      <span>
                        <strong>Categories:</strong> {admin.categoryCount}/{admin.categoryLimit}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Account Status:</span>
                    <Switch
                      checked={admin.active}
                      onCheckedChange={(checked) => toggleActiveStatus(admin.uid, checked)}
                    />
                    <span className="text-sm">{admin.active ? "Active" : "Inactive"}</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteAdmin(admin.uid)}
                      title="Delete Admin"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Category Limit</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={admin.categoryCount}
                        value={admin.categoryLimit}
                        onChange={(e) =>
                          handleLimitChange(admin.uid, "categoryLimit", parseInt(e.target.value) || 0)
                        }
                        className="w-24"
                      />
                      <Button onClick={() => saveLimits(admin.uid)}>Update</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Product Limit</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={admin.productCount}
                        value={admin.productLimit}
                        onChange={(e) =>
                          handleLimitChange(admin.uid, "productLimit", parseInt(e.target.value) || 0)
                        }
                        className="w-24"
                      />
                      <Button onClick={() => saveLimits(admin.uid)}>Update</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
};

export default AdminManagement;
