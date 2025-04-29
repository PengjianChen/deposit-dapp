'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Dashboard() {
  const router = useRouter()
  const [wallet, setWallet] = useState<string | null>(null)

  useEffect(() => {
    const savedWallet = localStorage.getItem('wallet')
    if (!savedWallet) {
      router.push('/login')
    } else {
      setWallet(savedWallet)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('wallet')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">👋 Welcome, {wallet}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/deposit">
          <div className="bg-blue-700 p-6 rounded-xl cursor-pointer hover:bg-blue-800 shadow-md">
            <h2 className="text-xl font-semibold">💰 Create New Deposit</h2>
            <p className="text-sm text-gray-300">Start a new deposit (Fixed, Flexible, Monthly Saver)</p>
          </div>
        </Link>

        <div className="bg-green-700 p-6 rounded-xl shadow-md opacity-60 cursor-not-allowed">
          <h2 className="text-xl font-semibold">📊 View My Deposit</h2>
          <p className="text-sm text-gray-300">Coming Soon</p>
        </div>

        <div className="bg-yellow-700 p-6 rounded-xl shadow-md opacity-60 cursor-not-allowed">
          <h2 className="text-xl font-semibold">💸 Lending (Coming Soon)</h2>
          <p className="text-sm text-gray-300">Lending platform features coming soon</p>
        </div>

        <div
          onClick={handleLogout}
          className="bg-red-600 p-6 rounded-xl cursor-pointer hover:bg-red-700 shadow-md"
        >
          <h2 className="text-xl font-semibold">🚪 Logout</h2>
          <p className="text-sm text-gray-300">Disconnect your wallet and return to login</p>
        </div>
      </div>
    </div>
  )
}
