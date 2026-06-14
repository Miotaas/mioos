export type SignalType = "email" | "calendar" | "web" | "manual" | "internal";

export interface IntelligenceSignalData {
  signalType: SignalType;
  source: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ISignalSource {
  name: string;
  signalType: SignalType;
  fetch(): Promise<IntelligenceSignalData[]>;
  isConfigured(): boolean;
}
