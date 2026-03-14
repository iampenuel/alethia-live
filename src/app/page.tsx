"use client";

import {
  ChangeEvent,
  DragEvent,
  SVGProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlethiaLiveClient, LiveSessionState } from "@/lib/live/client";
import { LIVE_SYSTEM_PROMPT } from "@/lib/safety/liveSystemPrompt";
import { PcmAudioPlayer } from "@/lib/audio/player";
import { BrowserMicInput } from "@/lib/audio/mic";

type SummaryResult = {
  ok: true;
  summary: string;
  carePath: string;
  keyPoints: string[];
  questionsForClinician: string[];
  redFlags: string[];
  safetyNote: string;
};

type TranscriptEntry = {
  time: string;
  label: "ALETHIA" | "SYSTEM";
  text: string;
};

const SAMPLE_DOC_PATHS = [
  "/samples/after-visit-summary-better.png",
  "/samples/appointment-instructions-better.png",
  "/samples/discharge-instructions-better.png",
];

const DEFAULT_BUBBLE_TEXT =
  "Hi, I’m Alethia Live.\nI can help you understand a healthcare screenshot, talk through a care question at a high level, suggest questions to ask a clinician, and point out urgent red flags.\nTap my portrait to begin, or upload a screenshot on the right.";

const INTRO_BUBBLE_TEXT =
  "Hi, I’m Alethia Live.\nI’m here to help you understand healthcare information more clearly.\nYou can ask me about a care question, or upload something like an after-visit summary, discharge instructions, or a clinic document screenshot.";

const INTRO_PROMPT =
  "Introduce yourself in 3 short friendly sentences. Say that you are Alethia Live, a real-time healthcare navigation and health literacy companion. Explain that you can help the user understand a healthcare document, talk through a care question at a high level, suggest questions to ask a clinician, and point out urgent red flags. Clearly say that you are informational only and not a diagnosis tool. End with one simple example of what the user could ask you first.";

function getVisibleSystemTranscript(text: string): string | null {
  if (
    text.startsWith("Live WebSocket connected.") ||
    text.startsWith("Setup message sent.") ||
    text.startsWith("Binary frame received") ||
    text.startsWith("Non-JSON frame:") ||
    text.startsWith("Message received:") ||
    text.startsWith("Sent Alethia intro prompt.") ||
    text.startsWith("Model turn complete.") ||
    text.startsWith("Server sent goAway notice.") ||
    text.startsWith("Failed to process message:") ||
    text.startsWith("Failed to play audio chunk:") ||
    text.startsWith("Socket closed (code")
  ) {
    return null;
  }

  if (text === "Requesting live session...") {
    return "Starting session";
  }

  if (text === "Setup complete.") {
    return "Alethia is ready";
  }

  if (text.startsWith("Mic streaming started")) {
    return "Alethia is listening";
  }

  if (text === "Mic streaming stopped.") {
    return "Alethia stopped listening";
  }

  if (text === "Session ended by user.") {
    return "Session ended";
  }

  if (text.startsWith("Loaded sample document:")) {
    return "Sample document loaded";
  }

  if (text.startsWith("Document analyzed:")) {
    return "Document explained";
  }

  if (text === "Socket error.") {
    return "Connection interrupted";
  }

  if (text.startsWith("Failed to start session:")) {
    return "Could not start session";
  }

  if (text.startsWith("Failed to start mic:")) {
    return "Could not start microphone";
  }

  if (text.startsWith("Failed to stop mic:")) {
    return "Could not stop microphone";
  }

  if (text.startsWith("Failed to send setup:")) {
    return "Could not prepare session";
  }

  if (text.startsWith("Failed to send intro prompt:")) {
    return "Could not start intro";
  }

  return null;
}

