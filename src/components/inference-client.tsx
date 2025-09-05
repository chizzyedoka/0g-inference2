'use client'

import React, { useState, useEffect } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker'
import { BrowserProvider, ethers } from 'ethers'
import OpenAI from 'openai'
import { LogEntry, InferenceService } from '@/types'
import { Wallet, Brain, Trash2, Loader2, Send } from 'lucide-react'

// Use any type for the actual broker since we don't have exact types
type ActualZGBroker = any

export function InferenceClient() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { open } = useWeb3Modal()
  
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [response, setResponse] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [broker, setBroker] = useState<ActualZGBroker | null>(null)
  const [services, setServices] = useState<InferenceService[]>([])
  const [currentService, setCurrentService] = useState<InferenceService | null>(null)
  const [userMessage, setUserMessage] = useState<string>('')
  const [systemPrompt, setSystemPrompt] = useState<string>('You are a knowledgeable AI assistant powered by 0G Labs decentralized compute network. You provide helpful, accurate, and detailed responses while being friendly and professional. Feel free to explain complex topics in simple terms when needed.')

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev: LogEntry[]) => [...prev, { timestamp, message, type }])
    console.log(`[${type.toUpperCase()}] ${message}`)
  }

  const clearLogs = () => {
    setLogs([])
    setResponse('')
  }

  // Initialize broker when wallet connects
  useEffect(() => {
    const initializeBroker = async () => {
      if (!isConnected || !address || !window.ethereum) return
      
      try {
        addLog('Initializing 0G Labs broker...', 'info')
        
        // Create browser provider for wallet interaction - this is the key difference
        const browserProvider = new BrowserProvider(window.ethereum)
        
        // Check current network that MetaMask is connected to
        const network = await browserProvider.getNetwork()
        addLog(`MetaMask network: ${network.name} (Chain ID: ${network.chainId})`, 'info')
        
        // Ensure we're on the correct network (0G testnet)
        if (network.chainId !== BigInt(16601)) {
          addLog('Warning: Not on 0G Newton Testnet (Chain ID: 16601)', 'error')
          addLog('Please switch to 0G Newton Testnet in MetaMask', 'info')
          // Don't return, let's try anyway
        }
        
        // Create provider directly connected to 0G testnet for balance checking
        const zgProvider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai")
        
        // Get balance from the 0G network directly
        const balance = await zgProvider.getBalance(address)
        const balanceIn0G = Number(balance) / 1e18
        addLog(`Wallet balance on 0G Network: ${balanceIn0G.toFixed(6)} 0G`, balanceIn0G > 0 ? 'success' : 'error')

        // Also check balance on current MetaMask network for comparison
        const mmBalance = await browserProvider.getBalance(address)
        const mmBalanceInEth = Number(mmBalance) / 1e18
        addLog(`MetaMask network balance: ${mmBalanceInEth.toFixed(6)} (current network)`, 'info')
        
        if (balanceIn0G === 0) {
          addLog('Your wallet has no 0G tokens on 0G Network.', 'error')
          addLog('Please ensure you have 0G tokens and MetaMask is on 0G Newton Testnet.', 'info')
          return
        }
        
        // CRITICAL: Use browserProvider directly for the signer instead of switching
        // This ensures the signer is connected to the same network as MetaMask
        const signer = await browserProvider.getSigner()
        addLog(`Signer address: ${await signer.getAddress()}`, 'info')
        addLog(`Signer provider chain ID: ${(await signer.provider.getNetwork()).chainId}`, 'info')
        
        const newBroker = await createZGComputeNetworkBroker(signer) as ActualZGBroker
        setBroker(newBroker)
        addLog('Broker initialized successfully', 'success')
        
        // Setup ledger
        await setupLedger(newBroker)
        addLog('Ledger setup completed', 'success')
        
        // Discover services 
        await discoverServices(newBroker)
        
      } catch (error) {
        addLog(`Failed to initialize broker: ${error}`, 'error')
      }
    }

    initializeBroker()
  }, [isConnected, address])

  const setupLedger = async (broker: ActualZGBroker) => {
    try {
      addLog('Setting up ledger account...', 'info')
      
      try {
        // Try to get existing account balance 
        const ledger = await broker.ledger//.getLedger()
        addLog(`Account with ledger exists.`, 'info')

        // Check balance 
        //const account = await broker.ledger.getLedger()
        addLog('Fetched existing ledger account', 'success')
        //addLog(`Ledger details: ${JSON.stringify(account)}`, 'info')

        
        //addLog(`Account exists. Balance: ${balance.toFixed(6)} OG, Available: ${available.toFixed(6)} OG`, 'success')
        
        // Add more funds if available balance is low (less than 0.05)
        // if (available < 0.05) {
        //   const amountToSend = "0.1" // Use string as per docs
        //   addLog(`Adding funds to existing account: ${amountToSend} OG`, 'info')
        //   try {
        //     const depositRes = await broker.ledger.depositFund(amountToSend)
        //     addLog('Funds added successfully', 'success')
        //     console.log('✅ Deposit result:', depositRes)
        //   } catch (depositError) {
        //     addLog(`Deposit failed: ${depositError}`, 'error')
        //     console.error('Deposit error details:', depositError)
        //     throw depositError
        //   }
        // }
      } catch (error) {
        // Account doesn't exist, so create a new one (using official API)
        addLog('Account doesn\'t exist, creating new account...', 'info')
        try {
          const amountToSend = 0.1 
          console.log('Attempting to create ledger with amount:', amountToSend)
          const addRes = await broker.ledger.addLedger(amountToSend)
          addLog('Account created successfully', 'success')
          addLog(`Account creation result: ${JSON.stringify(addRes)}`, 'info')
        } catch (error) {
          const createError = error as Error;
          addLog(`Error creating account: ${createError}`, 'error')
          console.error('Account creation error details:', createError)
          
          // Check if it's a gas estimation error
          if (createError.toString().includes('gas') || createError.toString().includes('insufficient')) {
            addLog('💡 This might be a gas estimation issue. Try with a smaller amount.', 'info')
            try {
              addLog('Trying with smaller amount: 0.01 OG', 'info')
              const smallerAmount = 0.01 
              const retryRes = await broker.ledger.addLedger(smallerAmount)
              addLog('Account created with smaller amount', 'success')
              console.log('✅ Retry result:', retryRes)
              return
            } catch (retryError) {
              addLog(`Retry also failed: ${retryError}`, 'error')
            }
          }
          
          throw createError
        }
      }
    } catch (error) {
      addLog(`Ledger setup failed: ${error}`, 'error')
      console.error('Full ledger setup error:', error)
      // Don't throw error, let the app continue to service discovery
    }
  }

