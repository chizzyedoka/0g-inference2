export interface Tool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface InferenceService {
  provider: string;
  endpoint?: string;
  model?: string;
}

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

// More flexible ZGBroker interface that matches the actual API
export interface ZGBroker {
  ledger: {
    getLedger: () => Promise<any>;
    addLedger: (amount: number) => Promise<any>;
    depositFund: (amount: number) => Promise<any>;
  };
  inference: {
    listService: () => Promise<InferenceService[]>;
    acknowledgeProviderSigner: (provider: string) => Promise<void>;
    userAcknowledged: (provider: string) => Promise<boolean>;
    getServiceMetadata: (provider: string) => Promise<{ endpoint: string; model: string }>;
    getRequestHeaders: (provider: string, message: string) => Promise<Record<string, string>>;
  };
  [key: string]: any; // Allow additional properties from the actual broker
}

// Type for the actual broker returned by createZGComputeNetworkBroker
export type ActualZGBroker = any; // Since we don't have exact types from the library