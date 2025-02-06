import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import qs from 'querystring';
import dateFormat from 'dateformat';

function sortObject2(obj: any) {
    let sorted: any = {};
    let str: string[] = [];
    let key: string;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (let i = 0; i <str.length; i++) {
        sorted[str[i]] = encodeURIComponent(obj[str[i]]).replace(/%20/g, "+");
    }
    return sorted;
}

function sortObject(obj: Record<string, any>) {
  const sorted: Record<string, any> = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+')
  });
  return sorted;
}


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const ipAddr = req.headers.get('x-forwarded-for') || '127.0.0.1';

        // Get config from environment variables
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

        const date = new Date();
        const createDate = dateFormat(date, 'yyyymmddHHmmss');
        const orderId = dateFormat(date, 'HHmmss');

        const { amount, bankCode, orderDescription, orderType, language = 'vn' } = body;

        const vnpParams: any = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: tmnCode,
            vnp_Locale: language,
            vnp_CurrCode: 'VND',
            vnp_TxnRef: orderId,
            vnp_OrderInfo: orderDescription,
            vnp_OrderType: orderType,
            vnp_Amount: amount * 100,
            vnp_ReturnUrl: returnUrl,
            vnp_IpAddr: ipAddr,
            vnp_CreateDate: createDate,
        };

        if (bankCode) {
            vnpParams.vnp_BankCode = bankCode;
        }


    const vnpParams2 = sortObject({
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      // vnp_Locale: locale,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      // vnp_OrderInfo: orderInfo,
      vnp_OrderType: orderType,
      vnp_Amount: amount * 100,
      vnp_ReturnUrl: returnUrl,
      // vnp_IpAddr: ipAddress,
      vnp_CreateDate: createDate,
      ...(bankCode && { vnp_BankCode: bankCode })
    });

    const signData2 = qs.stringify(vnpParams2, { encode: false });

        const sortedParams = sortObject(vnpParams);
        const signData = qs.stringify(sortedParams, { encode: false });

        const hmac = crypto.createHmac('sha512', secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        sortedParams.vnp_SecureHash = signed;
        const finalUrl = `${vnpUrl}?${qs.stringify(sortedParams, { encode: false })}`;

        return NextResponse.json({ url: finalUrl });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to create payment URL' },
            { status: 500 }
        );
    }
}