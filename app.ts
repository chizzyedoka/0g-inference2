// Import necessary libraries
import { ethers, JsonRpcSigner } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import dotenv from "dotenv";
import OpenAI from "openai";

// Load environment variables from .env file
dotenv.config();

// Define the structure for AI tools that can be used
interface Tool {
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

// 
/**
 * ZGInferenceClient - A client for interacting with 0G Labs AI inference services
 * This class handles wallet management, service discovery, and AI inference requests
 */
class ZGInferenceClient {
  // Blockchain connection properties
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private broker: any;

  // State tracking
  private isInitialized: boolean = false;

  // Service configuration
  private providerAddress: string | null = null;
  private endpoint: string | null = null;
  private model: string | null = null;

  /**
   * Creates a new ZGInferenceClient instance
   * @param privateKey - Your wallet's private key for authentication
   * @param rpcUrl - The blockchain RPC URL (default: 0G testnet)
   */
  constructor(
    privateKey: string,
    rpcUrl: string = "https://evmrpc-testnet.0g.ai"
  ) {
    // Set up blockchain connection
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  /**
   * Initialize the client - sets up the connection and prepares for inference
   * This must be called before making any inference requests
   */
  async initialize(): Promise<void> {
    // Skip initialization if already done
    if (this.isInitialized) return;

    console.log("🚀 Initializing ZG Inference Client...");

    // Create the broker for managing services and payments
    this.broker = await createZGComputeNetworkBroker(this.wallet);

    // Show current wallet balance
    console.log(
      "💰 Wallet balance:",
      await this.provider.getBalance(this.wallet.address)
    );

    // Set up account and add funds if needed
    await this.manageLedgerFunds();

    // Find and connect to an AI inference service
    await this.setupInferenceProvider();

    this.isInitialized = true;
    console.log("✅ ZG Inference Client initialized successfully!");
  }

  /**
   * Manages the ledger account and funds
   * Creates a new account if one doesn't exist, or adds funds if balance is low
   */
  private async manageLedgerFunds(): Promise<void> {
    try {
      // Try to get existing account balance
      const ledger = await this.broker.ledger.getLedger();
      console.log("📊 Account exists. Current ledger balance:", ledger);

      // Add more funds if balance is low (less than 0.05)
      if (parseFloat(ledger) < 0.05) {
        const amountToSend = 0.1;
        console.log("💵 Adding funds to existing account:", amountToSend);
        const depositRes = await this.broker.ledger.depositFund(amountToSend);
        console.log("✅ Deposit result:", depositRes);
      }
    } catch (error) {
      // Account doesn't exist, so create a new one
      console.log("🆕 Account doesn't exist, creating new account...");
      try {
        const amountToSend = 0.1;
        const addRes = await this.broker.ledger.addLedger(amountToSend);
        console.log("✅ Account creation result:", addRes);
      } catch (createError) {
        console.error("❌ Error creating account:", createError);
        throw createError;
      }
    }
  }

  /**
   * Sets up connection to an AI inference provider
   * Finds available services and configures the client to use one
   */
  private async setupInferenceProvider(): Promise<void> {
    // Get list of available AI services
    const services = await this.broker.inference.listService();
    console.log("🔍 Available services:", services);

    // Make sure at least one service is available
    if (services.length === 0) {
      throw new Error("❌ No inference services available");
    }

    // Use the first available service
    this.providerAddress = services[0].provider;
    await this.broker.inference.acknowledgeProviderSigner(this.providerAddress);

    // Get service details (endpoint URL and AI model name)
    const { endpoint, model } = await this.broker.inference.getServiceMetadata(
      this.providerAddress
    );

    this.endpoint = endpoint;
    this.model = model;

    console.log("🌐 Service Endpoint:", this.endpoint);
    console.log("🤖 Model:", this.model);
  }

  /**
   * Main method to send messages to the AI and get responses
   * @param message - The message/question you want to ask the AI
   * @param tools - Optional tools the AI can use (like weather checking)
   * @param systemPrompt - Optional instructions for how the AI should behave
   * @returns The AI's response
   */
  async inference(
    message: string,
    tools?: Tool[],
    systemPrompt?: string
  ): Promise<any> {
    // Make sure client is initialized before making requests
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Build the conversation messages
    const messages: any[] = [];

    // Add system instructions if provided
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    // Add the user's message
    messages.push({ role: "user", content: message });

    // Get authentication headers for this request
    const headers = await this.broker.inference.getRequestHeaders(
      this.providerAddress!,
      message
    );
    console.log(headers)

    // Create OpenAI client to talk to the service
    const openai = new OpenAI({
      baseURL: this.endpoint!,
      apiKey: "", // Not needed for 0G services
      defaultHeaders: { ...headers } as Record<string, string>,
    });

    try {
      // Prepare the request parameters
      const requestParams: any = {
        messages,
        model: this.model!,
        headers: ""
      };

      // Add tools if provided (like weather checking capabilities)
      if (tools && tools.length > 0) {
        requestParams.tools = tools;
        requestParams.tool_choice = "auto"; // Let AI decide when to use tools
      }

      // Send the request to the AI
      const completion = await openai.chat.completions.create(requestParams);

      console.log("OpenAI Response:", completion);

      // Check if the AI wants to use any tools
      if (completion.choices[0].message.tool_calls) {
        return this.handleToolCalls(completion, openai, messages);
      }

      // Return the AI's response
      return {
        message: completion.choices[0].message.content,
        usage: completion.usage,
        finish_reason: completion.choices[0].finish_reason,
      };
    } catch (error) {
      console.error("❌ Error with inference:", error);
      throw error;
    }
  }

  /**
   * Handles cases where the AI wants to use tools (like checking weather)
   * This method executes the tools and gets the final response
   */
  private async handleToolCalls(
    completion: any,
    openai: OpenAI,
    messages: any[]
  ): Promise<any> {
    const toolCalls = completion.choices[0].message.tool_calls;

    // Add the AI's request to use tools to the conversation
    messages.push(completion.choices[0].message);

    // Execute each tool the AI wants to use
    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      console.log(`🔧 Executing tool: ${functionName}`, functionArgs);

      // Run the tool function and get results
      const result = await this.executeToolFunction(functionName, functionArgs);

      // Add the tool results to the conversation
      messages.push({
        tool_call_id: toolCall.id,
        role: "tool",
        content: JSON.stringify(result),
      });
    }

    // Wait a moment to avoid duplicate requests
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate new authentication headers for the follow-up request
    const originalUserMessage =
      messages.find((msg) => msg.role === "user")?.content ||
      "Follow-up request";
    const uniqueMessage = `${originalUserMessage} [${Date.now()}]`;
    const newHeaders = await this.broker.inference.getRequestHeaders(
      this.providerAddress!,
      uniqueMessage
    );

    // Create a new OpenAI client with fresh headers
    const newOpenai = new OpenAI({
      baseURL: this.endpoint!,
      apiKey: "dummy-key",
      defaultHeaders: { ...newHeaders } as Record<string, string>,
    });

    // Get the final response after using the tools
    const finalCompletion = await newOpenai.chat.completions.create({
      messages,
      model: this.model!,
    });

    return {
      message: finalCompletion.choices[0].message.content,
      usage: finalCompletion.usage,
      finish_reason: finalCompletion.choices[0].finish_reason,
      tool_calls: toolCalls,
    };
  }

