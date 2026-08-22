import { Plus, Sparkles, X, Pin, PinOff, Pencil, Trash2, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export type ChatConversation = {
  id: number;
  title: string;
  pinned: boolean;
};

type Props = {
  conversations: ChatConversation[] | undefined;
  isLoading: boolean;
  activeId?: number;
  renamingId: number | null;
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onStartRename: (id: number, title: string) => void;
  onSubmitRename: (id: number) => void;
  onCancelRename: () => void;
  onSelect: (id: number) => void;
  onNewChat: () => void;
  onPin: (id: number, pinned: boolean) => void;
  onDelete: (id: number) => void;
  onDownload: (id: number, title: string) => void;
  onDownloadAll: () => void;
  downloadingId: number | null;
  downloadingAll: boolean;
  onCloseMobile?: () => void;
  showClose?: boolean;
};

export function ConversationSidebar({
  conversations,
  isLoading,
  activeId,
  renamingId,
  renameValue,
  onRenameValueChange,
  onStartRename,
  onSubmitRename,
  onCancelRename,
  onSelect,
  onNewChat,
  onPin,
  onDelete,
  onDownload,
  onDownloadAll,
  downloadingId,
  downloadingAll,
  onCloseMobile,
  showClose,
}: Props) {
  const pinnedConvs = conversations?.filter((c) => Boolean(c.pinned)) ?? [];
  const recentConvs = conversations?.filter((c) => !Boolean(c.pinned)) ?? [];

  const renderItem = (conv: ChatConversation) => {
    const isActive = activeId === conv.id;
    const isPinned = Boolean(conv.pinned);

    if (renamingId === conv.id) {
      return (
        <div key={conv.id} className="px-1 py-1">
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            onBlur={() => onSubmitRename(conv.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmitRename(conv.id);
              if (e.key === "Escape") onCancelRename();
            }}
            className="h-9 text-sm"
            placeholder="Chat title"
          />
        </div>
      );
    }

    return (
      <div
        key={conv.id}
        className={`rounded-xl border p-2.5 space-y-2 ${
          isActive
            ? "border-primary/40 bg-accent"
            : "border-border bg-card hover:border-muted-foreground/30"
        }`}
      >
        <button
          type="button"
          onClick={() => onSelect(conv.id)}
          className="w-full text-left text-sm font-medium text-foreground leading-snug break-words whitespace-normal"
          title={conv.title}
        >
          {isPinned && <Pin className="inline h-3 w-3 mr-1 text-primary align-text-top" />}
          {conv.title || "Untitled chat"}
        </button>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            className="flex items-center justify-center gap-1 h-8 rounded-lg border border-border bg-card text-[11px] font-semibold text-foreground hover:bg-accent"
            onClick={() => onPin(conv.id, isPinned)}
          >
            {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            {isPinned ? "Unpin" : "Pin"}
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-1 h-8 rounded-lg border border-border bg-card text-[11px] font-semibold text-foreground hover:bg-accent"
            onClick={() => onStartRename(conv.id, conv.title || "")}
          >
            <Pencil className="h-3.5 w-3.5" />
            Rename
          </button>
          <button
            type="button"
            disabled={downloadingId === conv.id || downloadingAll}
            className="flex items-center justify-center gap-1 h-8 rounded-lg border border-border bg-card text-[11px] font-semibold text-foreground hover:bg-accent disabled:opacity-60"
            onClick={() => onDownload(conv.id, conv.title || "Untitled chat")}
            title="Save this chat as an HTML file you can open offline"
          >
            {downloadingId === conv.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Save
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-1 h-8 rounded-lg border border-red-200 dark:border-red-900 bg-card text-[11px] font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={() => {
              if (window.confirm(`Delete “${conv.title || "this chat"}”?`)) {
                onDelete(conv.id);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-card border-r min-w-0 w-full">
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Chat History
        </h2>
        {showClose && (
          <Button variant="ghost" size="icon" onClick={onCloseMobile}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="p-4 shrink-0 space-y-2">
        <Button
          className="w-full justify-start gap-2 bg-primary/10 text-primary hover:bg-primary/20 border-0"
          variant="outline"
          onClick={onNewChat}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
        <Button
          className="w-full justify-start gap-2"
          variant="outline"
          disabled={!conversations?.length || downloadingAll || downloadingId !== null}
          onClick={onDownloadAll}
          title="Download every chat as one HTML file you can open without internet"
        >
          {downloadingAll ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {downloadingAll ? "Saving…" : "Download all chats"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2 min-h-0">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[4.5rem] w-full rounded-xl" />
            ))}
          </div>
        ) : !conversations?.length ? (
          <p className="text-sm text-muted-foreground text-center py-6">No chats yet</p>
        ) : (
          <>
            {pinnedConvs.length > 0 && (
              <>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  Pinned
                </p>
                {pinnedConvs.map(renderItem)}
              </>
            )}
            {recentConvs.length > 0 && (
              <>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pt-1 px-1">
                  Recent
                </p>
                {recentConvs.map(renderItem)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
