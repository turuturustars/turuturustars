import { supabase } from "@/integrations/supabase/client";

export interface STKPushParams {
  phoneNumber: string;
  amount: number;
  accountReference?: string;
  transactionDesc?: string;
  memberId?: string;
  contributionId?: string;
}

export interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface QRCodeParams {
  amount: number;
  merchantName?: string;
  refNumber?: string;
}

export async function initiateSTKPush(params: STKPushParams): Promise<STKPushResponse> {
  const { data, error } = await supabase.functions.invoke("mpesa", {
    body: {
      action: "stk_push",
      ...params,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function queryTransactionStatus(checkoutRequestId: string) {
  const { data, error } = await supabase.functions.invoke("mpesa", {
    body: {
      action: "query_status",
      checkoutRequestId,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function generateQRCode(params: QRCodeParams) {
  const { data, error } = await supabase.functions.invoke("mpesa", {
    body: {
      action: "generate_qr",
      ...params,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function registerUrls() {
  const { data, error } = await supabase.functions.invoke("mpesa", {
    body: {
      action: "register_urls",
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function simulateC2B(params: {
  phoneNumber: string;
  amount: number;
  billRefNumber?: string;
}) {
  const { data, error } = await supabase.functions.invoke("mpesa", {
    body: {
      action: "simulate_c2b",
      ...params,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  let cleaned = phone.replace(/\D/g, "");
  
  // Handle different formats
  if (cleaned.startsWith("0")) {
    cleaned = "254" + cleaned.substring(1);
  } else if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  } else if (!cleaned.startsWith("254")) {
    cleaned = "254" + cleaned;
  }
  
  return cleaned;
}
