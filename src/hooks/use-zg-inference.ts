'use client'

import { useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { createZGComputeNetworkBroker } from '@0glabs/0g-serving-broker'
import { BrowserProvider } from 'ethers'
import OpenAI from 'openai'
import { InferenceService, Tool } from '@/types'

// Use any type for the actual broker since we don't have exact types
type ActualZGBroker = any

export function useZGInference() {
  const { address, isConnected } = useAccount()
  const [broker, setBroker] = useState<ActualZGBroker | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [services, setServices] = useState<InferenceService[]>([])
  const [currentService, setCurrentService] = useState<InferenceService | null>(null)

  const initializeBroker = useCallback(async () => {
    if (!isConnected || !address || !window.ethereum || isInitialized) return
    
    try {
      setIsLoading(true)
      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      
      const newBroker = await createZGComputeNetworkBroker(signer) as ActualZGBroker
      setBroker(newBroker)
      setIsInitialized(true)
      
      return newBroker
    } catch (error) {
      console.error('Failed to initialize broker:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [isConnected, address, isInitialized])

  const setupLedger = useCallback(async (brokerInstance?: ActualZGBroker) => {
    const activeBroker = brokerInstance || broker
    if (!activeBroker) throw new Error('Broker not initialized')
    
    try {
      const ledger = await activeBroker.ledger.getLedger()
      
      const balanceNum = Number(ledger.totalBalance || ledger)
      if (balanceNum < 0.05) {
        await activeBroker.ledger.depositFund(0.1)
      }
      
      return ledger
    } catch (error) {
      // Account doesn't exist, create new one
      await activeBroker.ledger.addLedger(0.1)
      return await activeBroker.ledger.getLedger()
    }
  }, [broker])

  const discoverServices = useCallback(async (brokerInstance?: ActualZGBroker) => {
    const activeBroker = brokerInstance || broker
    if (!activeBroker) throw new Error('Broker not initialized')
    
    try {
      const availableServices = await activeBroker.inference.listService()
      setServices(availableServices)
      
      if (availableServices.length > 0) {
        const service = availableServices[0]
        
        // Acknowledge provider if needed
        try {
          const isAcknowledged = await activeBroker.inference.userAcknowledged(service.provider)
          if (!isAcknowledged) {
            await activeBroker.inference.acknowledgeProviderSigner(service.provider)
          }
        } catch (ackError) {
          console.warn('Provider acknowledgment issue:', ackError)
        }
        
        // Get service metadata with better error handling
        try {
          const metadata = await activeBroker.inference.getServiceMetadata(service.provider)
          const serviceWithMetadata = { ...service, ...metadata }
          setCurrentService(serviceWithMetadata)
          return serviceWithMetadata
        } catch (metaError) {
          console.warn('Could not get service metadata, using basic service info:', metaError)
          // Use default endpoint if metadata fails
          const basicService = {
            ...service,
            endpoint: service.endpoint || 'https://api.openai.com/v1',
            model: service.model || 'gpt-3.5-turbo'
          }
          setCurrentService(basicService)
          return basicService
        }
      }
      
      return null
    } catch (error) {
      console.error('Service discovery failed:', error)
      // Try to continue with a fallback service if possible
      throw error
    }
  }, [broker])

  const runInference = useCallback(async (
    message: string,
    systemPrompt?: string,
    tools?: Tool[]
  ) => {
    if (!broker || !currentService) {
      throw new Error('Broker or service not ready')
    }
    
    const messages: Array<{ role: string; content: string }> = []
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt })
    }
    messages.push({ role: "user", content: message })
    
    const headers = await broker.inference.getRequestHeaders(currentService.provider, message)
    
    const openai = new OpenAI({
      baseURL: currentService.endpoint!,
      apiKey: "",
      defaultHeaders: { ...headers } as Record<string, string>,
      dangerouslyAllowBrowser: true
    })

    const requestParams: any = {
      messages,
      model: currentService.model || 'gpt-3.5-turbo',
    }
    
    if (tools && tools.length > 0) {
      requestParams.tools = tools
      requestParams.tool_choice = "auto"
    }
    
    const completion = await openai.chat.completions.create(requestParams)
    return completion.choices[0]?.message?.content || 'No response'
  }, [broker, currentService])

  return {
    broker,
    isInitialized,
    isLoading,
    services,
    currentService,
    initializeBroker,
    setupLedger,
    discoverServices,
    runInference
  }
}