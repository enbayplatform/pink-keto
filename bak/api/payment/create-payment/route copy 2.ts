import { NextResponse } from 'next/server';
import crypto from 'crypto';
import qs from 'qs';

function sortObject(obj: Record<string, any>) {
  const sorted: Record<string, any> = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+')
  });
  return sorted;
}

export async function POST(req: Request) {
  console.log('[API] Received request at', new Date().toISOString());
  try {
    const body = await req.json();
    console.log('[API] Headers:', req.headers);
    console.log('[API] Request body:', body);
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

    const {
      amount,
      bankCode,
      orderDescription: orderInfo,
      orderType,
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

    const createDate = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .slice(0, 14);

    const orderId = new Date()
      .toISOString()
      .split('T')[1]
      .replace(/[:.]/g, '')
      .slice(0, 6);

    const vnpParams = sortObject({
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: locale,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: orderType,
      vnp_Amount: amount * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddress,
      vnp_CreateDate: createDate,
      ...(bankCode && { vnp_BankCode: bankCode })
    });

    const signData = qs.stringify(vnpParams, { encode: false });
    const hmac = crypto.createHmac('sha512', secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const redirectUrl = `${vnpUrl}?${qs.stringify({
      ...vnpParams,
      vnp_SecureHash: signed
    })}`;
    return NextResponse.json({ url: redirectUrl });

    // console.log('Generated redirect URL:', redirectUrl);
    // // Add to API route.ts
    // const response = NextResponse.redirect(redirectUrl, {
    //   headers: {
    //     'Access-Control-Allow-Origin': '*',
    //     'Access-Control-Expose-Headers': 'Location'
    //   }
    // });
    // console.log('response URL:', response);
    // return response;
  } catch (error) {
    //throw error;
    console.error('[PAYMENT_ERROR]', error);
    return NextResponse.json(
      { error: 'Internal payment processing error' },
      { status: 500 }
    );
  }
}
