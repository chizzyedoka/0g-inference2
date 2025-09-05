'use client'

import { InferenceClient } from '@/components/inference-client'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 py-6">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
            0G Labs Inference Client
          </h1>
          <InferenceClient />
        </div>
      </div>
    </main>
  )
}