const discoverServices = async (broker: ActualZGBroker) => {
  try {
    addLog('Discovering AI services...', 'info')
    const availableServices = await broker.inference.listService()
    setServices(availableServices)
    addLog(`Found ${availableServices.length} available services`, 'success')
    
    if (availableServices.length > 0) {
      const serviceArray = availableServices[0]
      
      // Debug the original service structure (handle BigInt serialization)
      addLog(`Original service structure: ${JSON.stringify(serviceArray, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2)}`, 'info')
      
      // Convert array to object structure
      const service = {
        provider: serviceArray[0],
        serviceType: serviceArray[1], 
        url: serviceArray[2],
        fee1: serviceArray[3],
        fee2: serviceArray[4],
        timestamp: serviceArray[5],
        model: serviceArray[6],
        verifiability: serviceArray[7],
        signature: serviceArray[8]
      }
      
      setCurrentService(service)
      addLog(`Selected service provider: ${service.provider}`, 'info')
      addLog(`Service URL: ${service.url}`, 'info')
      addLog(`Model: ${service.model}`, 'info')
      addLog(`Verifiability: ${service.verifiability || 'None'}`, 'info')
      
      // Acknowledge provider (required before use)
      addLog('Acknowledging provider...', 'info')
      await broker.inference.acknowledgeProviderSigner(service.provider)
      addLog('Provider acknowledged successfully', 'success')
      
      // Get service details (endpoint URL and AI model name)
      try {
        const { endpoint, model } = await broker.inference.getServiceMetadata(service.provider)
        addLog(`Service endpoint: ${endpoint}`, 'info')
        addLog(`Model from metadata: ${model}`, 'info')
        
        // Update service with metadata
        setCurrentService({ 
          ...service,
          endpoint, 
          model 
        })
      } catch (metaError) {
        addLog(`Using basic service info (metadata unavailable)`, 'info')
        // Use service.url as fallback endpoint
        setCurrentService({
          ...service,
          endpoint: service.url,
          model: service.model
        })
      }
    } else {
      addLog('No services available. Please check network connection.', 'error')
    }
  } catch (error) {
    addLog(`Service discovery failed: ${error}`, 'error')
    addLog('This might be due to network issues or service unavailability', 'info')
  }
}

