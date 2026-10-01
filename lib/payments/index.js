// lib/payments/index.js
// The provider swap point. Routes import ONLY from "@/lib/payments".
// Replacing Pesapal later means changing these three lines.
export { submitOrder as initiatePayment } from "./pesapal/submitOrder";
export { queryStatus as getPaymentStatus } from "./pesapal/Querystatus";
export { PesapalError as PaymentProviderError } from "./pesapal/client";
