'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface PaymentResult {
  isValid: boolean;
  isSuccessful: boolean;
  responseCode: string;
  orderInfo: string;
  amount: number;
  payDate: string;
  transactionNo: string;
  bankCode: string;
}

export default function PaymentReturnPage() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const response = await fetch(`/api/payment/vnpay-return${window.location.search}`);
        if (!response.ok) {
          throw new Error('Failed to verify payment');
        }
        const data = await response.json();
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌ Error</div>
          <p className="text-gray-600">{error}</p>
          <Link href="/" className="mt-4 inline-block text-pink-500 hover:text-pink-600">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    // Format: YYYYMMDDHHMMSS to readable date
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    const hour = dateStr.slice(8, 10);
    const minute = dateStr.slice(10, 12);
    const second = dateStr.slice(12, 14);
    return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          {result.isValid && result.isSuccessful ? (
            <>
              <div className="text-green-500 text-4xl mb-4">✓</div>
              <h1 className="text-2xl font-bold text-gray-900">Payment Successful</h1>
            </>
          ) : (
            <>
              <div className="text-red-500 text-4xl mb-4">✗</div>
              <h1 className="text-2xl font-bold text-gray-900">Payment Failed</h1>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="border-t border-gray-200 pt-4">
            <dl className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-gray-500">Amount</dt>
                <dd className="text-sm text-gray-900 col-span-2">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(result.amount)}
                </dd>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-gray-500">Order Info</dt>
                <dd className="text-sm text-gray-900 col-span-2">{result.orderInfo}</dd>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-gray-500">Transaction Date</dt>
                <dd className="text-sm text-gray-900 col-span-2">{formatDate(result.payDate)}</dd>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-gray-500">Transaction No.</dt>
                <dd className="text-sm text-gray-900 col-span-2">{result.transactionNo}</dd>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <dt className="text-sm font-medium text-gray-500">Bank</dt>
                <dd className="text-sm text-gray-900 col-span-2">{result.bankCode}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