// Modified runInference to use user input
const runInference = async () => {
  if (!broker || !currentService || !currentService.endpoint) {
    addLog('Broker or service not ready', 'error')
    return
  }

  if (!userMessage.trim()) {
    addLog('Please enter a message before running inference', 'error')
    return
  }

  setIsLoading(true)
  setResponse('')
  
  try {
    const question = userMessage.trim()
    
    addLog('Preparing inference request...', 'info')
    addLog(`User message: ${question}`, 'info')
    
    // Build the conversation messages
    const messages: any[] = []
    
    // Add system instructions
    if (systemPrompt.trim()) {
      messages.push({ role: "system", content: systemPrompt.trim() })
    }
    
    // Add the user's message
    messages.push({ role: "user", content: question })

    addLog(`current service is ${currentService}`, 'info')
    addLog('Getting endpoint and model...', 'info')
    const endpoint = currentService.endpoint
    const model = currentService.model

    addLog(`Using endpoint: ${endpoint}`, 'info')
    addLog(`Using model: ${model}`, 'info')
    
    // Enhanced debuggingnp,mn
    addLog(`Provider type: ${typeof currentService?.provider}`, 'info')
    addLog(`Provider exists: ${!!currentService?.provider}`, 'info')
    addLog(`Provider value: ${currentService?.provider}`, 'info')
    addLog(`Endpoint: ${currentService?.endpoint}`, 'info')
    
    // Add safety check for provider
    if (!currentService.provider) {
      addLog('Error: Service provider is undefined', 'error')
      return
    }
    
    // Generate auth headers 
    const providerAddress = currentService.provider?.toString?.() || currentService.provider
    
    if (!providerAddress) {
      addLog('Error: Could not get provider address', 'error')
      return
    }
    
    addLog(`Using provider address: ${providerAddress}`, 'info')
    const headers = await broker.inference.getRequestHeaders(providerAddress, question)
    addLog('Got authentication headers', 'success')
    addLog(`Raw headers: ${JSON.stringify(headers)}`, 'info')
    
    addLog('Making inference request...', 'info')
    
    // Ensure model is defined
    if (!model) {
      throw new Error('Model is required for inference request')
    }
    
    // Use direct fetch to match exactly what Node.js does
    const requestBody = {
      messages: messages,
      model: model,
    }
    
    addLog(`Request body: ${JSON.stringify(requestBody)}`, 'info')
    
    // Make direct fetch request with exact headers
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(requestBody),
    })
    
    if (!response.ok) {
      console.log(`Error: ${response.status}`);
      console.log('Response details:', response);
      const errorText = await response.text()
      throw new Error(`${response.status} "${errorText}"`)
    }
    
    const completion = await response.json()
    console.log("OpenAI Response:", completion)

    // Extract answer
    const aiResponse = completion.choices[0].message.content!;
    setResponse(aiResponse)
    addLog('Inference completed successfully!', 'success')
    
    // Show usage info if available
    if (completion.usage) {
      addLog(`Tokens used: ${completion.usage.total_tokens}`, 'info')
    }
    
    // Show final balances using official API
    try {
      const finalLedger = await broker.ledger.getLedger()
      const balance = Number(ethers.formatEther(finalLedger.balance || finalLedger.totalBalance || finalLedger))
      const locked = finalLedger.locked ? Number(ethers.formatEther(finalLedger.locked)) : 0
      const available = balance - locked
      addLog(`Updated balance: ${balance.toFixed(6)} OG, Available: ${available.toFixed(6)} OG`, 'info')
    } catch (balanceError) {
      addLog('Could not get updated balance', 'info')
    }
    
  } catch (error) {
    addLog(`Inference failed: ${error}`, 'error')
  } finally {
    setIsLoading(false)
  }
}

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  if (!isLoading && userMessage.trim()) {
    runInference()
  }
}


  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="p-4 rounded-lg border">
        {!isConnected ? (
          <button
            onClick={() => open()}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </button>
        ) : (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center justify-between">
            <div>
              <strong>Connected:</strong> {address}
              {currentService && (
                <div className="text-sm mt-1">
                  Service: {currentService.provider?.slice(0, 10)}...{currentService.provider?.slice(-8)}
                </div>
              )}
            </div>
            <button
              onClick={() => disconnect()}
              className="bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Chat Interface */}
      {isConnected && (
        <div className="space-y-4">
          {/* System Prompt */}
          <div>
            <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700 mb-2">
              System Prompt (Optional):
            </label>
            <textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter system instructions for the AI..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
            />
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="userMessage" className="block text-sm font-medium text-gray-700 mb-2">
                Your Message:
              </label>
              <div className="flex gap-2">
                <textarea
                  id="userMessage"
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  disabled={isLoading}
                />
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isLoading || !currentService || !userMessage.trim()}
                className="bg-green-500 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isLoading ? 'Running...' : 'Send Message'}
              </button>
              <button
                type="button"
                onClick={clearLogs}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear Logs
              </button>
            </div>
          </form>
        </div>
      )}

      {/* AI Response */}
      {response && (
        <div>
          <h3 className="text-lg font-semibold mb-2">AI Response:</h3>
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded whitespace-pre-wrap">
            {response}
          </div>
        </div>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Logs:</h3>
          <div className="bg-gray-50 border border-gray-300 rounded p-4 h-64 overflow-y-auto font-mono text-sm">
            {logs.map((log: LogEntry, index: number) => (
              <div
                key={index}
                className={`mb-1 ${
                  log.type === 'error' ? 'text-red-600' :
                  log.type === 'success' ? 'text-green-600' :
                  'text-gray-700'
                }`}
              >
                {log.timestamp}: {log.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}