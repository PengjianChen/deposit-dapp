'use client'

import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { useRouter } from 'next/navigation'
import { getContract } from '@/utils/contract'

declare global {
  interface Window {
    ethereum?: any
  }
}

type DepositType = 'FixedTerm' | 'FlexibleTerm'

interface DepositRecord {
  index: number
  amount: string
  type: DepositType
  startTime: string
  endTime?: string
}

export default function DepositPage() {
  const router = useRouter()
  const [wallet, setWallet] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [deposits, setDeposits] = useState<DepositRecord[]>([])
  const [monthlySaver, setMonthlySaver] = useState<any>(null)
  const [currentMonth, setCurrentMonth] = useState<number | null>(null)

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      const browserProvider = new ethers.BrowserProvider(window.ethereum)
      const accounts = await browserProvider.send('eth_requestAccounts', [])
      const userSigner = await browserProvider.getSigner()
      setWallet(accounts[0])
      setProvider(browserProvider)
      setSigner(userSigner)
    } else {
      alert('Please install MetaMask')
    }
  }

  useEffect(() => {
    const savedWallet = localStorage.getItem('wallet')
    if (!savedWallet) {
      router.push('/login')
    } else {
      setWallet(savedWallet)
      connectWallet()
    }
  }, [])

  useEffect(() => {
    if (signer && wallet) {
      fetchDeposits()
      fetchMonthlySaver()
    }
  }, [signer, wallet])

  const fetchDeposits = async () => {
    const contract = getContract(signer!)
    const [amounts, types, startTimes, endTimes] = await contract.getAllDeposits(wallet)
    const results = amounts.map((amt: bigint, i: number) => {
        const type = ['FixedTerm', 'FlexibleTerm'][types[i]]
        return {
          index: i,
          amount: ethers.formatEther(amt),
          type,
          startTime: new Date(Number(startTimes[i]) * 1000).toLocaleDateString(),
          endTime: type === 'FixedTerm'
            ? new Date(Number(endTimes[i]) * 1000).toLocaleDateString()
            : undefined
        }
      })
    setDeposits(results)
  }

  const fetchMonthlySaver = async () => {
    const contract = getContract(signer!)
    try {
      const [amount, startTime, endTime, interest, withdrawalCount, isActive] =
        await contract.getMonthlySaverDeposit(wallet)
      if (isActive) {
        const month = 1 + Math.floor((Date.now() / 1000 - Number(startTime)) / (30 * 24 * 60 * 60))
        setMonthlySaver({
          amount: ethers.formatEther(amount),
          interest: ethers.formatEther(interest),
          startTime: new Date(Number(startTime) * 1000).toLocaleDateString(),
          endTime: new Date(Number(endTime) * 1000).toLocaleDateString(),
          withdrawalCount,
          month,
          startTimestamp: Number(startTime)
        })
        setCurrentMonth(month)
      } else {
        setMonthlySaver(null)
      }
    } catch {}
  }

  const handleAmountInput = async (type: DepositType | 'MonthlySaver') => {
    const input = prompt(`Enter amount in ETH (${type === 'MonthlySaver' ? 'max 0.5' : 'min 0.0001'})`)
    if (!input) return
    const amount = parseFloat(input)
    if (isNaN(amount) || amount <= 0) return alert('Invalid input')
    if (type === 'MonthlySaver' && amount > 0.5) return alert('Monthly Saver max is 0.5 ETH')

    const contract = getContract(signer!)
    let tx
    if (type === 'FixedTerm') tx = await contract.createFixedTermDeposit({ value: ethers.parseEther(input) })
    if (type === 'FlexibleTerm') tx = await contract.createFlexibleTermDeposit({ value: ethers.parseEther(input) })
    if (type === 'MonthlySaver') tx = await contract.createMonthlySaverDeposit({ value: ethers.parseEther(input) })

    await tx.wait()
    fetchDeposits()
    fetchMonthlySaver()
    alert(` ${type} created`)
  }

  const handleWithdraw = async (index: number, type: DepositType) => {
    const contract = getContract(signer!)
    if (type === 'FlexibleTerm') {
      const input = prompt('Withdraw amount (ETH)')
      if (!input) return
      const amount = parseFloat(input)
      if (isNaN(amount) || amount <= 0) return alert('Invalid')
      const tx = await contract.withdrawFlexibleTermDeposit(index, ethers.parseEther(input))
      await tx.wait()
    }
    fetchDeposits()
  }

  const withdrawMonthly = async () => {
    const input = prompt('Withdraw amount (ETH)')
    if (!input) return
    const amount = parseFloat(input)
    if (isNaN(amount) || amount <= 0) return alert('Invalid')

    const contract = getContract(signer!)
    const tx = await contract.withdrawMonthlySaverDeposit(ethers.parseEther(input))
    await tx.wait()
    fetchMonthlySaver()
  }

  const addMonthly = async () => {
    const input = prompt('Enter deposit amount for this month (max 0.5 ETH)')
    if (!input) return
    const amount = parseFloat(input)
    if (amount > 0.5) return alert('Maximum is 0.5 ETH/month')

    try {
      const contract = getContract(signer!)
      const tx = await contract.addMonthlyDeposit({ value: ethers.parseEther(input) })
      await tx.wait()
      alert('Monthly deposit added')
      fetchMonthlySaver()
    } catch (err) {
      const nextTime = new Date(monthlySaver.startTimestamp * 1000 + currentMonth! * 30 * 24 * 60 * 60 * 1000)
      alert(`❌ You already deposited this month.\nNext deposit available on: ${nextTime.toLocaleDateString()}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">💼 Deposit Dashboard</h1>
      <p className="text-gray-400 mb-4">Connected Wallet: {wallet}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button onClick={() => handleAmountInput('FixedTerm')} className="bg-blue-600 py-2 px-4 rounded-lg">
          ➕ Create Fixed Term
        </button>
        <button onClick={() => handleAmountInput('FlexibleTerm')} className="bg-blue-600 py-2 px-4 rounded-lg">
          ➕ Create Flexible Term
        </button>
        <button
          onClick={() => handleAmountInput('MonthlySaver')}
          disabled={!!monthlySaver}
          className={`py-2 px-4 rounded-lg ${monthlySaver ? 'bg-gray-500' : 'bg-blue-600'}`}
        >
          ➕ Create Monthly Saver
        </button>
      </div>

      <h2 className="text-xl font-semibold mt-6 mb-2">📜 All Deposits</h2>
      <div className="space-y-4">
        {deposits.map((d, i) => (
          <div key={i} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
            <div>
              <div>Type: {d.type}</div>
              <div>Amount: {d.amount} ETH</div>
              <div>Start: {d.startTime}</div>
              {d.type === 'FixedTerm' && <div>End: {d.endTime}</div>}
            </div>
            {d.type === 'FlexibleTerm' && (
              <button onClick={() => handleWithdraw(d.index, d.type)} className="bg-red-600 px-4 py-2 rounded-lg">
                Withdraw
              </button>
            )}
          </div>
        ))}
        {deposits.length === 0 && <p className="text-gray-400">No deposits yet.</p>}
      </div>

      <h2 className="text-xl font-semibold mt-6 mb-2">📘 Monthly Saver</h2>
      {monthlySaver ? (
        <div className="bg-gray-800 p-4 rounded-lg space-y-2">
          <div>Amount: {monthlySaver.amount} ETH</div>
          <div>Interest: {monthlySaver.interest} ETH</div>
          <div>Start: {monthlySaver.startTime}</div>
          <div>End: {monthlySaver.endTime}</div>
          <div>Withdrawals: {monthlySaver.withdrawalCount}</div>
          <div className="flex gap-4">
            <button onClick={withdrawMonthly} className="bg-red-600 px-4 py-2 rounded-lg">
              Withdraw Monthly
            </button>
            <button onClick={addMonthly} className="bg-green-600 px-4 py-2 rounded-lg">
              Add Monthly Deposit
            </button>
          </div>
        </div>
      ) : (
        <p className="text-gray-400">No active Monthly Saver</p>
      )}
    </div>
  )
}
