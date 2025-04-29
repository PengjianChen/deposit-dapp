'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LoginPage() {
  const router = useRouter()

  // Connect with wallet
  const handleLogin = () => {
    localStorage.setItem('wallet', '0x123...abc')
    router.push('/dashboard')
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-lg w-96 text-center space-y-6">
        <h1 className="text-2xl font-bold">Welcome to Deposit DApp</h1>
        <p className="text-sm text-gray-400">Connect your wallet to continue</p>
        <button
          onClick={handleLogin}
          className="bg-blue-500 hover:bg-blue-600 w-full py-2 rounded-xl font-medium"
        >
          Connect Wallet
        </button>
      </div>
    </div>
  )
}
