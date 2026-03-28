"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import ActiveCallSession from "../../../components/ActiveCallSession";
import { useSignalOSContext } from "../../../context/SignalOSContext";

export default function CallPage() {
  const { callId } = useParams<{ callId: string }>();
  const { sendCommand } = useSignalOSContext();

  // Sync the route param into backend selection (handles direct URL navigation / refresh)
  useEffect(() => {
    if (callId) sendCommand({ type: "SELECT_CALL", callId });
  }, [callId, sendCommand]);

  return <ActiveCallSession />;
}
