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

type FunctionInvokeError = Error & {
  context?: Response;
};

async function extractFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (!error || typeof error !== "object") {
    return fallback;
  }

  const typedError = error as FunctionInvokeError;
  const context = typedError.context;
  if (!context || typeof context.text !== "function") {
    return typedError.message || fallback;
  }

  try {
    const raw = await context.text();
    if (!raw) {
      return typedError.message || fallback;
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const message =
        parsed.error_description ||
        parsed.error ||
        parsed.message ||
        parsed.details;

      if (typeof message === "string" && message.trim().length > 0) {
        return message;
      }
    } catch {
      if (raw.trim().length > 0) {
        return raw;
      }
    }
  } catch {
    // Fall through to generic message
  }

  return typedError.message || fallback;
}

export async function initiateSTKPush(params: STKPushParams): Promise<STKPushResponse> {
  const { data, error } = await supabase.functions.invoke("mpesa", {
    body: {
      action: "stk_push",
      ...params,
    },
  });

  // Handle error response from Supabase function
  if (error) {
    console.error("Supabase function error:", error);
    throw new Error(await extractFunctionErrorMessage(error, "Failed to call M-Pesa function"));
  }

  // Handle error response from M-Pesa API
  if (data?.error) {
    console.error("M-Pesa API error:", data.error);
    throw new Error(data.error);
  }

  console.log("STK Push response:", data);
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
    throw new Error(await extractFunctionErrorMessage(error, "Failed to query transaction status"));
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
    throw new Error(await extractFunctionErrorMessage(error, "Failed to generate M-Pesa QR code"));
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
    throw new Error(await extractFunctionErrorMessage(error, "Failed to register M-Pesa URLs"));
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
    throw new Error(await extractFunctionErrorMessage(error, "Failed to simulate C2B payment"));
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
