import { NextResponse } from 'next/server';
import crypto from 'crypto';
import qs from 'qs';

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

export async function POST(req: Request) {
  console.log('[API] Received request at', new Date().toISOString());
  try {
    const body = await req.json();
    console.log('[API] Headers:', req.headers);
    console.log('[API] Request body:', body);
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    const {
      amount,
      bankCode,
      orderDescription: orderInfo,
      orderType = 'other',
      language: locale = 'vn'
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

    const orderId = 'ng'+createDate + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    const vnpParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: locale,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo || `Thanh toan cho ma GD:${orderId}`,
      vnp_OrderType: orderType,
      vnp_Amount: amount * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddress,
      vnp_CreateDate: createDate,
     //vnp_BankCode: 'VnPayQR'// 'INTCARD'


    };
 //...(bankCode && { vnp_BankCode: bankCode })
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
    console.error('[PAYMENT_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal payment processing error' },
      { status: 500 }
    );
  }
}
