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

  // Load selected docs from localStorage on mount
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

  // Toggle document selection for chat
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

  // Filter documents by search query
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
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-base text-muted-foreground">
            View and manage compliance documents.
          </p>
        </div>
        {canUpload && <UploadDocumentModal />}
      </div>

      <div className="flex flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents, funds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
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
            <Button variant="outline" size="icon" className="flex">
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

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading...
        </div>
      ) : filteredDocuments?.length === 0 ? (
        <div className="text-center p-12 border rounded-lg">
          <p className="text-muted-foreground">No documents found.</p>
        </div>
      ) : (
        <div className="block rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.title && <TableHead>Title</TableHead>}
                {visibleColumns.fund && <TableHead>Fund</TableHead>}
                {visibleColumns.type && <TableHead>Type</TableHead>}
                {visibleColumns.period && <TableHead>Period</TableHead>}
                {visibleColumns.status && <TableHead>Status</TableHead>}
                {visibleColumns.uploaded && <TableHead>Uploaded</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments?.map((doc) => (
                <TableRow key={doc.id}>
                  {visibleColumns.title && (
                    <TableCell className="font-medium">{doc.title}</TableCell>
                  )}
                  {visibleColumns.fund && (
                    <TableCell>{doc.fund?.name || doc.fundId}</TableCell>
                  )}
                  {visibleColumns.type && (
                    <TableCell>
                      <Badge variant="outline">
                        {doc.type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.period && (
                    <TableCell>
                      {format(new Date(doc.periodEnd), "MMM yyyy")}
                    </TableCell>
                  )}
                  {visibleColumns.status && (
                    <TableCell>
                      <Badge
                        className={getStatusColor(doc.status)}
                        variant="secondary"
                      >
                        {doc.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.uploaded && (
                    <TableCell>
                      {format(new Date(doc.createdAt), "dd MMM yyyy")}
                    </TableCell>
                  )}
                  <TableCell className="text-right space-x-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/documents/${doc.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
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
                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
