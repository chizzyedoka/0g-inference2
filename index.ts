import { BrowserProvider, ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import OpenAI from "openai";

async function main() {
  console.log("Starting browser-based inference client");

  try {
    // Check if MetaMask is installed
    if (typeof (window as any).ethereum === "undefined") {
      throw new Error("Please install MetaMask");
    }

    // Initialize browser provider and signer
    const provider = new BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    
    console.log("Connected wallet address:", await signer.getAddress());
    console.log("Wallet balance:", await provider.getBalance(await signer.getAddress()));

    // Create broker
    const broker = await createZGComputeNetworkBroker(signer);

    // Manage ledger funds
    try {
      const ledger = await broker.ledger.getLedger();
      console.log("Account exists. Current ledger balance:", ledger.totalBalance);

      if (Number(ethers.formatEther(ledger.totalBalance)) < 0.05) {
        const amountToSend = 0.1;
        console.log("Adding funds to existing account:", amountToSend);
        const depositRes = await broker.ledger.depositFund(amountToSend);
        console.log("Deposit result:", depositRes);
      }
    } catch (error) {
      console.log("Account doesn't exist, creating new account...");
      try {
        const amountToSend = 0.1;
        const addRes = await broker.ledger.addLedger(amountToSend);
        console.log("Account creation result:", addRes);
      } catch (createError) {
        console.error("Error creating account:", createError);
        throw createError;
      }
    }

    // Get available services
    const services = await broker.inference.listService();
    console.log("Available services:", services);

    if (services.length === 0) {
      throw new Error("No inference services available");
    }

    // Use first available service
    const providerAddress = services[0].provider;
    await broker.inference.acknowledgeProviderSigner(providerAddress);

    const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);
    
    console.log("Service Endpoint:", endpoint);
    console.log("Model:", model);

    // Simple inference example
    console.log("\nSimple AI Conversation");
    
    const message = "Tell me a short joke about programming.";
    const systemPrompt = "You are a helpful assistant with a sense of humor.";
    
    const messages: any[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: message });

    const headers = await broker.inference.getRequestHeaders(providerAddress, message);

    const openai = new OpenAI({
      baseURL: endpoint,
      apiKey: "",
      defaultHeaders: { ...headers } as Record<string, string>,
    });

    const completion = await openai.chat.completions.create({
      messages,
      model,
    });

    console.log("AI Response:", completion.choices[0].message.content);

    // Show final balances
    console.log("\nFinal Account Status:");
    const finalLedger = await broker.ledger.getLedger();
    console.log("Ledger Balance:", finalLedger.totalBalance);
    console.log("Wallet Balance:", await provider.getBalance(await signer.getAddress()));

  } catch (error) {
    console.error("Error in main function:", error);
  }
}

// Export for browser usage
if (typeof window !== "undefined") {
  (window as any).main = main;
}

// Run the main function
if (typeof window === "undefined") {
  main().catch(console.error);
}