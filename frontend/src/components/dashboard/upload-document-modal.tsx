"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  fundId: z.string().min(1, "Fund is required"),
  type: z.string().min(1, "Document type is required"),
  periodStart: z.string(),
  periodEnd: z.string(),
  description: z.string().optional(),
  file: z.any(),
});

export function UploadDocumentModal() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();


  const { data: funds } = useQuery({
    queryKey: ["funds"],
    queryFn: async () => {
      const { data } = await api.get("/funds");
      return data;
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      fundId: "",
      type: "",
      periodStart: "",
      periodEnd: "",
      description: "",
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const file = values.file[0];

      if (!file) {
        throw new Error("File is required");
      }


      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 50) {
        console.warn("Large file detected, may take longer to process");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", values.title);
      formData.append("fundId", values.fundId);
      formData.append("type", values.type);
      formData.append("periodStart", values.periodStart);
      formData.append("periodEnd", values.periodEnd);
      if (values.description)
        formData.append("description", values.description);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Upload timeout")), 30000);
      });

      const uploadPromise = api.post("/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { data } = (await Promise.race([
        uploadPromise,
        timeoutPromise,
      ])) as any;
      return data;
    },
    onSuccess: () => {
      toast.success("Document uploaded successfully");

      // Invalidate ALL documents-related queries to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: ["documents"],
        refetchType: "active"
      });


      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error("Upload error:", error);

      if (error.message === "Upload timeout") {
        toast.error("Upload timed out. Please try again.");
        return;
      }

      toast.error(error.response?.data?.message || "Failed to upload document");
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    uploadMutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UploadCloud className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload New Document</DialogTitle>
          <DialogDescription>
            Submit a document for compliance review.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Q4 2024 Annual Report" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fundId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fund</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a fund" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {funds?.map((fund: any) => (
                        <SelectItem key={fund.id} value={fund.id}>
                          {fund.code} - {fund.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ANNUAL_REPORT">
                        Annual Report
                      </SelectItem>
                      <SelectItem value="COMPLIANCE_CERT">
                        Compliance Certificate
                      </SelectItem>
                      <SelectItem value="RISK_DISCLOSURE">
                        Risk Disclosure
                      </SelectItem>
                      <SelectItem value="REGULATORY_FILING">
                        Regulatory Filing
                      </SelectItem>
                      <SelectItem value="INTERNAL_MEMO">
                        Internal Memo
                      </SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="periodStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period Start</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="periodEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period End</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Additional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>File</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => onChange(e.target.files)}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
