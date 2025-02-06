import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import qs from 'qs';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

// Helper function to sort object by key
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

  // Then create sorted object with encoded values
  for (let i = 0; i < str.length; i++) {
    key = str[i];
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
  }
  return sorted;
}

async function handleCreatePayment(req: NextRequest) {
  console.log('[API] Received request at', new Date().toISOString());
  try {
    const body = await req.json();
    console.log('[API] Headers:', req.headers);
    console.log('[API] Request body:', body);
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    const {
      amount,
      planId,
      userId,
      orderInfo
    } = body;

    const tmnCode = process.env.VNP_TMN_CODE;
    const secretKey = process.env.VNP_HASH_SECRET;
    const vnpUrl = process.env.VNP_URL;
    const returnUrl = process.env.VNP_RETURN_URL;

    if (!tmnCode || !secretKey || !vnpUrl || !returnUrl) {
      return NextResponse.json(
        { error: 'Missing VNPay configuration' },
        { status: 500 }
      );
    }

    let date = new Date();
    let createDate = date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, '0') +
      date.getDate().toString().padStart(2, '0') +
      date.getHours().toString().padStart(2, '0') +
      date.getMinutes().toString().padStart(2, '0') +
      date.getSeconds().toString().padStart(2, '0');

    // Create purchase log record
    const purchaseLogsRef = collection(db, 'purchaseLogs');
    const purchaseLogDoc = doc(purchaseLogsRef);
    const orderId = purchaseLogDoc.id;  // Fix: Use actual document ID

    await setDoc(purchaseLogDoc, {
      userId,
      planId,
      amount,
      status: 'pending',
      createdAt: date,
      orderInfo
    });

    const vnpParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo || `Thanh toan cho ma GD:${orderId}`,
      vnp_OrderType: 'other',
      vnp_Amount: amount*100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddress,
      vnp_CreateDate: createDate,
    };

    const sortedParams = sortObject(vnpParams);
    const signData = qs.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const finalParams = {
      ...sortedParams,
      vnp_SecureHash: signed
    };

    const redirectUrl = `${vnpUrl}?${qs.stringify(finalParams, { encode: false })}`;
    console.log('[API] Generated URL:', redirectUrl);
    return NextResponse.json({ url: redirectUrl });
  } catch (error) {
    throw error;
    console.error('[PAYMENT_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal payment processing error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  // const searchParams = req.nextUrl.searchParams;
  const vnpParams: Record<string, string> = {};

  // Convert searchParams to object
  searchParams.forEach((value, key) => {
    vnpParams[key] = value;
  });

  const secureHash = vnpParams['vnp_SecureHash'];
  const orderId = vnpParams['vnp_TxnRef'];
  const rspCode = vnpParams['vnp_ResponseCode'];
  const amount = parseInt(vnpParams['vnp_Amount'] || '0') / 100; // Convert to original amount

  // Remove hash from params before calculating
  delete vnpParams['vnp_SecureHash'];
  delete vnpParams['vnp_SecureHashType'];

  // Sort parameters before signing
  const sortedParams = sortObject(vnpParams);

  // Create sign data
  const secretKey = process.env.VNP_HASH_SECRET || '';
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  // Get purchase log reference
  const purchaseLogRef = doc(db, 'purchaseLogs', orderId);

  try {
    // Verify checksum
    if (secureHash !== signed) {
      console.error('Checksum verification failed');
      return NextResponse.json({ RspCode: '97', Message: 'Checksum failed' });
    }

    // Get the purchase log
    const purchaseLogSnap = await getDoc(purchaseLogRef);

    if (!purchaseLogSnap.exists()) {
      console.error('Order not found:', orderId);
      return NextResponse.json({ RspCode: '01', Message: 'Order not found' });
    }

    const purchaseLog = purchaseLogSnap.data();

    // Verify amount
    if (purchaseLog.amount !== amount) {
      console.error('Amount mismatch:', { expected: purchaseLog.amount, received: amount });
      return NextResponse.json({ RspCode: '04', Message: 'Amount invalid' });
    }

    // Check if already processed
    if (purchaseLog.status !== 'pending') {
      return NextResponse.json({
        RspCode: '02',
        Message: 'This order has been updated to the payment status'
      });
    }

    // Update purchase log status based on response code
    const status = rspCode === '00' ? 'completed' : 'failed';
    await updateDoc(purchaseLogRef, {
      status,
      vnpResponseCode: rspCode,
      updatedAt: new Date()
    });

    return NextResponse.json({ RspCode: '00', Message: 'Success' });

  } catch (error) {
    console.error('Error processing IPN:', error);
    return NextResponse.json({ RspCode: '99', Message: 'Unknown error' });
  }
}

// export async function GET(request: Request) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const params: Record<string, any> = {};

//     // Convert searchParams to object
//     searchParams.forEach((value, key) => {
//       params[key] = value;
//     });

//     const secureHash = params['vnp_SecureHash'];
//     const responseCode = params['vnp_ResponseCode'];

//     // Remove hash params
//     delete params['vnp_SecureHash'];
//     delete params['vnp_SecureHashType'];

//     // Sort params
//     const sortedParams = sortObject(params);

//     // Create signature
//     const secretKey = process.env.VNP_HASH_SECRET;
//     if (!secretKey) {
//       throw new Error('Missing VNP_HASH_SECRET');
//     }

//     const signData = qs.stringify(sortedParams, { encode: false });
//     const hmac = crypto.createHmac('sha512', secretKey);
//     const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

//     // Verify signature
//     const isValidSignature = secureHash === signed;

//     // Check payment status
//     const isSuccessful = responseCode === '00';

//     return NextResponse.json({
//       isValid: isValidSignature,
//       isSuccessful,
//       responseCode,
//       orderInfo: params['vnp_OrderInfo'],
//       amount: Number(params['vnp_Amount']) / 100, // Convert back to original amount
//       payDate: params['vnp_PayDate'],
//       transactionNo: params['vnp_TransactionNo'],
//       bankCode: params['vnp_BankCode']
//     });
//   } catch (error) {
//     console.error('[PAYMENT_RETURN_ERROR]', error);
//     return NextResponse.json(
//       { error: 'Failed to process payment return' },
//       { status: 500 }
//     );
//   }
// }

export async function POST(req: NextRequest) {
  const fn = req.nextUrl.searchParams.get('fn');

  if (fn === 'createpayment') {
    return handleCreatePayment(req);
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// export async function GET(req: NextRequest) {
//   const fn = req.nextUrl.searchParams.get('fn');

//   if (fn === 'ipn') {
//     return handleIPN(req);
//   }

//   return NextResponse.json({ error: 'Not found' }, { status: 404 });
// }
