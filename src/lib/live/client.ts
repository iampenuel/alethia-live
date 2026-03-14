import { LIVE_MODEL, LIVE_TEMPERATURE } from "@/lib/live/config";

type LiveTokenResponse = {
  ok: boolean;
  token?: string;
  expireTime?: string;
  newSessionExpireTime?: string;
  model?: string;
  error?: string;
};

export type LiveSessionState = "idle" | "connecting" | "connected" | "error";

export type LiveClientOptions = {
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (event: MessageEvent<string | ArrayBuffer | Blob>) => void;
};

export class AlethiaLiveClient {
  private socket: WebSocket | null = null;
  private status: LiveSessionState = "idle";

  getState(): LiveSessionState {
    return this.status;
  }

  private setState(next: LiveSessionState) {
    this.status = next;
  }

  private assertSocketOpen() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Live socket is not connected.");
    }
  }

  private send(payload: unknown) {
    this.assertSocketOpen();
    this.socket!.send(JSON.stringify(payload));
  }

  async connect(options: LiveClientOptions = {}) {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      throw new Error("Live session is already active.");
    }

    this.setState("connecting");

    const tokenResponse = await fetch("/api/live-token", {
      method: "POST",
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      this.setState("error");
      throw new Error(`Failed to create live token (${tokenResponse.status}).`);
    }

    const tokenJson = (await tokenResponse.json()) as LiveTokenResponse;

    if (!tokenJson.ok || !tokenJson.token) {
      this.setState("error");
      throw new Error(tokenJson.error || "Live token response was invalid.");
    }

    const url = new URL(
      "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained"
    );
    url.searchParams.set("access_token", tokenJson.token);

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url.toString());

      ws.onopen = () => {
        this.socket = ws;
        this.setState("connected");
        options.onOpen?.();
        resolve();
      };

      ws.onmessage = (event) => {
        options.onMessage?.(
          event as MessageEvent<string | ArrayBuffer | Blob>
        );
      };

      ws.onerror = (event) => {
        this.setState("error");
        options.onError?.(event);

        if (ws.readyState !== WebSocket.OPEN) {
          reject(new Error("Live WebSocket failed to connect."));
        }
      };

      ws.onclose = (event) => {
        if (this.socket === ws) {
          this.socket = null;
        }

        if (this.status !== "error") {
          this.setState("idle");
        }

        options.onClose?.(event);

        if (
          ws.readyState === WebSocket.CLOSED &&
          this.status !== "connected"
        ) {
          reject(
            new Error(
              `Live WebSocket closed before opening (code ${event.code}).`
            )
          );
        }
      };
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.close(1000, "Client ended session.");
      this.socket = null;
    }

    this.setState("idle");
  }

  sendSetup(systemPrompt: string) {
    this.send({
      setup: {
        model: `models/${LIVE_MODEL}`,
        generationConfig: {
          responseModalities: ["AUDIO"],
          temperature: LIVE_TEMPERATURE,
        },
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        outputAudioTranscription: {},
        sessionResumption: {},
      },
    });
  }

  sendText(text: string) {
    this.send({
      realtimeInput: {
        text,
      },
    });
  }

  sendAudioChunk(base64Data: string, mimeType: string) {
    this.send({
      realtimeInput: {
        audio: {
          data: base64Data,
          mimeType,
        },
      },
    });
  }

  sendAudioStreamEnd() {
    this.send({
      realtimeInput: {
        audioStreamEnd: true,
      },
    });
  }
}