export default function HomePage() {
  const clientRef = useRef<AlethiaLiveClient | null>(null);
  const audioPlayerRef = useRef<PcmAudioPlayer>(new PcmAudioPlayer());
  const micRef = useRef<BrowserMicInput>(new BrowserMicInput());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const speechChunksRef = useRef<string[]>([]);

  const [status, setStatus] = useState<LiveSessionState>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [setupComplete, setSetupComplete] = useState(false);
  const [isMicStreaming, setIsMicStreaming] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const [summaryError, setSummaryError] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [isAlethiaSpeaking, setIsAlethiaSpeaking] = useState(false);
  const [bubbleText, setBubbleText] = useState(DEFAULT_BUBBLE_TEXT);
  const [pendingAutoIntro, setPendingAutoIntro] = useState(false);

  const client = useMemo(() => {
    if (!clientRef.current) {
      clientRef.current = new AlethiaLiveClient();
    }
    return clientRef.current;
  }, []);

  useEffect(() => {
    return () => {
      void micRef.current.stop();
      void audioPlayerRef.current.close();
    };
  }, []);

  function addLog(message: string) {
    setLogs((prev) => [`${new Date().toLocaleTimeString()} — ${message}`, ...prev]);
  }

  function clearUploadState() {
    setSelectedFile(null);
    setSelectedFileName("");
    setSummaryResult(null);
    setSummaryError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function decodeEventData(data: string | ArrayBuffer | Blob): Promise<string | null> {
    if (typeof data === "string") {
      return data;
    }

    try {
      if (data instanceof ArrayBuffer) {
        return new TextDecoder().decode(new Uint8Array(data));
      }

      if (data instanceof Blob) {
        return await data.text();
      }

      return null;
    } catch {
      return null;
    }
  }

  function appendSpeechChunk(chunk: string) {
    const normalized = chunk.replace(/\s+/g, " ").trim();
    if (!normalized) {
      return;
    }

    const chunks = speechChunksRef.current;
    const last = chunks[chunks.length - 1];

    if (!last) {
      chunks.push(normalized);
      return;
    }

    if (normalized === last) {
      return;
    }

    if (normalized.startsWith(last)) {
      chunks[chunks.length - 1] = normalized;
      return;
    }

    if (last.startsWith(normalized)) {
      return;
    }

    chunks.push(normalized);
  }

  function finalizeSpeechChunks() {
    const text = speechChunksRef.current.join(" ").replace(/\s+/g, " ").trim();
    speechChunksRef.current = [];
    return text;
  }

  function formatBubbleText(text: string) {
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned) {
      return DEFAULT_BUBBLE_TEXT;
    }

    const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
    return sentences.slice(-3).join(" ");
  }

  async function handleStartSession(options?: { autoIntro?: boolean }) {
    try {
      if (options?.autoIntro) {
        setPendingAutoIntro(true);
        setBubbleText(INTRO_BUBBLE_TEXT);
      }

      setStatus("connecting");
      setSetupComplete(false);
      speechChunksRef.current = [];
      addLog("Requesting live session...");

      await audioPlayerRef.current.init();

      await client.connect({
        onOpen: () => {
          setStatus("connected");
          addLog("Live WebSocket connected.");

          try {
            client.sendSetup(LIVE_SYSTEM_PROMPT);
            addLog("Setup message sent.");
          } catch (error) {
            addLog(
              `Failed to send setup: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        },
        onClose: (event) => {
          void micRef.current.stop();
          audioPlayerRef.current.stop();
          setIsMicStreaming(false);
          setIsAlethiaSpeaking(false);
          setStatus("idle");
          setSetupComplete(false);
          setPendingAutoIntro(false);
          speechChunksRef.current = [];
          addLog(
            `Socket closed (code ${event.code}${event.reason ? `, reason: ${event.reason}` : ""}).`
          );
        },
        onError: () => {
          void micRef.current.stop();
          setIsMicStreaming(false);
          setIsAlethiaSpeaking(false);
          setStatus("error");
          setBubbleText(
            "The connection was interrupted.\nTap my portrait or press Start Session to try again."
          );
          addLog("Socket error.");
        },
        onMessage: async (event) => {
          try {
            const decoded = await decodeEventData(event.data);

            if (!decoded) {
              const bytes =
                event.data instanceof ArrayBuffer
                  ? event.data.byteLength
                  : event.data instanceof Blob
                    ? event.data.size
                    : 0;

              addLog(`Binary frame received (${bytes} bytes).`);
              return;
            }

            let message: any;
            try {
              message = JSON.parse(decoded);
            } catch {
              const preview = decoded.slice(0, 120).replace(/\s+/g, " ");
              addLog(`Non-JSON frame: ${preview}`);
              return;
            }

            if (message.setupComplete) {
              setSetupComplete(true);
              addLog("Setup complete.");
              return;
            }

            const outputTranscript =
              message.serverContent?.outputTranscription?.text ??
              message.serverContent?.outputAudioTranscription?.text;

            if (outputTranscript) {
              appendSpeechChunk(outputTranscript);
              setIsAlethiaSpeaking(true);
              addLog(`Alethia transcript: ${outputTranscript}`);
            }

            const modelParts = message.serverContent?.modelTurn?.parts;

            if (Array.isArray(modelParts)) {
              for (const part of modelParts) {
                const inlineData = part?.inlineData;

                if (!inlineData?.data) {
                  continue;
                }

                const mimeType = inlineData.mimeType ?? "";

                if (mimeType.startsWith("audio/pcm")) {
                  try {
                    audioPlayerRef.current.enqueueBase64Pcm(inlineData.data);
                  } catch (error) {
                    console.error("Failed to play audio chunk:", error);
                    addLog(
                      `Failed to play audio chunk: ${
                        error instanceof Error ? error.message : "Unknown error"
                      }`
                    );
                  }
                }
              }
            }

            if (message.serverContent?.turnComplete) {
              const finalizedText = finalizeSpeechChunks();

              if (finalizedText) {
                setBubbleText(formatBubbleText(finalizedText));
              }

              setIsAlethiaSpeaking(false);
              addLog("Model turn complete.");
            }

            if (message.goAway) {
              addLog("Server sent goAway notice.");
            }

            if (
              !message.setupComplete &&
              !message.serverContent &&
              !message.goAway &&
              !message.toolCall &&
              !message.sessionResumptionUpdate
            ) {
              addLog(`Message received: ${decoded.slice(0, 200)}`);
            }
          } catch (error) {
            addLog(
              `Failed to process message: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        },
      });
    } catch (error) {
      setStatus("error");
      setBubbleText(
        "I couldn’t start the session.\nTap my portrait or press Start Session to try again."
      );
      addLog(
        `Failed to start session: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async function handleStartMic() {
    try {
      audioPlayerRef.current.stop();

      await micRef.current.start((base64Data, mimeType) => {
        try {
          client.sendAudioChunk(base64Data, mimeType);
        } catch (error) {
          console.error("Failed to send audio chunk:", error);
        }
      });

      setIsMicStreaming(true);
      setBubbleText(
        "I’m listening now.\nTell me what care question you have, or what screenshot you want help understanding."
      );
      addLog(`Mic streaming started (${micRef.current.sampleRate} Hz).`);
    } catch (error) {
      addLog(`Failed to start mic: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async function handleStopMic() {
    try {
      await micRef.current.stop();
      client.sendAudioStreamEnd();
      setIsMicStreaming(false);
      setBubbleText(
        "I stopped listening.\nTap my portrait again when you’re ready to keep talking."
      );
      addLog("Mic streaming stopped.");
    } catch (error) {
      addLog(`Failed to stop mic: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async function handleEndSession() {
    await micRef.current.stop();
    audioPlayerRef.current.stop();
    client.disconnect();
    setIsMicStreaming(false);
    setIsAlethiaSpeaking(false);
    setStatus("idle");
    setSetupComplete(false);
    setPendingAutoIntro(false);
    speechChunksRef.current = [];
    setBubbleText(DEFAULT_BUBBLE_TEXT);
    addLog("Session ended by user.");
  }

  async function handlePresenceAction() {
    if (status === "connecting") {
      return;
    }

    if (status === "idle" || status === "error") {
      await handleStartSession({ autoIntro: true });
      return;
    }

    if (status === "connected" && !setupComplete) {
      setBubbleText("I’m getting set up.\nI’ll introduce myself in just a moment.");
      return;
    }

    if (isMicStreaming) {
      await handleStopMic();
      return;
    }

    await handleStartMic();
  }

  useEffect(() => {
    async function runAutoIntro() {
      if (!pendingAutoIntro || status !== "connected" || !setupComplete) {
        return;
      }

      try {
        client.sendText(INTRO_PROMPT);
        addLog("Sent Alethia intro prompt.");
      } catch (error) {
        addLog(
          `Failed to send intro prompt: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      } finally {
        setPendingAutoIntro(false);
      }
    }

    void runAutoIntro();
  }, [client, pendingAutoIntro, setupComplete, status]);

  function handleSelectedFile(file: File | null) {
    if (!file) {
      setSelectedFile(null);
      setSelectedFileName("");
      setSummaryResult(null);
      setSummaryError("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSelectedFile(null);
      setSelectedFileName("");
      setSummaryResult(null);
      setSummaryError("Please upload an image or screenshot for this demo.");
      return;
    }

    setSelectedFile(file);
    setSelectedFileName(file.name);
    setSummaryResult(null);
    setSummaryError("");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    handleSelectedFile(event.target.files?.[0] ?? null);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingFile(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingFile(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingFile(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    handleSelectedFile(file);
  }

  async function handleUseSampleDoc() {
    setSummaryError("");

    for (const path of SAMPLE_DOC_PATHS) {
      try {
        const response = await fetch(path);

        if (!response.ok) {
          continue;
        }

        const blob = await response.blob();
        const fileName = path.split("/").pop() ?? "sample-document.png";
        const file = new File([blob], fileName, {
          type: blob.type || "image/png",
        });

        handleSelectedFile(file);
        addLog(`Loaded sample document: ${fileName}`);
        return;
      } catch {
        // Try next candidate
      }
    }

    setSummaryError(
      "No sample document was found. Add one of the demo files to public/samples and try again."
    );
  }

  async function handleAnalyzeFile() {
    if (!selectedFile) {
      setSummaryError("Please choose a screenshot first.");
      return;
    }

    try {
      setIsAnalyzingFile(true);
      setSummaryError("");
      setSummaryResult(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/summary", {
        method: "POST",
        body: formData,
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(
          typeof json?.error === "string" ? json.error : "Failed to analyze file."
        );
      }

      setSummaryResult(json as SummaryResult);
      addLog(`Document analyzed: ${selectedFile.name}`);
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsAnalyzingFile(false);
    }
  }

  async function handleCopyQuestions() {
    if (!summaryResult?.questionsForClinician?.length) {
      return;
    }

    try {
      const content = summaryResult.questionsForClinician
        .map((question, index) => `${index + 1}. ${question}`)
        .join("\n");

      await navigator.clipboard.writeText(content);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  }

  const transcriptEntries: TranscriptEntry[] = [...logs]
    .reverse()
    .map((entry) => {
      const [time = "", ...rest] = entry.split(" — ");
      const text = rest.join(" — ").trim();

      if (text.startsWith("Alethia transcript: ")) {
        return {
          time,
          label: "ALETHIA" as const,
          text: text.replace("Alethia transcript: ", ""),
        };
      }

      const visibleText = getVisibleSystemTranscript(text);

      if (!visibleText) {
        return null;
      }

      return {
        time,
        label: "SYSTEM" as const,
        text: visibleText,
      };
    })
    .filter((entry): entry is TranscriptEntry => entry !== null);

  const primarySessionLabel =
    status === "connected"
      ? "End Session"
      : status === "connecting"
        ? "Connecting..."
        : "Start Session";

  const sessionStatusText =
    status === "connecting"
      ? "Starting your live session..."
      : status === "error"
        ? "The connection was interrupted. Try again."
        : status === "connected" && !setupComplete
          ? "Getting Alethia ready..."
          : status === "connected" && isMicStreaming
            ? "Alethia is listening now."
            : status === "connected" && setupComplete
              ? "Session ready. Tap Alethia to speak."
              : "Start a live session or upload a screenshot to begin.";

  const portraitStatusText =
    status === "connecting"
      ? "Connecting..."
      : isAlethiaSpeaking
        ? "Speaking..."
        : isMicStreaming
          ? "Listening..."
          : status === "connected" && setupComplete
            ? "Tap to speak"
            : "Tap to begin";

  const portraitGlowClass =
    isAlethiaSpeaking || isMicStreaming
      ? "shadow-[0_18px_50px_rgba(62,125,255,0.24)]"
      : "shadow-[0_12px_28px_rgba(70,99,145,0.12)]";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#ebf4ff_0%,#f7fbff_100%)] text-slate-900">
      <div className="mx-auto w-full max-w-[1680px] px-3 py-4 sm:px-4 lg:px-5">
        <section className="grid w-full overflow-hidden rounded-[34px] border border-white/70 bg-white/58 shadow-[0_24px_72px_rgba(51,78,119,0.12)] backdrop-blur-sm lg:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-5 border-b border-slate-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(248,251,255,0.9))] px-5 py-5 sm:px-6 lg:min-h-[calc(100vh-2rem)] lg:border-b-0 lg:border-r">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[1.95rem] font-semibold tracking-[-0.04em] text-slate-900">
                  Alethia Live
                </h1>
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
              </div>

              <p className="mt-1 text-[1rem] font-medium text-slate-500">
                AI for clearer care navigation
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white/92 px-4 py-2 text-[0.82rem] font-semibold tracking-[0.01em] text-slate-600 shadow-sm">
              <InfoIcon className="h-4 w-4 text-[#3b82f6]" />
              Informational support only · Not a diagnosis
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusPill
                label={
                  status === "connected"
                    ? "Session live"
                    : status === "connecting"
                      ? "Connecting"
                      : status === "error"
                        ? "Connection issue"
                        : "Ready to start"
                }
                className={
                  status === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : status === "connecting"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-sky-200 bg-sky-50 text-sky-700"
                }
              />
              <StatusPill
                label={setupComplete ? "Voice ready" : "Preparing voice"}
                className={
                  setupComplete
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }
              />
              <StatusPill
                label={isMicStreaming ? "Listening now" : "Mic off"}
                className={
                  isMicStreaming
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }
              />
            </div>

            <div className="rounded-[22px] border border-white/70 bg-white/60 px-4 py-3 text-sm text-slate-600 shadow-sm">
              {sessionStatusText}
            </div>

            <div className="flex flex-col items-center gap-4 py-1">
              <button
                onClick={() => void handlePresenceAction()}
                disabled={status === "connecting"}
                className={`relative h-32 w-32 overflow-hidden rounded-full bg-transparent p-0 transition duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-75 ${portraitGlowClass}`}
                aria-label={portraitStatusText}
                title={portraitStatusText}
              >
                {!avatarBroken ? (
                  <img
                    src="/alethia-avatar.png"
                    alt="Alethia portrait"
                    className="h-full w-full rounded-full object-cover object-center"
                    onError={() => setAvatarBroken(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-[#1ea7ff] text-4xl font-semibold text-white">
                    A
                  </div>
                )}
              </button>

              <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/92 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                {portraitStatusText}
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white/94 px-5 py-5 shadow-sm">
              <div className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#5d7caf]">
                Alethia
              </div>
              <p className="mt-3 min-h-[148px] whitespace-pre-line text-[1rem] leading-8 text-slate-600">
                {bubbleText}
              </p>
            </div>

            <p className="text-center text-sm text-slate-400">
              First tap starts the session. Once Alethia is ready, tap again to talk.
            </p>

            <div className="mt-auto space-y-4">
              <button
                onClick={
                  status === "connected"
                    ? handleEndSession
                    : () => void handleStartSession({ autoIntro: true })
                }
                disabled={status === "connecting"}
                className="inline-flex min-h-14 min-w-[190px] items-center justify-center gap-2 rounded-full bg-[#162948] px-6 py-3.5 text-lg font-semibold text-white shadow-[0_14px_28px_rgba(22,41,72,0.22)] transition hover:bg-[#10213b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "connected" ? (
                  <PhoneOffIcon className="h-5 w-5" />
                ) : (
                  <SparkIcon className="h-5 w-5" />
                )}
                {primarySessionLabel}
              </button>

              <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white/92 shadow-sm">
                <button
                  onClick={() => setIsTranscriptOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <TranscriptIcon className="h-5 w-5 text-slate-500" />
                    <span className="text-base font-semibold text-slate-700">Session Notes</span>
                  </div>
                  <ChevronIcon
                    className={`h-5 w-5 text-slate-500 transition-transform ${isTranscriptOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isTranscriptOpen ? (
                  <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-3">
                    <div className="max-h-[240px] space-y-4 overflow-y-auto pr-1">
                      {transcriptEntries.length === 0 ? (
                        <p className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                          Alethia’s live responses and key session updates will appear here.
                        </p>
                      ) : (
                        transcriptEntries.map((entry, index) => (
                          <div key={`${entry.time}-${entry.text}-${index}`} className="space-y-1.5">
                            <div
                              className={`text-xs font-bold tracking-[0.14em] ${
                                entry.label === "ALETHIA" ? "text-[#265dff]" : "text-slate-400"
                              }`}
                            >
                              {entry.label}
                            </div>
                            <div
                              className={`rounded-2xl px-4 py-3 text-[0.95rem] leading-7 ${
                                entry.label === "ALETHIA"
                                  ? "bg-[#edf3ff] text-slate-700"
                                  : "bg-slate-50 text-slate-600"
                              }`}
                            >
                              {entry.text}
                            </div>
                            <div className="text-[0.72rem] font-medium uppercase tracking-[0.08em] text-slate-400">
                              {entry.time}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <p className="text-xs text-slate-400">
                Use headphones during mic testing to reduce feedback.
              </p>
            </div>
          </aside>

          <section className="px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`flex w-full cursor-pointer items-center justify-between gap-4 rounded-[24px] border-2 border-dashed bg-white/80 px-4 py-5 text-left shadow-sm transition ${
                  isDraggingFile
                    ? "border-[#74a9ff] bg-[#f2f8ff]"
                    : "border-[#bfd6ff] hover:border-[#8db9ff] hover:bg-[#f7fbff]"
                }`}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] border border-slate-200 bg-[#f2f6ff] shadow-sm">
                    <UploadIcon className="h-7 w-7 text-[#3777ff]" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-[1.08rem] font-semibold text-slate-900">
                      {selectedFileName ? "Selected healthcare screenshot" : "Drop a screenshot here"}
                    </div>
                    <div className="mt-1 text-[0.98rem] text-slate-500">
                      {selectedFileName
                        ? selectedFileName
                        : "Image or screenshot from your portal, paperwork, or clinic instructions"}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleUseSampleDoc();
                    }}
                    className="rounded-full border border-slate-200 bg-white px-5 py-3 text-[0.98rem] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                  >
                    Use sample
                  </button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleAnalyzeFile}
                  disabled={!selectedFile || isAnalyzingFile}
                  className="inline-flex items-center gap-2 rounded-full bg-[#162948] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(22,41,72,0.16)] transition hover:bg-[#10213b] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <SparkIcon className="h-4 w-4" />
                  {isAnalyzingFile ? "Explaining..." : "Explain screenshot"}
                </button>

                {selectedFileName ? (
                  <button
                    onClick={clearUploadState}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
                  >
                    <CloseIcon className="h-4 w-4" />
                    Remove file
                  </button>
                ) : null}
              </div>

              {summaryError ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 shadow-sm">
                  {summaryError}
                </div>
              ) : null}

              {summaryResult ? (
                <div className="space-y-4">
                  <ResultCard
                    icon={<DocumentIcon className="h-7 w-7 text-[#2d6dff]" />}
                    title="Plain-English Summary"
                    tone="default"
                  >
                    <p className="mb-4 text-sm font-medium uppercase tracking-[0.08em] text-slate-400">
                      This screenshot appears to say:
                    </p>
                    <p className="text-[1rem] leading-8 text-slate-600">{summaryResult.summary}</p>
                  </ResultCard>

                  <ResultCard
                    icon={<TargetIcon className="h-7 w-7 text-[#0c9b69]" />}
                    title="High-Level Care Path"
                    tone="default"
                  >
                    <p className="mb-4 text-sm font-medium uppercase tracking-[0.08em] text-slate-400">
                      Common next-step framing based on what this screenshot shows:
                    </p>
                    <p className="text-[1rem] leading-8 text-slate-600">{summaryResult.carePath}</p>
                  </ResultCard>

                  <ResultCard
                    icon={<HeartIcon className="h-7 w-7 text-[#5b54ff]" />}
                    title="Questions to Ask a Clinician"
                    tone="default"
                    action={
                      <button
                        onClick={handleCopyQuestions}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-500 shadow-sm transition hover:bg-slate-50"
                      >
                        <CopyIcon className="h-4 w-4" />
                        {copyState === "copied" ? "Copied" : copyState === "error" ? "Try again" : "Copy"}
                      </button>
                    }
                  >
                    <ol className="space-y-4">
                      {summaryResult.questionsForClinician.map((item, index) => (
                        <li key={`${item}-${index}`} className="flex gap-4">
                          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f3f6ff] text-sm font-bold text-[#5b54ff]">
                            {index + 1}
                          </span>
                          <span className="text-[1rem] leading-8 text-slate-600">{item}</span>
                        </li>
                      ))}
                    </ol>
                  </ResultCard>

                  {summaryResult.keyPoints.length > 0 ? (
                    <ResultCard
                      icon={<KeyPointsIcon className="h-7 w-7 text-[#2563eb]" />}
                      title="What Matters Most"
                      tone="default"
                    >
                      <ul className="space-y-3">
                        {summaryResult.keyPoints.map((item, index) => (
                          <li key={`${item}-${index}`} className="flex gap-3">
                            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#3b82f6]" />
                            <span className="text-[1rem] leading-8 text-slate-600">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </ResultCard>
                  ) : null}

                  <ResultCard
                    icon={<WarningIcon className="h-7 w-7 text-[#ef4444]" />}
                    title="Emergency Red Flags"
                    tone="danger"
                  >
                    {summaryResult.redFlags.length === 0 ? (
                      <p className="text-[1rem] leading-8 text-rose-700/80">
                        No specific emergency red flags were highlighted from this upload.
                      </p>
                    ) : (
                      <>
                        <p className="mb-5 text-[1rem] font-medium leading-8 text-rose-700">
                          Seek immediate emergency care if you experience any of the following:
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {summaryResult.redFlags.map((item, index) => (
                            <div
                              key={`${item}-${index}`}
                              className="rounded-2xl border border-rose-100 bg-white/60 px-4 py-3 text-[0.98rem] font-medium text-rose-800"
                            >
                              • {item}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </ResultCard>

                  <ResultCard
                    icon={<InfoIcon className="h-7 w-7 text-[#3b82f6]" />}
                    title="Safety Note"
                    tone="info"
                  >
                    <p className="text-[1rem] leading-8 text-sky-900">{summaryResult.safetyNote}</p>
                  </ResultCard>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-slate-200 bg-white/78 px-5 py-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">Document understanding</h2>
                    <p className="mt-3 max-w-3xl text-[1rem] leading-8 text-slate-500">
                      Upload a screenshot of an after-visit summary, discharge instructions, medication
                      label, appointment instructions, or provider page. Alethia will explain what it
                      appears to say in plain English, highlight what matters most, suggest questions to
                      ask a clinician, and surface urgent red flags.
                    </p>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <EmptyStateCard
                      title="Ways Alethia can help"
                      description="Choose a starting point. You can upload a screenshot, use a sample, or begin by talking through a question."
                    >
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => void handleUseSampleDoc()}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                        >
                          Use a sample
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                        >
                          Upload a screenshot
                        </button>
                        <button
                          onClick={() => void handlePresenceAction()}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                        >
                          Talk to Alethia
                        </button>
                      </div>
                    </EmptyStateCard>

                    <EmptyStateCard
                      title="Helpful screenshot types"
                      description="Alethia works well with common healthcare screenshots and visual documents like these."
                    >
                      <div className="flex flex-wrap gap-2">
                        {[
                          "After-visit summary",
                          "Discharge instructions",
                          "Lab result screenshot",
                          "Appointment instructions",
                          "Medication label",
                          "Provider page",
                        ].map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </EmptyStateCard>
                  </div>

                  <div className="rounded-[24px] border border-sky-200 bg-sky-50/80 px-5 py-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#3b82f6] shadow-sm">
                        <InfoIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          Less medical jargon. More clarity.
                        </h3>
                        <p className="mt-2 text-[0.98rem] leading-7 text-slate-600">
                          Alethia helps you make sense of healthcare information without sending you into a spiral.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function EmptyStateCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white/78 px-5 py-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-[0.96rem] leading-7 text-slate-500">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ResultCard({
  icon,
  title,
  children,
  action,
  tone = "default",
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  tone?: "default" | "danger" | "info";
}) {
  const toneClasses =
    tone === "danger"
      ? "border-rose-200 bg-rose-50/88 shadow-[inset_4px_0_0_0_rgba(239,68,68,0.9)]"
      : tone === "info"
        ? "border-sky-200 bg-sky-50/88"
        : "border-slate-200 bg-white/84";

  const iconClasses =
    tone === "danger"
      ? "bg-rose-100"
      : tone === "info"
        ? "bg-sky-100"
        : "bg-[#f2f6ff]";

  return (
    <section className={`rounded-[26px] border px-5 py-5 shadow-sm ${toneClasses}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] ${iconClasses}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="text-[1.1rem] font-semibold text-slate-900 sm:text-[1.15rem]">{title}</h2>
          </div>
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatusPill({ label, className }: { label: string; className?: string }) {
  return (
    <div className={`rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.03em] ${className ?? ""}`}>
      {label}
    </div>
  );
}

function SparkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2.5 14 8l5.5 2-5.5 2-2 5.5-2-5.5-5.5-2L10 8l2-5.5Z" />
    </svg>
  );
}

function UploadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 15V7" />
      <path d="m8.5 10.5 3.5-3.5 3.5 3.5" />
      <path d="M20 15.5a4.5 4.5 0 0 1-4.5 4.5h-7A4.5 4.5 0 0 1 4 15.5 4.5 4.5 0 0 1 8.5 11a5 5 0 0 1 9.78 1.5A3.5 3.5 0 0 1 20 15.5Z" />
    </svg>
  );
}

function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7.25h.01" />
    </svg>
  );
}

function TranscriptIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </svg>
  );
}

function ChevronIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function CopyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

function DocumentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M8 3.5h6l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 7 20V5a1.5 1.5 0 0 1 1-1.41Z" />
      <path d="M14 3.5V8h4" />
      <path d="M9.5 12.5h5" />
      <path d="M9.5 16h5" />
    </svg>
  );
}

function TargetIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function HeartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 20s-6.5-4.35-8.5-8.1A5.12 5.12 0 0 1 8.2 4.5c1.56 0 3.03.7 3.8 1.92A4.73 4.73 0 0 1 15.8 4.5a5.12 5.12 0 0 1 4.7 7.4C18.5 15.65 12 20 12 20Z" />
      <path d="M9.4 12h2l1.1-2.2 2.1 4.2 1-2h1.8" />
    </svg>
  );
}

function KeyPointsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M6 7h12" />
      <path d="M6 12h12" />
      <path d="M6 17h8" />
      <circle cx="4.25" cy="7" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="4.25" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="4.25" cy="17" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WarningIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 4.5 20 19a1.5 1.5 0 0 1-1.31 2.25H5.31A1.5 1.5 0 0 1 4 19L12 4.5Z" />
      <path d="M12 10v4.5" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function PhoneOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M3 8.5c3.2-2.5 6.12-3.75 9-3.75s5.8 1.25 9 3.75l-2.5 3.5a1.5 1.5 0 0 1-1.83.52l-2.16-.86a1.5 1.5 0 0 0-1.72.44l-1.08 1.29a1.5 1.5 0 0 1-2.32 0l-1.08-1.29a1.5 1.5 0 0 0-1.72-.44l-2.16.86A1.5 1.5 0 0 1 5.5 12L3 8.5Z" />
    </svg>
  );
}