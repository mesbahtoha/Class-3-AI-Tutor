"use client";

import { use } from "react";
import { TutorWorkspace } from "@/features/tutor/TutorWorkspace";

export default function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = use(params);
  return <TutorWorkspace initialConversationId={conversationId} />;
}