  /**
   * Executes the specific tool functions that the AI requests
   * Currently supports: weather checking
   */
  private async executeToolFunction(
    functionName: string,
    args: any
  ): Promise<any> {
    // Check which tool function to execute
    switch (functionName) {
      case "get_weather":
        return this.getWeather(args.location);
      default:
        throw new Error(`❌ Unknown tool function: ${functionName}`);
    }
  }

  /**
   * Mock weather function - gets weather information for a location
   * In a real application, this would call a weather API
   */
  private async getWeather(location: string): Promise<any> {
    // This is a mock implementation - replace with actual weather API in production
    return {
      location,
      temperature: "25°C",
      condition: "Sunny",
      humidity: "60%",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get the current balance in the ledger account
   * @returns The balance as a string
   */
  async getLedgerBalance(): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return await this.broker.ledger.getLedger();
  }

  /**
   * Get the current wallet balance on the blockchain
   * @returns The balance in wei (smallest unit of ETH)
   */
  async getWalletBalance(): Promise<bigint> {
    return await this.provider.getBalance(this.wallet.address);
  }
}

// Tool Definition: Weather Tool
// This defines what the AI can do - check weather in any location
const weatherTool: Tool = {
  type: "function",
  function: {
    name: "get_weather",
    description: "Get the current weather in a given location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city and state/country, e.g. San Francisco, CA",
        },
      },
      required: ["location"],
    },
  },
};

/**
 * Main function - demonstrates how to use the ZGInferenceClient
 * This example shows both simple AI chat and AI with weather tool usage
 */
async function main() {
  console.log("Starting ZG Inference Client Demo");

  try {
    // Create a new client instance with your private key from environment variables
    const client = new ZGInferenceClient(process.env.PRIVATE_KEY!);

    // Example 1: Simple AI conversation without any tools
    console.log("\n Example 1: Simple AI Conversation");
    const simpleResponse = await client.inference(
      "Tell me a short joke about programming.",
      undefined, // No tools provided
      "You are a helpful assistant with a sense of humor."
    );
    console.log("AI Response:", simpleResponse.message);

    // Example 2: AI conversation with weather tool
    console.log("\n Example 2: AI with Weather Tool");
    const weatherResponse = await client.inference(
      "What's the weather like in Lagos, Nigeria?",
      [weatherTool], // Provide the weather tool
      "You are a helpful assistant. Use the available tools to provide accurate information."
    );
    console.log("🤖 AI Response:", weatherResponse.message);

    // Show final balances to see how much was spent
    console.log("\n� Final Account Status:");
    console.log("� Ledger Balance:", await client.getLedgerBalance());
    console.log("💳 Wallet Balance:", await client.getWalletBalance());
  } catch (error) {
    console.error("❌ Error in main function:", error);
  }
}

// Start the demo
main().catch(console.error);
