"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { Check, X, Loader2, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { useTheme } from "next-themes";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { resolvedTheme } = useTheme();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  if (
    currentUser &&
    currentUser.role !== "ADMIN" &&
    currentUser.role !== "COMPLIANCE_OFFICER"
  ) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <div className="text-center">
          <h2 className="text-lg sm:text-xl font-semibold">Access Denied</h2>
          <p className="text-sm text-muted-foreground mt-2">
            You don't have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  const {
    data: users,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        const { data } = await api.get("/users");
        return data;
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to load users");
        throw err;
      }
    },
    retry: 1,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.patch(`/users/${id}/status`, { status });
    },
    onSuccess: (data, variables) => {
      const statusText =
        variables.status === "ACTIVE" ? "approved" : "rejected";
      toast.success(`User ${statusText} successfully`);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || "Failed to update user status"
      );
    },
  });

  // Filter users by search and role
  const filteredUsers = users?.filter((u: any) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const activeUsers =
    filteredUsers?.filter((u: any) => u.status === "ACTIVE") || [];
  const pendingUsers =
    filteredUsers?.filter((u: any) => u.status === "PENDING") || [];

  // Get unique roles
  const roles = Array.from(new Set(users?.map((u: any) => u.role))) as string[];

  // Mobile Card View Component
  const UserCards = ({
    data,
    showActions,
  }: {
    data: any[];
    showActions?: boolean;
  }) => (
    <div className="space-y-3">
      {data.length === 0 ? (
        <div className="text-center p-8 border rounded-lg bg-muted/20">
          <p className="text-sm text-muted-foreground">No users found.</p>
        </div>
      ) : (
        data.map((user) => (
          <Card key={user.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate" title={user.name}>
                    {user.name}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate" title={user.email}>
                    {user.email}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {user.role}
                </Badge>
              </div>

              <div className="text-xs text-muted-foreground">
                Joined: {format(new Date(user.createdAt), "dd MMM yyyy")}
              </div>

              {showActions && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() =>
                      updateStatus.mutate({ id: user.id, status: "ACTIVE" })
                    }
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() =>
                      updateStatus.mutate({ id: user.id, status: "REJECTED" })
                    }
                  >
                    <X className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  // Desktop Table View Component
  const UserTable = ({
    data,
    showActions,
  }: {
    data: any[];
    showActions?: boolean;
  }) => (
    <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[160px]">Name</TableHead>
              <TableHead className="min-w-[200px]">Email</TableHead>
              <TableHead className="min-w-[120px]">Role</TableHead>
              <TableHead className="min-w-[140px]">Joined</TableHead>
              {showActions && (
                <TableHead className="min-w-[200px] text-right">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showActions ? 5 : 4}
                  className="h-24 text-center"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="truncate max-w-[200px]" title={user.name}>
                      {user.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="truncate max-w-[250px]" title={user.email}>
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="whitespace-nowrap">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(user.createdAt), "PPP")}
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() =>
                            updateStatus.mutate({
                              id: user.id,
                              status: "ACTIVE",
                            })
                          }
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            updateStatus.mutate({
                              id: user.id,
                              status: "REJECTED",
                            })
                          }
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12 sm:p-16 lg:p-20">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const containerStyle = { colorScheme: "light" };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8" style={containerStyle}>
      {/* Header */}
      <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            User Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage system access and approvals.
          </p>
        </div>
      </div>

      {/* Search and Filters Section */}
      <div className="space-y-3">
        {/* Desktop: Search + Filter Side by Side */}
        <div className="hidden xl:flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mobile: Search Bar */}
        <div className="relative w-full xl:hidden">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full"
          />
        </div>

        {/* Mobile: Filter Toggle */}
        <div className="flex gap-2 xl:hidden">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Mobile: Collapsible Filter */}
        {showFilters && (
          <div className="xl:hidden">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
          <TabsTrigger value="active" className="text-xs sm:text-sm">
            Active ({activeUsers.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs sm:text-sm">
            Pending ({pendingUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-4">
          {/* Mobile Card View - Up to 1264px */}
          <div className="block xl:hidden">
            <UserCards data={activeUsers} />
          </div>
          {/* Desktop Table View - 1264px and above */}
          <div className="hidden xl:block">
            <UserTable data={activeUsers} />
          </div>
        </TabsContent>

        <TabsContent value="pending" className="mt-4 space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-3 sm:p-4 rounded">
            <div className="flex">
              <div className="ml-3">
                <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
                  These users have requested access. Verify their identity
                  before approving.
                </p>
              </div>
            </div>
          </div>
          {/* Mobile Card View - Up to 1264px */}
          <div className="block xl:hidden">
            <UserCards data={pendingUsers} showActions />
          </div>
          {/* Desktop Table View - 1264px and above */}
          <div className="hidden xl:block">
            <UserTable data={pendingUsers} showActions />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}