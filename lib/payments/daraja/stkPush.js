import { getDarajaToken, getDarajaTimestamp, getDarajaPassword } from './client';

const DARAJA_BASE_URL = process.env.DARAJA_BASE_URL ?? 'https://sandbox.safaricom.co.ke';
const DARAJA_SHORTCODE = process.env.DARAJA_SHORTCODE ?? '';
const DARAJA_TILL_NUMBER = process.env.DARAJA_TILL_NUMBER ?? '';
const DARAJA_CALLBACK_URL = process.env.DARAJA_CALLBACK_URL ?? '';

export async function initiateStkPush({ amount_kes, phone, listing_id, plan_name }) {
  const token = await getDarajaToken();
  const timestamp = getDarajaTimestamp();
  const password = getDarajaPassword(timestamp);

  const stkRes = await fetch(`${DARAJA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      BusinessShortCode: DARAJA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerBuyGoodsOnline',
      Amount: amount_kes,
      PartyA: phone,
      PartyB: DARAJA_TILL_NUMBER,
      PhoneNumber: phone,
      CallBackURL: DARAJA_CALLBACK_URL,
      AccountReference: String(listing_id),
      TransactionDesc: plan_name,
    }),
  });

  const stkJson = await stkRes.json();
  return stkJson;
}
