"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import ActiveCallSession from "../../../components/ActiveCallSession";
import { useSelectedCall } from "../../../context/SelectedCallContext";

export default function CallPage() {
  const { callId } = useParams<{ callId: string }>();
  const { selectCall } = useSelectedCall();

  // Sync the route param into selection context (handles direct URL navigation / refresh)
  useEffect(() => {
    if (callId) selectCall(callId);
  }, [callId, selectCall]);

  return <ActiveCallSession />;
}
