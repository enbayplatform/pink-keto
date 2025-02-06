import { NextResponse } from 'next/server';
import crypto from 'crypto';
import qs from 'qs';

function sortObject(obj: Record<string, any>) {
  const sorted: Record<string, any> = {};
  const str: string[] = [];
  let key: string;
  
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(key);
    }
  }
  str.sort();
  
  for (let i = 0; i < str.length; i++) {
    key = str[i];
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
  }
  return sorted;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params: Record<string, any> = {};
    
    // Convert searchParams to object
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const secureHash = params['vnp_SecureHash'];
    const responseCode = params['vnp_ResponseCode'];
    
    // Remove hash params
    delete params['vnp_SecureHash'];
    delete params['vnp_SecureHashType'];

    // Sort params
    const sortedParams = sortObject(params);

    // Create signature
    const secretKey = process.env.VNP_HASH_SECRET;
    if (!secretKey) {
      throw new Error('Missing VNP_HASH_SECRET');
    }

    const signData = qs.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // Verify signature
    const isValidSignature = secureHash === signed;

    // Check payment status
    const isSuccessful = responseCode === '00';

    return NextResponse.json({
      isValid: isValidSignature,
      isSuccessful,
      responseCode,
      orderInfo: params['vnp_OrderInfo'],
      amount: Number(params['vnp_Amount']) / 100, // Convert back to original amount
      payDate: params['vnp_PayDate'],
      transactionNo: params['vnp_TransactionNo'],
      bankCode: params['vnp_BankCode']
    });
  } catch (error) {
    console.error('[PAYMENT_RETURN_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to process payment return' },
      { status: 500 }
    );
  }
}
