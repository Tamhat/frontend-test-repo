"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Document, DocStatus } from "@/types";
import { useParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { Loader2, Download, Check, X } from "lucide-react";

interface DocumentWithAudit extends Document {
  uploadedBy: { name: string; email: string };
  auditLogs: Array<{
    id: string;
    action: string;
    timestamp: string;
    user: { name: string };
    details: Record<string, unknown>;
  }>;
  description?: string;
}

export default function DocumentDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: doc, isLoading } = useQuery<DocumentWithAudit>({
    queryKey: ["document", id],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/documents/${id}`);
        return data;
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "response" in err &&
          err.response &&
          typeof err.response === "object" &&
          "status" in err.response &&
          err.response.status === 404
        ) {
          toast.error("Document not found");
        } else {
          toast.error("Failed to load document");
        }
        throw err;
      }
    },
    retry: false,
  });

  // Lightweight client-side guard: allow moving from non-final states to APPROVED/REJECTED.
  const isValidTransition = (current: DocStatus | undefined, target: DocStatus) => {
    if (!current) return true;
    const finalStates = [DocStatus.APPROVED, DocStatus.REJECTED, DocStatus.ARCHIVED];
    if (finalStates.includes(current)) return false;
    return target === DocStatus.APPROVED || target === DocStatus.REJECTED;
  };

  const updateStatus = useMutation({
    mutationFn: async (status: DocStatus) => {
      if (!isValidTransition(doc?.status as DocStatus | undefined, status)) {
        throw new Error(`Invalid transition from "${doc?.status}" to "${status}"`);
      }
      const response = await api.patch(`/documents/${id}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Document status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["document", id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update status");
      console.error(error);
    },
  });

  const handleDownload = async () => {
    try {
      toast.info("Preparing download...");
      const response = await api.get(`/documents/${id}/download`, {
        responseType: "blob",
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${doc?.title || "document"}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Document downloaded successfully");
    } catch (error: unknown) {
      console.error("Download error:", error);
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "status" in error.response
      ) {
        if (error.response.status === 404) {
          toast.error("Document file not found on server");
        } else if (error.response.status === 500) {
          toast.error(
            "Server error while downloading. The file may not exist."
          );
        } else if (
          "data" in error.response &&
          error.response.data &&
          typeof error.response.data === "object" &&
          "message" in error.response.data &&
          typeof error.response.data.message === "string"
        ) {
          toast.error(error.response.data.message);
        } else {
          toast.error("Failed to download document");
        }
      } else {
        toast.error("Failed to download document");
      }
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!doc) return <div>Document not found</div>;

  // Only show approve/reject if user can approve AND document is not finalized
  const canApprove =
    (user?.role === "ADMIN" || user?.role === "AUDITOR") &&
    doc.status !== DocStatus.APPROVED &&
    doc.status !== DocStatus.REJECTED;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight wrap-break-word">
            {doc.title}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Fund: {doc.fund?.name || doc.fundId} ({doc.fund?.code}) • Type:{" "}
            {doc.type}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-initial"
          >
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Download</span>
          </Button>
          {canApprove && (
            <>
              <Button
                onClick={() => updateStatus.mutate(DocStatus.APPROVED)}
                disabled={updateStatus.isPending}
                size="sm"
                className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700"
              >
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                onClick={() => updateStatus.mutate(DocStatus.REJECTED)}
                disabled={updateStatus.isPending}
                variant="destructive"
                size="sm"
                className="flex-1 sm:flex-initial"
              >
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">
              Document Preview
            </CardTitle>
            <CardDescription className="text-sm">
              File details and metadata.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Period End
                </p>
                <p className="font-medium">
                  {format(new Date(doc.periodEnd), "PPP")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Uploaded By
                </p>
                <p className="font-medium">
                  {doc.uploadedBy?.name || "System Admin"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Upload Date
                </p>
                <p className="font-medium">
                  {format(new Date(doc.createdAt), "PPP p")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Status
                </p>
                <Badge
                  className={
                    doc.status === DocStatus.APPROVED
                      ? "bg-green-100 text-green-800"
                      : doc.status === DocStatus.REJECTED
                      ? "bg-red-100 text-red-800"
                      : doc.status === DocStatus.IN_REVIEW
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }
                  variant="secondary"
                >
                  {doc.status}
                </Badge>
              </div>
            </div>
            {doc.description && (
              <div className="pt-3 border-t">
                <p className="text-muted-foreground text-xs sm:text-sm mb-1">
                  Description
                </p>
                <p className="text-sm">{doc.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-900 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Audit Trail</CardTitle>
            <CardDescription className="text-sm">
              Document activity history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {doc.auditLogs?.map(
                (log: DocumentWithAudit["auditLogs"][number]) => (
                  <div key={log.id} className="flex gap-3 text-sm">
                    <div className="shrink-0 w-1.5 bg-blue-500 rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {format(new Date(log.timestamp), "PPP p")}{" "}
                      </p>
                      <p className="font-medium text-sm sm:text-base wrap-break-word">
                        {log.user?.name || "System"} performed{" "}
                        <strong>{log.action}</strong>
                      </p>
                      {log.details && (
                        <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}