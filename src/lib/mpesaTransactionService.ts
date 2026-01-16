import { supabase } from "@/integrations/supabase/client";
import { queryTransactionStatus } from "./mpesa";

export interface TransactionRecord {
  id: string;
  checkout_request_id: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  phone_number: string;
  mpesa_receipt_number?: string;
  contribution_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Service for managing M-Pesa transaction lifecycle
 */
export class MpesaTransactionService {
  private static readonly POLL_INTERVAL_MS = 2000;
  private static readonly MAX_POLL_ATTEMPTS = 30;
  private static readonly CALLBACK_TIMEOUT_MS = 90000;

  /**
   * Get transaction status from database
   */
  static async getTransactionStatus(checkoutRequestId: string): Promise<TransactionRecord | null> {
    try {
      const { data, error } = await supabase
        .from("mpesa_transactions")
        .select("*")
        .eq("checkout_request_id", checkoutRequestId)
        .single();

      if (error) {
        console.error("Error fetching transaction:", error);
        return null;
      }

      return data as TransactionRecord;
    } catch (error) {
      console.error("Transaction fetch error:", error);
      return null;
    }
  }

  /**
   * Poll transaction status until callback is received or timeout
   */
  static async pollTransactionStatus(
    checkoutRequestId: string,
    options: {
      onStatusChange?: (status: string) => void;
      onSuccess?: (transaction: TransactionRecord) => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<TransactionRecord | null> {
    let attempts = 0;

    while (attempts < this.MAX_POLL_ATTEMPTS) {
      try {
        const transaction = await this.getTransactionStatus(checkoutRequestId);

        if (!transaction) {
          attempts++;
          options.onStatusChange?.(`Checking payment status... (${attempts}/${this.MAX_POLL_ATTEMPTS})`);
          await this.sleep(this.POLL_INTERVAL_MS);
          continue;
        }

        options.onStatusChange?.(`Payment status: ${transaction.status}`);

        if (transaction.status === "completed") {
          options.onSuccess?.(transaction);
          return transaction;
        } else if (transaction.status === "failed") {
          const error = new Error(`Payment failed: ${transaction.status}`);
          options.onError?.(error);
          return null;
        }

        attempts++;
        if (attempts < this.MAX_POLL_ATTEMPTS) {
          options.onStatusChange?.(`Awaiting payment confirmation... (${attempts}/${this.MAX_POLL_ATTEMPTS})`);
          await this.sleep(this.POLL_INTERVAL_MS);
        }
      } catch (error) {
        console.error("Polling error:", error);
        attempts++;
        await this.sleep(this.POLL_INTERVAL_MS);
      }
    }

    try {
      const result = await queryTransactionStatus(checkoutRequestId);
      if (result?.ResultCode === 0) {
        return await this.getTransactionStatus(checkoutRequestId);
      }
    } catch (error) {
      console.error("Final query attempt failed:", error);
    }

    return null;
  }

  /**
   * Verify transaction integrity and reconcile if needed
   */
  static async verifyAndReconcile(
    checkoutRequestId: string,
    expectedAmount: number
  ): Promise<{
    isValid: boolean;
    transaction: TransactionRecord | null;
    issues: string[];
  }> {
    const issues: string[] = [];
    const transaction = await this.getTransactionStatus(checkoutRequestId);

    if (!transaction) {
      return {
        isValid: false,
        transaction: null,
        issues: ["Transaction not found in database"],
      };
    }

    if (transaction.amount !== expectedAmount) {
      issues.push(
        `Amount mismatch: expected ${expectedAmount}, got ${transaction.amount}`
      );
    }

    if (transaction.status === "completed" && !transaction.mpesa_receipt_number) {
      issues.push("Completed transaction missing M-Pesa receipt number");
    }

    return {
      isValid: issues.length === 0 && transaction.status === "completed",
      transaction,
      issues,
    };
  }

  /**
   * Handle transaction timeout and attempt recovery
   */
  static async handleTransactionTimeout(checkoutRequestId: string): Promise<void> {
    try {
      const transaction = await this.getTransactionStatus(checkoutRequestId);

      if (!transaction) {
        return;
      }

      await supabase
        .from("mpesa_transactions")
        .update({
          status: "timeout",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      // Log the timeout
      try {
        await supabase.rpc("log_audit_action", {
          p_action_type: "MPESA_TIMEOUT",
          p_action_description: `Transaction ${checkoutRequestId} timed out`,
          p_entity_type: "mpesa_transaction",
          p_metadata: { checkoutRequestId, amount: transaction.amount },
        });
      } catch {
        // Ignore if audit log fails
      }
    } catch (error) {
      console.error("Error handling transaction timeout:", error);
    }
  }

  /**
   * Retry failed transaction
   */
  static async retryTransaction(
    previousCheckoutId: string,
    newPaymentParams: Record<string, unknown>
  ): Promise<string | null> {
    try {
      const previousTx = await this.getTransactionStatus(previousCheckoutId);

      if (!previousTx) {
        throw new Error("Previous transaction not found");
      }

      const previousTime = new Date(previousTx.created_at).getTime();
      const now = Date.now();
      const timePassed = now - previousTime;

      if (timePassed < 30000) {
        throw new Error(
          `Must wait at least 30 seconds between retry attempts (${Math.ceil((30000 - timePassed) / 1000)}s remaining)`
        );
      }

      const insertData = {
        ...newPaymentParams,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await (supabase.from("mpesa_transactions") as any).insert(insertData);

      return "Transaction retry initiated";
    } catch (error) {
      console.error("Error retrying transaction:", error);
      throw error;
    }
  }

  /**
   * Get transaction summary for UI
   */
  static async getTransactionSummary(checkoutRequestId: string) {
    try {
      const transaction = await this.getTransactionStatus(checkoutRequestId);

      if (!transaction) {
        return null;
      }

      const timeElapsed = Math.floor(
        (Date.now() - new Date(transaction.created_at).getTime()) / 1000
      );

      return {
        checkoutRequestId,
        amount: transaction.amount,
        phone: transaction.phone_number,
        status: transaction.status,
        mpesaReceipt: transaction.mpesa_receipt_number,
        transactionTime: transaction.updated_at,
        timeElapsed,
        isComplete: transaction.status === "completed",
        isFailed: transaction.status === "failed",
      };
    } catch (error) {
      console.error("Error getting transaction summary:", error);
      return null;
    }
  }

  /**
   * Clean up stale transactions (older than 24 hours and still pending)
   */
  static async cleanupStalePendingTransactions(): Promise<number> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: staleTransactions, error: fetchError } = await supabase
        .from("mpesa_transactions")
        .select("id")
        .eq("status", "pending")
        .lt("created_at", oneDayAgo);

      if (fetchError) {
        console.error("Error fetching stale transactions:", fetchError);
        return 0;
      }

      if (!staleTransactions || staleTransactions.length === 0) {
        return 0;
      }

      const ids = staleTransactions.map((tx) => tx.id);

      const { error: updateError } = await supabase
        .from("mpesa_transactions")
        .update({
          status: "abandoned",
          updated_at: new Date().toISOString(),
        })
        .in("id", ids);

      if (updateError) {
        console.error("Error marking stale transactions as abandoned:", updateError);
        return 0;
      }

      return staleTransactions.length;
    } catch (error) {
      console.error("Error cleaning up stale transactions:", error);
      return 0;
    }
  }

  /**
   * Get transaction statistics
   */
  static async getTransactionStats(days: number = 7) {
    try {
      const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("mpesa_transactions")
        .select("status, amount")
        .gte("created_at", dateFrom);

      if (error) {
        console.error("Error fetching transaction stats:", error);
        return null;
      }

      const stats = {
        total: data?.length || 0,
        completed: 0,
        pending: 0,
        failed: 0,
        totalAmount: 0,
        completedAmount: 0,
        averageAmount: 0,
      };

      (data || []).forEach((tx) => {
        if (tx.status === "completed") {
          stats.completed++;
          stats.completedAmount += tx.amount;
        } else if (tx.status === "pending") {
          stats.pending++;
        } else if (tx.status === "failed") {
          stats.failed++;
        }
        stats.totalAmount += tx.amount;
      });

      stats.averageAmount = stats.total > 0 ? stats.totalAmount / stats.total : 0;

      return stats;
    } catch (error) {
      console.error("Error calculating transaction stats:", error);
      return null;
    }
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
