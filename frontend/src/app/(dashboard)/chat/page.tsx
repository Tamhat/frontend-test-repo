"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MessageSquare,
  Send,
  Plus,
  Trash2,
  FileText,
  Loader2,
  X,
  FolderOpen,
  Search,
  Pencil,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

interface Document {
  id: string;
  title: string;
  type: string;
  status: string;
  fund: {
    name: string;
    code: string;
  };
}

const AI_MODELS = [
  { value: "kwaipilot/kat-coder-pro:free", label: "KAT-Coder-Pro (Free) ⭐" },
  { value: "tngtech/deepseek-r1t2-chimera:free", label: "DeepSeek R1T2 Chimera (Free)" },
  { value: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash (Free)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  // { value: "deepseek/deepseek-chat-v3-0324:free", label: "DeepSeek Chat V3 (Free)" },
  // { value: "meta-llama/llama-4-maverick:free", label: "LLaMA 4 Maverick (Free)" },
  // { value: "deepseek/deepseek-r1:free", label: "DeepSeek R1 (Free)" },
  // { value: "qwen/qwen3-235b-a22b:free", label: "Qwen 3 235B (Free)" },
  // { value: "meta-llama/llama-3.2-3b-instruct:free", label: "LLaMA 3.2 3B (Free)" },
];

export default function ChatPage() {
  const queryClient = useQueryClient();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].value);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [isDocSelectorOpen, setIsDocSelectorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all documents for selection
  const { data: documents, isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["documents-for-chat"],
    queryFn: async () => {
      const { data } = await api.get("/documents");
      return data;
    },
  });

  // Fetch chat sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery<ChatSession[]>({
    queryKey: ["chat-sessions"],
    queryFn: async () => {
      const { data } = await api.get("/chat/sessions");
      return data;
    },
  });

  // Fetch active session messages
  const { data: activeSession, isLoading: messagesLoading } = useQuery<ChatSession>({
    queryKey: ["chat-session", activeSessionId],
    queryFn: async () => {
      const { data } = await api.get(`/chat/sessions/${activeSessionId}`);
      return data;
    },
    enabled: !!activeSessionId,
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  // Create new session
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/chat/sessions", { title: "New Chat" });
      return data;
    },
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
      setActiveSessionId(newSession.id);
      toast.success("New chat session created");
    },
    onError: () => {
      toast.error("Failed to create chat session");
    },
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; documentIds?: string[]; model?: string }) => {
      const { data: response } = await api.post(
        `/chat/sessions/${activeSessionId}/messages`,
        data
      );
      return response;
    },
    onSuccess: async () => {
      setOptimisticMessages([]);
      
      // Auto-rename "New Chat" sessions after first message
      const session = sessions?.find(s => s.id === activeSessionId);
      if (session && session.title === "New Chat") {
        await renameSessionMutation.mutateAsync({
          sessionId: activeSessionId!,
          title: "New Chat", // Backend will auto-generate from first message
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["chat-session", activeSessionId] });
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
    },
    onError: (error: any) => {
      setOptimisticMessages([]);
      setMessage(optimisticMessages[0]?.content || ""); // Restore message on error
      toast.error(error.response?.data?.message || "Failed to send message");
    },
  });

  // Delete session
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await api.delete(`/chat/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
      if (activeSessionId === deleteSessionMutation.variables) {
        setActiveSessionId(null);
      }
      toast.success("Chat session deleted");
    },
    onError: () => {
      toast.error("Failed to delete session");
    },
  });

  // Rename session
  const renameSessionMutation = useMutation({
    mutationFn: async ({ sessionId, title }: { sessionId: string; title: string }) => {
      await api.patch(`/chat/sessions/${sessionId}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["chat-session", activeSessionId] });
      setEditingSessionId(null);
      toast.success("Session renamed");
    },
    onError: () => {
      toast.error("Failed to rename session");
    },
  });

  const handleSendMessage = () => {
    if (!message.trim() || !activeSessionId) return;

    // Add optimistic user message
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: message.trim(),
      createdAt: new Date().toISOString(),
    };
    setOptimisticMessages([userMsg]);
    const messageToSend = message.trim();
    setMessage(""); // Clear input immediately

    sendMessageMutation.mutate({
      message: messageToSend,
      documentIds: selectedDocs.length > 0 ? selectedDocs : undefined,
      model: selectedModel,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId]
    );
  };

  const clearSelectedDocs = () => {
    setSelectedDocs([]);
    toast.success("Cleared selected documents");
  };

  const getSelectedDocDetails = () => {
    if (!documents) return [];
    return documents.filter((doc) => selectedDocs.includes(doc.id));
  };

  // Filter and search documents
  const getFilteredDocuments = () => {
    if (!documents) return [];
    
    return documents.filter((doc) => {
      // Search filter
      const matchesSearch = searchQuery.trim() === "" || 
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.fund.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.fund.code.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Type filter
      const matchesType = filterType === "all" || doc.type === filterType;
      
      // Status filter
      const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  };

  // Get unique types and statuses for filter dropdowns
  const getUniqueTypes = () => {
    if (!documents) return [];
    return Array.from(new Set(documents.map((doc) => doc.type)));
  };

  const getUniqueStatuses = () => {
    if (!documents) return [];
    return Array.from(new Set(documents.map((doc) => doc.status)));
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4">
      {/* Sidebar - Sessions */}
      <Card className="w-full lg:w-80 flex flex-col">
        <CardHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Chat Sessions</CardTitle>
            <Button
              size="sm"
              onClick={() => createSessionMutation.mutate()}
              disabled={createSessionMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full px-4 pb-4">
            {sessionsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : sessions && sessions.length > 0 ? (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent",
                      activeSessionId === session.id && "bg-accent border-blue-500"
                    )}
                    onClick={() => setActiveSessionId(session.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {editingSessionId === session.id ? (
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  renameSessionMutation.mutate({
                                    sessionId: session.id,
                                    title: editingTitle,
                                  });
                                }
                                if (e.key === "Escape") setEditingSessionId(null);
                              }}
                              className="h-7 text-sm"
                              autoFocus
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                renameSessionMutation.mutate({
                                  sessionId: session.id,
                                  title: editingTitle,
                                })
                              }
                              className="h-7 w-7 p-0"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium text-sm truncate">{session.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(session.updatedAt), "MMM d, h:mm a")}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSessionId(session.id);
                            setEditingTitle(session.title);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSessionMutation.mutate(session.id);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No chat sessions yet</p>
                <p className="text-xs mt-1">Create one to get started</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col">
        {!activeSessionId ? (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-blue-600" />
              <h2 className="text-2xl font-bold mb-2">Welcome to AI Chat</h2>
              <p className="text-muted-foreground mb-6">
                Start a new chat session to ask questions about your compliance documents.
              </p>
              <Button onClick={() => createSessionMutation.mutate()}>
                <Plus className="h-4 w-4 mr-2" />
                Start New Chat
              </Button>
            </div>
          </CardContent>
        ) : (
          <>
            {/* Header */}
            <CardHeader className="shrink-0 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {activeSession?.title || "Chat"}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Dialog open={isDocSelectorOpen} onOpenChange={setIsDocSelectorOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1">
                          <FolderOpen className="h-3 w-3" />
                          Select Documents
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle>Select Documents</DialogTitle>
                          <DialogDescription>
                            Choose documents to include as context in your chat
                          </DialogDescription>
                        </DialogHeader>
                        
                        {/* Search and Filters */}
                        <div className="space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search by title, fund name, or fund code..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                          
                          <div className="flex gap-2">
                            <Select value={filterType} onValueChange={setFilterType}>
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filter by type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {getUniqueTypes().map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filter by status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {getUniqueStatuses().map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <ScrollArea className="h-[400px] pr-4">
                          {documentsLoading ? (
                            <div className="flex justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                          ) : getFilteredDocuments().length > 0 ? (
                            <div className="space-y-2">
                              {getFilteredDocuments().map((doc) => (
                                <div
                                  key={doc.id}
                                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent cursor-pointer"
                                  onClick={() => toggleDocSelection(doc.id)}
                                >
                                  <Checkbox
                                    checked={selectedDocs.includes(doc.id)}
                                    onCheckedChange={() => toggleDocSelection(doc.id)}
                                    className="mt-1"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">{doc.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {doc.fund.name} ({doc.fund.code}) • {doc.type} • {doc.status}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">
                                {searchQuery || filterType !== "all" || filterStatus !== "all"
                                  ? "No documents match your filters"
                                  : "No documents available"}
                              </p>
                            </div>
                          )}
                        </ScrollArea>
                        <div className="flex justify-between items-center pt-4 border-t">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {selectedDocs.length} selected • {getFilteredDocuments().length} shown of {documents?.length || 0}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {(searchQuery || filterType !== "all" || filterStatus !== "all") && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSearchQuery("");
                                  setFilterType("all");
                                  setFilterStatus("all");
                                }}
                              >
                                Clear Filters
                              </Button>
                            )}
                            <Button onClick={() => setIsDocSelectorOpen(false)}>
                              Done
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    {selectedDocs.length > 0 && (
                      <>
                        <div className="flex flex-wrap gap-1">
                          {getSelectedDocDetails().slice(0, 2).map((doc) => (
                            <Badge key={doc.id} variant="secondary" className="gap-1">
                              <FileText className="h-3 w-3" />
                              {doc.title}
                              <X
                                className="h-3 w-3 cursor-pointer hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleDocSelection(doc.id);
                                }}
                              />
                            </Badge>
                          ))}
                          {selectedDocs.length > 2 && (
                            <Badge variant="secondary">
                              +{selectedDocs.length - 2} more
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearSelectedDocs}
                          className="h-6 px-2 text-xs"
                        >
                          Clear All
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messagesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (activeSession?.messages && activeSession.messages.length > 0) || optimisticMessages.length > 0 ? (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {[...(activeSession?.messages || []), ...optimisticMessages].map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-3",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-lg px-4 py-2 max-w-[80%]",
                          msg.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-muted"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap wrap-break-word">
                          {msg.content}
                        </p>
                        <p
                          className={cn(
                            "text-xs mt-1",
                            msg.role === "user"
                              ? "text-blue-100"
                              : "text-muted-foreground"
                          )}
                        >
                          {format(new Date(msg.createdAt), "h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                  {sendMessageMutation.isPending && (
                    <div className="flex justify-start gap-3">
                      <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">AI is thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No messages yet. Start the conversation!</p>
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="shrink-0 border-t p-4">
              <div className="flex gap-2 max-w-3xl mx-auto">
                <Input
                  placeholder="Ask a question about your documents..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground text-center mt-2 max-w-3xl mx-auto space-y-1">
                <p>
                  {selectedDocs.length > 0
                    ? `✓ ${selectedDocs.length} document${selectedDocs.length !== 1 ? "s" : ""} included in context`
                    : "Click 'Select Documents' to add context"}
                </p>
                {sendMessageMutation.isPending && (
                  <p className="text-blue-600">⏳ Sending with {selectedDocs.length} document{selectedDocs.length !== 1 ? "s" : ""} context...</p>
                )}\n              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
