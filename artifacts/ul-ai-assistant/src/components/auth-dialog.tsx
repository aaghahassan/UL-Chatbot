import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuthForm } from "@/components/auth-form";
import { useAuth } from "@/lib/auth";

type ChatAuthContextValue = {
  goToChat: (path?: string) => void;
};

const ChatAuthContext = createContext<ChatAuthContextValue | null>(null);

export function ChatAuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { user, refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const [nextPath, setNextPath] = useState("/chat");
  const busyRef = useRef(false);
  const formKey = useRef(0);

  const goToChat = useCallback(
    (path = "/chat") => {
      void (async () => {
        if (user) {
          setLocation(path);
          return;
        }
        const existing = await refresh();
        if (existing) {
          setLocation(path);
          return;
        }
        setNextPath(path);
        formKey.current += 1;
        setOpen(true);
      })();
    },
    [user, refresh, setLocation],
  );

  return (
    <ChatAuthContext.Provider value={{ goToChat }}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && busyRef.current) return;
          setOpen(next);
        }}
      >
        <DialogContent
          className="max-w-sm rounded-2xl p-6"
          onPointerDownOutside={(event) => {
            if (busyRef.current) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (busyRef.current) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (busyRef.current) event.preventDefault();
          }}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Log in or sign up</DialogTitle>
            <DialogDescription>Create or use an account to chat with the AI assistant.</DialogDescription>
          </DialogHeader>
          <AuthForm
            key={formKey.current}
            onBusyChange={(busy) => {
              busyRef.current = busy;
            }}
            onSuccess={() => {
              busyRef.current = false;
              setOpen(false);
              setLocation(nextPath);
            }}
          />
        </DialogContent>
      </Dialog>
    </ChatAuthContext.Provider>
  );
}

export function useGoToChat(): ChatAuthContextValue["goToChat"] {
  const ctx = useContext(ChatAuthContext);
  if (!ctx) throw new Error("useGoToChat must be used inside ChatAuthProvider");
  return ctx.goToChat;
}
