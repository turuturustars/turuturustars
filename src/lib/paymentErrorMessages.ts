export interface UserFriendlyPaymentError {
  title: string;
  message: string;
  reassurance?: string;
}

const DEFAULT_PAYMENT_ERROR: UserFriendlyPaymentError = {
  title: "We couldn't send the M-Pesa prompt",
  message: "Please confirm the phone number and amount, then try again.",
  reassurance: "You have not been charged unless you approved an M-Pesa prompt on your phone.",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return "";
}

export function getFriendlyMpesaError(error: unknown): UserFriendlyPaymentError {
  const rawMessage = getErrorMessage(error).trim();
  const message = rawMessage.toLowerCase();

  if (!message) {
    return DEFAULT_PAYMENT_ERROR;
  }

  if (
    message.includes("failed to send a request") ||
    message.includes("edge function") ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed") ||
    message.includes("failed to call m-pesa function")
  ) {
    return {
      title: "M-Pesa service is not reachable",
      message: "We couldn't connect to the payment service right now. Please check your connection and try again in a minute.",
      reassurance: "No M-Pesa prompt was sent, so no money has been deducted.",
    };
  }

  if (
    message.includes("missing required") ||
    message.includes("missing required edge function secrets") ||
    (message.includes("missing") && message.includes("secret")) ||
    message.includes("not configured")
  ) {
    return {
      title: "M-Pesa payments need attention",
      message: "The payment service is temporarily unavailable. Please contact support so we can fix it.",
      reassurance: "No M-Pesa prompt was sent, so no money has been deducted.",
    };
  }

  if (
    message.includes("oauth") ||
    message.includes("access token") ||
    message.includes("auth failed") ||
    message.includes("failed to reach m-pesa") ||
    message.includes("invalid stk response") ||
    message.includes("m-pesa api")
  ) {
    return {
      title: "M-Pesa is temporarily unavailable",
      message: "The payment provider did not accept the request. Please try again shortly.",
      reassurance: "You have not been charged unless you approved an M-Pesa prompt on your phone.",
    };
  }

  if (message.includes("insufficient")) {
    return {
      title: "Payment was not completed",
      message: "Your M-Pesa balance may be too low for this amount. Top up or enter a smaller amount and try again.",
    };
  }

  if (message.includes("cancel") || message.includes("declin") || message.includes("timeout") || message.includes("timed out")) {
    return {
      title: "Payment was not completed",
      message: "The M-Pesa prompt was cancelled or expired. Send a new prompt when you are ready.",
    };
  }

  if (message.includes("phone") || message.includes("msisdn") || message.includes("invalid number")) {
    return {
      title: "Check the phone number",
      message: "Use an active M-Pesa number in the format 07XXXXXXXX or 01XXXXXXXX, then try again.",
    };
  }

  return DEFAULT_PAYMENT_ERROR;
}
