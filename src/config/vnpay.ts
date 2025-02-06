export const vnpayConfig = {
  vnp_TmnCode: process.env.VNP_TMN_CODE || "YOUR_TMN_CODE",
  vnp_HashSecret: process.env.VNP_HASH_SECRET || "YOUR_HASH_SECRET",
  vnp_Url: process.env.vnp_Url || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  vnp_ReturnUrl: process.env.vnp_ReturnUrl || "http://localhost:3000/order/vnpay_return",
  vnp_Api: process.env.vnp_Api || "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction"
};
