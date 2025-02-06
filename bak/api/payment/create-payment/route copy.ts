import { NextResponse } from 'next/server';
import crypto from 'crypto';
import qs from 'qs';
import { format } from 'date-fns';

function createDateString() {
  const date = new Date();
  const year = date.getFullYear().toString().padStart(4, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  const second = date.getSeconds().toString().padStart(2, '0');
  return `${year}${month}${day}${hour}${minute}${second}`;
}

function createDateString() {
  const date = new Date();
  const createDate = format(date, 'yyyyMMddHHmmss');
  const orderId = format(date, 'HHmmss');

  const body = await req.json();
  const {
    amount,
    bankCode,
    orderDescription: orderInfo,
    orderType,
    language: locale = 'vn'
  } = body;

  const vnpParams: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode!,
    vnp_Locale: locale,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: orderType,
    vnp_Amount: (amount * 100).toString(),
    vnp_ReturnUrl: returnUrl!,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate
  };

  if (bankCode) vnpParams.vnp_BankCode = bankCode;

  const sortedParams = sortObject(vnpParams);
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac('sha512', secretKey!);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  sortedParams.vnp_SecureHash = signed;

  const redirectUrl = vnpUrl + '?' + qs.stringify(sortedParams);
  return NextResponse.redirect(redirectUrl);
}

function sortObject(obj: Record<string, string>) {
  return Object.keys(obj)
    .sort()
    .reduce((sorted: Record<string, string>, key) => {
      sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, '+');
      return sorted;
    }, {});
}
