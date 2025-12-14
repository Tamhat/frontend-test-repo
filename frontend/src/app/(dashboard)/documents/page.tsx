"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Document, DocStatus, DocType } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { format } from "date-fns";
import {
  Loader2,
  Eye,
  Trash2,
  Columns3,
  Search,
  MessageSquare,
  Check,
  Filter,
} from "lucide-react";
import { UploadDocumentModal } from "@/components/dashboard/upload-document-modal";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function DocumentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedForChat, setSelectedForChat] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    title: true,
    fund: true,
    type: true,
    period: true,
    status: true,
    uploaded: true,
  });

  const {
    data: documents,
    isLoading,
    error,
  } = useQuery<Document[]>({
    queryKey: ["documents", statusFilter, typeFilter],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.append("status", statusFilter);
        if (typeFilter !== "all") params.append("type", typeFilter);
        const { data } = await api.get(`/documents?${params.toString()}`);
        return data;
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to load documents");
        throw err;
      }
    },
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/documents/${id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Document deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete document");
    },
  });

  useEffect(() => {
    const stored = localStorage.getItem("chatSelectedDocs");
    if (stored) {
      try {
        setSelectedForChat(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse stored chat docs");
      }
    }
  }, []);

  const toggleDocForChat = (docId: string) => {
    const updated = selectedForChat.includes(docId)
      ? selectedForChat.filter((id) => id !== docId)
      : [...selectedForChat, docId];
    setSelectedForChat(updated);
    localStorage.setItem("chatSelectedDocs", JSON.stringify(updated));
    toast.success(
      updated.includes(docId) ? "Added to chat" : "Removed from chat"
    );
  };

  const canUpload =
    user && ["ADMIN", "FUND_MANAGER", "COMPLIANCE_OFFICER"].includes(user.role);
  const isAdmin = user?.role === "ADMIN";

  const filteredDocuments = documents?.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fund?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.fund?.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: DocStatus) => {
    switch (status) {
      case DocStatus.APPROVED:
        return "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300";
      case DocStatus.REJECTED:
        return "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-300";
      case DocStatus.IN_REVIEW:
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight truncate">
            Documents
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            View and manage compliance documents.
          </p>
        </div>
        {canUpload && (
          <div className="flex-shrink-0">
            <UploadDocumentModal />
          </div>
        )}
      </div>

      {/* Search and Filters Section */}
      <div className="space-y-3">
        {/* Desktop: Search + Filters + Column Toggle Side by Side */}
        <div className="hidden xl:flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search documents, funds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.values(DocStatus).map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.values(DocType).map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Columns3 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={visibleColumns.title}
                onCheckedChange={(v) =>
                  setVisibleColumns({ ...visibleColumns, title: v })
                }
              >
                Title
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.fund}
                onCheckedChange={(v) =>
                  setVisibleColumns({ ...visibleColumns, fund: v })
                }
              >
                Fund
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.type}
                onCheckedChange={(v) =>
                  setVisibleColumns({ ...visibleColumns, type: v })
                }
              >
                Type
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.period}
                onCheckedChange={(v) =>
                  setVisibleColumns({ ...visibleColumns, period: v })
                }
              >
                Period
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.status}
                onCheckedChange={(v) =>
                  setVisibleColumns({ ...visibleColumns, status: v })
                }
              >
                Status
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.uploaded}
                onCheckedChange={(v) =>
                  setVisibleColumns({ ...visibleColumns, uploaded: v })
                }
              >
                Uploaded
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile: Search Bar */}
        <div className="relative w-full xl:hidden">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search documents, funds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full"
          />
        </div>

        {/* Mobile: Filter Toggle + Column Toggle */}
        <div className="flex gap-2 xl:hidden">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Columns3 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={visibleColumns.title}
                onCheckedChange={(v) =>
                  setVisibleColumns({ ...visibleColumns, title: v })
                }
              >
                Title
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.fund}
                onCheckedChange={(v) =>
                  setVisibleColumns({ ...visibleColumns, fund: v })
                }
              >
                Fund
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.type}
                onCheckedChange={(v) =>
                  setVisibleColumns({ ...visibleColumns, type: v })
                }
              >
                Type
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.period}
                onCheckedChange={(v) =>
                  setVisibleColumns({ ...visibleColumns, period: v })
                }
              >
                Period
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.status}
                onCheckedChange={(v) =>
                  setVisibleColumns({ ...visibleColumns, status: v })
                }
              >
                Status
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.uploaded}
                onCheckedChange={(v) =>
                  setVisibleColumns({ ...visibleColumns, uploaded: v })
                }
              >
                Uploaded
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile: Collapsible Filters */}
        {showFilters && (
          <div className="flex flex-col gap-2 xl:hidden">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.values(DocStatus).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.values(DocType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="flex justify-center items-center p-12 sm:p-16 lg:p-20">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredDocuments?.length === 0 ? (
        <div className="text-center p-8 sm:p-12 lg:p-16 border rounded-lg bg-muted/20">
          <p className="text-sm sm:text-base text-muted-foreground">
            No documents found.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View - Up to 1264px */}
          <div className="block xl:hidden space-y-3">
            {filteredDocuments?.map((doc) => (
              <Card key={doc.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate" title={doc.title}>
                        {doc.title}
                      </h3>
                      {visibleColumns.fund && (
                        <p className="text-xs text-muted-foreground truncate" title={doc.fund?.name || doc.fundId}>
                          {doc.fund?.name || doc.fundId}
                        </p>
                      )}
                    </div>
                    {visibleColumns.status && (
                      <Badge
                        className={`${getStatusColor(doc.status)} text-xs shrink-0`}
                        variant="secondary"
                      >
                        {doc.status.replace("_", " ")}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    {visibleColumns.type && (
                      <Badge variant="outline" className="text-xs">
                        {doc.type.replace("_", " ")}
                      </Badge>
                    )}
                    {visibleColumns.period && (
                      <span className="text-muted-foreground">
                        {format(new Date(doc.periodEnd), "MMM yyyy")}
                      </span>
                    )}
                    {visibleColumns.uploaded && (
                      <span className="text-muted-foreground">
                        • {format(new Date(doc.createdAt), "dd MMM yyyy")}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/documents/${doc.id}`}>
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Link>
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to delete this document?"
                            )
                          ) {
                            deleteMutation.mutate(doc.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Table View - 1264px and above */}
          <div className="hidden xl:block rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.title && (
                      <TableHead className="min-w-[180px] lg:min-w-[220px]">
                        Title
                      </TableHead>
                    )}
                    {visibleColumns.fund && (
                      <TableHead className="min-w-[140px] lg:min-w-[160px]">
                        Fund
                      </TableHead>
                    )}
                    {visibleColumns.type && (
                      <TableHead className="min-w-[120px]">Type</TableHead>
                    )}
                    {visibleColumns.period && (
                      <TableHead className="min-w-[100px]">Period</TableHead>
                    )}
                    {visibleColumns.status && (
                      <TableHead className="min-w-[120px]">Status</TableHead>
                    )}
                    {visibleColumns.uploaded && (
                      <TableHead className="min-w-[120px]">Uploaded</TableHead>
                    )}
                    <TableHead className="text-right min-w-[100px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments?.map((doc) => (
                    <TableRow key={doc.id}>
                      {visibleColumns.title && (
                        <TableCell className="font-medium">
                          <div className="truncate max-w-[180px] lg:max-w-[300px]" title={doc.title}>
                            {doc.title}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.fund && (
                        <TableCell>
                          <div className="truncate max-w-[140px] lg:max-w-[200px]" title={doc.fund?.name || doc.fundId}>
                            {doc.fund?.name || doc.fundId}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.type && (
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap">
                            {doc.type.replace("_", " ")}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.period && (
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(doc.periodEnd), "MMM yyyy")}
                        </TableCell>
                      )}
                      {visibleColumns.status && (
                        <TableCell>
                          <Badge
                            className={`${getStatusColor(doc.status)} whitespace-nowrap`}
                            variant="secondary"
                          >
                            {doc.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.uploaded && (
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(doc.createdAt), "dd MMM yyyy")}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/documents/${doc.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                if (
                                  confirm(
                                    "Are you sure you want to delete this document?"
                                  )
                                ) {
                                  deleteMutation.mutate(doc.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}