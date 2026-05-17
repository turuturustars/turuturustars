import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { format, isWithinInterval, parseISO, startOfMonth, subMonths } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BookOpenCheck,
  Calculator,
  Download,
  FileBarChart,
  Landmark,
  Loader2,
  PieChart as PieChartIcon,
  PlusCircle,
  ReceiptText,
  RefreshCw,
  Scale,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  CboExpenditure,
  ExpenditurePaymentMethod,
  fetchExpenditures,
  recordExpenditure,
} from '@/lib/mpesaContributionsApi';
import { cn } from '@/lib/utils';

type PeriodFilter = 'month' | 'quarter' | 'year' | 'all';

type ContributionRow = {
  id: string;
  amount: number;
  contribution_type: string;
  status: string | null;
  created_at: string | null;
  paid_at: string | null;
  due_date: string | null;
  reference_number: string | null;
};

type PaymentRow = {
  id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
  verified_at: string | null;
  mpesa_receipt: string | null;
};

type RefundRow = {
  id: string;
  contribution_type: string;
  requested_amount: number;
  payout_amount: number;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

type KittyRow = {
  id: string;
  title: string;
  category: string;
  balance: number;
  total_contributed: number;
  total_disbursed: number;
  status: string;
  created_at: string;
};

type KittyDisbursementRow = {
  id: string;
  amount: number;
  purpose: string;
  recipient: string | null;
  created_at: string;
};

type WalletRow = {
  id: string;
  balance: number;
  status: string;
};

type SupabaseErrorLike = { message?: string } | null;
type SupabaseListResponse<T> = { data: T[] | null; error: SupabaseErrorLike };
type UntypedQueryBuilder<T> = PromiseLike<SupabaseListResponse<T>> & {
  select: (columns: string) => UntypedQueryBuilder<T>;
  eq: (column: string, value: unknown) => UntypedQueryBuilder<T>;
  order: (column: string, options?: { ascending?: boolean }) => UntypedQueryBuilder<T>;
  limit: (count: number) => UntypedQueryBuilder<T>;
};
type UntypedSupabase = {
  from: <T>(table: string) => UntypedQueryBuilder<T>;
};

type AccountingAccount = {
  id: string;
  code: string;
  name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  system_key: string | null;
  is_active: boolean;
};

type ExpenseFormState = {
  amount: string;
  category: string;
  description: string;
  paymentMethod: ExpenditurePaymentMethod;
  expenseDate: string;
  payee: string;
  referenceNumber: string;
  receiptUrl: string;
  fund: string;
  accountCode: string;
  notes: string;
};

const defaultExpenseForm = (): ExpenseFormState => ({
  amount: '',
  category: 'Program Expenses',
  description: '',
  paymentMethod: 'cash',
  expenseDate: format(new Date(), 'yyyy-MM-dd'),
  payee: '',
  referenceNumber: '',
  receiptUrl: '',
  fund: 'general',
  accountCode: '5100',
  notes: '',
});

const defaultAccounts: AccountingAccount[] = [
  { id: '1000', code: '1000', name: 'Cash and Bank', account_type: 'asset', system_key: 'cash_bank', is_active: true },
  { id: '1100', code: '1100', name: 'Contribution Receivables', account_type: 'asset', system_key: 'contribution_receivables', is_active: true },
  { id: '2000', code: '2000', name: 'Accounts Payable', account_type: 'liability', system_key: 'accounts_payable', is_active: true },
  { id: '3000', code: '3000', name: 'Accumulated Fund Balance', account_type: 'equity', system_key: 'accumulated_fund_balance', is_active: true },
  { id: '4000', code: '4000', name: 'Member Contributions', account_type: 'income', system_key: 'member_contributions', is_active: true },
  { id: '4010', code: '4010', name: 'Membership Fees', account_type: 'income', system_key: 'membership_fees', is_active: true },
  { id: '4020', code: '4020', name: 'Welfare Contributions', account_type: 'income', system_key: 'welfare_contributions', is_active: true },
  { id: '4030', code: '4030', name: 'Kitty Contributions', account_type: 'income', system_key: 'kitty_contributions', is_active: true },
  { id: '5000', code: '5000', name: 'Welfare Disbursements', account_type: 'expense', system_key: 'welfare_disbursements', is_active: true },
  { id: '5100', code: '5100', name: 'Program Expenses', account_type: 'expense', system_key: 'program_expenses', is_active: true },
  { id: '5200', code: '5200', name: 'Administration Expenses', account_type: 'expense', system_key: 'administration_expenses', is_active: true },
  { id: '5300', code: '5300', name: 'Finance Charges', account_type: 'expense', system_key: 'finance_charges', is_active: true },
  { id: '5990', code: '5990', name: 'Uncategorized Expense', account_type: 'expense', system_key: 'uncategorized_expense', is_active: true },
];

const categoryOptions = [
  'Program Expenses',
  'Welfare Disbursement',
  'Administration',
  'Transport',
  'Office Supplies',
  'Communication',
  'Bank/M-Pesa Charges',
  'Events',
  'Education Support',
  'Refunds',
  'Other',
];

const fundOptions = [
  { value: 'general', label: 'General Fund' },
  { value: 'welfare', label: 'Welfare Fund' },
  { value: 'education', label: 'Education Fund' },
  { value: 'kitty', label: 'Kitty Fund' },
  { value: 'projects', label: 'Projects Fund' },
];

const pieColors = ['#16a34a', '#2563eb', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#64748b'];

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatKES(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function compactKES(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return `${amount}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message || fallback);
  }
  return fallback;
}

function getRowDate(row: { paid_at?: string | null; verified_at?: string | null; expense_date?: string | null; resolved_at?: string | null; created_at?: string | null }) {
  return row.paid_at || row.verified_at || row.expense_date || row.resolved_at || row.created_at || null;
}

function inPeriod(dateValue: string | null, period: PeriodFilter): boolean {
  if (period === 'all') return true;
  if (!dateValue) return false;

  const date = parseISO(dateValue);
  if (!Number.isFinite(date.getTime())) return false;

  const now = new Date();
  const start =
    period === 'month'
      ? startOfMonth(now)
      : period === 'quarter'
        ? startOfMonth(subMonths(now, 2))
        : startOfMonth(subMonths(now, 11));

  return isWithinInterval(date, { start, end: now });
}

function groupByLabel<T>(rows: T[], getLabel: (row: T) => string, getAmount: (row: T) => number) {
  const grouped = new Map<string, number>();
  rows.forEach((row) => {
    const label = getLabel(row) || 'Unclassified';
    grouped.set(label, (grouped.get(label) || 0) + getAmount(row));
  });

  return Array.from(grouped.entries())
    .map(([name, value]) => ({ name, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

const AccountingSuitePage = () => {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const canRecord = hasRole('treasurer') || hasRole('admin');

  const [period, setPeriod] = useState<PeriodFilter>('year');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expenditures, setExpenditures] = useState<CboExpenditure[]>([]);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [kitties, setKitties] = useState<KittyRow[]>([]);
  const [kittyDisbursements, setKittyDisbursements] = useState<KittyDisbursementRow[]>([]);
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [accounts, setAccounts] = useState<AccountingAccount[]>(defaultAccounts);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(() => defaultExpenseForm());

  const loadAccountingData = useCallback(async () => {
    setIsLoading(true);
    try {
      const db = supabase as unknown as UntypedSupabase;
      const [
        contributionsRes,
        paymentsRes,
        expenditureRows,
        refundsRes,
        kittiesRes,
        kittyDisbursementsRes,
        walletsRes,
        accountsRes,
      ] = await Promise.all([
        supabase
          .from('contributions')
          .select('id, amount, contribution_type, status, created_at, paid_at, due_date, reference_number')
          .order('created_at', { ascending: false })
          .limit(1000),
        db
          .from<PaymentRow>('payments')
          .select('id, amount, method, status, created_at, verified_at, mpesa_receipt')
          .order('created_at', { ascending: false })
          .limit(1000),
        fetchExpenditures(1000),
        db
          .from<RefundRow>('refund_requests')
          .select('id, contribution_type, requested_amount, payout_amount, status, created_at, resolved_at')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('kitties')
          .select('id, title, category, balance, total_contributed, total_disbursed, status, created_at')
          .order('created_at', { ascending: false })
          .limit(500),
        db
          .from<KittyDisbursementRow>('kitty_disbursements')
          .select('id, amount, purpose, recipient, created_at')
          .order('created_at', { ascending: false })
          .limit(500),
        db
          .from<WalletRow>('wallets')
          .select('id, balance, status')
          .limit(1000),
        db
          .from<AccountingAccount>('accounting_accounts')
          .select('id, code, name, account_type, system_key, is_active')
          .eq('is_active', true)
          .order('code', { ascending: true }),
      ]);

      if (contributionsRes.error) throw contributionsRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (refundsRes.error) throw refundsRes.error;
      if (kittiesRes.error) throw kittiesRes.error;
      if (kittyDisbursementsRes.error) throw kittyDisbursementsRes.error;
      if (walletsRes.error) throw walletsRes.error;

      setContributions((contributionsRes.data || []).map((row) => ({ ...row, amount: toNumber(row.amount) })));
      setPayments((paymentsRes.data || []).map((row) => ({ ...row, amount: toNumber(row.amount) })));
      setExpenditures(expenditureRows.map((row) => ({ ...row, amount: toNumber(row.amount) })));
      setRefunds((refundsRes.data || []).map((row) => ({
        ...row,
        requested_amount: toNumber(row.requested_amount),
        payout_amount: toNumber(row.payout_amount),
      })));
      setKitties((kittiesRes.data || []).map((row) => ({
        ...row,
        balance: toNumber(row.balance),
        total_contributed: toNumber(row.total_contributed),
        total_disbursed: toNumber(row.total_disbursed),
      })));
      setKittyDisbursements((kittyDisbursementsRes.data || []).map((row) => ({ ...row, amount: toNumber(row.amount) })));
      setWallets((walletsRes.data || []).map((row) => ({ ...row, balance: toNumber(row.balance) })));

      if (!accountsRes.error && accountsRes.data?.length) {
        setAccounts(accountsRes.data as AccountingAccount[]);
      }
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to load accounting data');
      toast({
        title: 'Accounting data error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadAccountingData();
  }, [loadAccountingData]);

  const analytics = useMemo(() => {
    const paidContributions = contributions.filter((row) => row.status === 'paid' && inPeriod(getRowDate(row), period));
    const pendingContributions = contributions.filter((row) => row.status === 'pending');
    const completedPayments = payments.filter((row) => row.status === 'completed' && inPeriod(getRowDate(row), period));
    const awaitingPayments = payments.filter((row) => row.status === 'awaiting_approval');
    const periodExpenditures = expenditures.filter((row) => inPeriod(getRowDate(row), period));
    const approvedExpenditures = periodExpenditures.filter((row) => row.status === 'approved');
    const pendingExpenditures = expenditures.filter((row) => row.status === 'pending_approval');
    const paidRefunds = refunds.filter((row) => row.status === 'paid' && inPeriod(getRowDate(row), period));
    const approvedRefunds = refunds.filter((row) => row.status === 'approved');
    const periodKittyDisbursements = kittyDisbursements.filter((row) => inPeriod(row.created_at, period));

    const contributionIncome = paidContributions.reduce((sum, row) => sum + row.amount, 0);
    const directPaymentIncome = completedPayments.reduce((sum, row) => sum + row.amount, 0);
    const kittyIncome = kitties.reduce((sum, row) => sum + row.total_contributed, 0);
    const income = contributionIncome + directPaymentIncome + kittyIncome;
    const operatingExpenses = approvedExpenditures.reduce((sum, row) => sum + row.amount, 0);
    const refundExpense = paidRefunds.reduce((sum, row) => sum + row.payout_amount, 0);
    const kittyOutflows = periodKittyDisbursements.reduce((sum, row) => sum + row.amount, 0);
    const totalExpenses = operatingExpenses + refundExpense + kittyOutflows;
    const surplus = income - totalExpenses;

    const receivables = pendingContributions.reduce((sum, row) => sum + row.amount, 0);
    const mpesaClearing = awaitingPayments.reduce((sum, row) => sum + row.amount, 0);
    const memberWalletLiability = wallets
      .filter((row) => row.status !== 'closed')
      .reduce((sum, row) => sum + row.balance, 0);
    const payables = pendingExpenditures.reduce((sum, row) => sum + row.amount, 0);
    const refundPayables = approvedRefunds.reduce((sum, row) => sum + row.payout_amount, 0);
    const cashAndBank = income - totalExpenses;
    const totalAssets = cashAndBank + receivables + mpesaClearing;
    const totalLiabilities = memberWalletLiability + payables + refundPayables;
    const fundBalance = totalAssets - totalLiabilities;

    const unclassifiedExpenses = expenditures.filter((row) => !row.account_code || row.category.toLowerCase().includes('other'));
    const missingReferences = expenditures.filter((row) => !row.reference_number && row.status !== 'rejected');

    const incomeByType = [
      { name: 'Paid Contributions', value: contributionIncome },
      { name: 'Direct M-Pesa Payments', value: directPaymentIncome },
      { name: 'Kitty Contributions', value: kittyIncome },
    ].filter((item) => item.value > 0);

    const expensesByCategory = groupByLabel(
      approvedExpenditures,
      (row) => row.category,
      (row) => row.amount,
    );

    const lastSixMonths = Array.from({ length: 6 }, (_, index) => {
      const date = startOfMonth(subMonths(new Date(), 5 - index));
      const key = format(date, 'yyyy-MM');
      return {
        key,
        month: format(date, 'MMM'),
        income: 0,
        expenses: 0,
      };
    });

    const addToMonth = (dateValue: string | null, field: 'income' | 'expenses', amount: number) => {
      if (!dateValue) return;
      const key = format(parseISO(dateValue), 'yyyy-MM');
      const target = lastSixMonths.find((item) => item.key === key);
      if (target) target[field] += amount;
    };

    paidContributions.forEach((row) => addToMonth(getRowDate(row), 'income', row.amount));
    completedPayments.forEach((row) => addToMonth(getRowDate(row), 'income', row.amount));
    approvedExpenditures.forEach((row) => addToMonth(getRowDate(row), 'expenses', row.amount));
    paidRefunds.forEach((row) => addToMonth(getRowDate(row), 'expenses', row.payout_amount));
    periodKittyDisbursements.forEach((row) => addToMonth(row.created_at, 'expenses', row.amount));

    const baseTrialBalanceRows = [
      { code: '1000', account: 'Cash and Bank', debit: Math.max(cashAndBank, 0), credit: Math.max(-cashAndBank, 0) },
      { code: '1100', account: 'Contribution Receivables', debit: receivables, credit: 0 },
      { code: '1010', account: 'M-Pesa Clearing', debit: mpesaClearing, credit: 0 },
      { code: '2100', account: 'Member Wallet Liability', debit: 0, credit: memberWalletLiability },
      { code: '2000', account: 'Accounts Payable', debit: 0, credit: payables + refundPayables },
      { code: '4000', account: 'Income Control', debit: 0, credit: income },
      { code: '5000', account: 'Expense Control', debit: totalExpenses, credit: 0 },
    ];
    const baseTrialDebit = baseTrialBalanceRows.reduce((sum, row) => sum + row.debit, 0);
    const baseTrialCredit = baseTrialBalanceRows.reduce((sum, row) => sum + row.credit, 0);
    const fundBalanceControl = {
      code: '3000',
      account: 'Accumulated Fund Balance',
      debit: Math.max(baseTrialCredit - baseTrialDebit, 0),
      credit: Math.max(baseTrialDebit - baseTrialCredit, 0),
    };
    const trialBalanceRows = [
      ...baseTrialBalanceRows.slice(0, 5),
      fundBalanceControl,
      ...baseTrialBalanceRows.slice(5),
    ];
    const trialBalanceDebitTotal = trialBalanceRows.reduce((sum, row) => sum + row.debit, 0);
    const trialBalanceCreditTotal = trialBalanceRows.reduce((sum, row) => sum + row.credit, 0);

    return {
      paidContributions,
      pendingContributions,
      completedPayments,
      awaitingPayments,
      approvedExpenditures,
      pendingExpenditures,
      paidRefunds,
      approvedRefunds,
      periodKittyDisbursements,
      income,
      contributionIncome,
      directPaymentIncome,
      kittyIncome,
      operatingExpenses,
      refundExpense,
      kittyOutflows,
      totalExpenses,
      surplus,
      cashAndBank,
      receivables,
      mpesaClearing,
      memberWalletLiability,
      payables,
      refundPayables,
      totalAssets,
      totalLiabilities,
      fundBalance,
      unclassifiedExpenses,
      missingReferences,
      incomeByType,
      expensesByCategory,
      monthlyTrend: lastSixMonths,
      trialBalanceRows,
      trialBalanceDebitTotal,
      trialBalanceCreditTotal,
      trialBalanceDifference: trialBalanceDebitTotal - trialBalanceCreditTotal,
      balanceDifference: totalAssets - (totalLiabilities + fundBalance),
    };
  }, [contributions, expenditures, kittyDisbursements, kitties, payments, period, refunds, wallets]);

  const expenseAccounts = accounts.filter((account) => account.account_type === 'expense');

  const updateExpenseForm = (field: keyof ExpenseFormState, value: string) => {
    setExpenseForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleRecordExpense = async (event: FormEvent) => {
    event.preventDefault();
    if (!canRecord) return;

    const amount = Number(expenseForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Enter a positive expenditure amount.',
        variant: 'destructive',
      });
      return;
    }

    if (!expenseForm.description.trim()) {
      toast({
        title: 'Description required',
        description: 'Add a short reason for the expenditure.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await recordExpenditure({
        amount,
        category: expenseForm.category,
        description: expenseForm.description,
        paymentMethod: expenseForm.paymentMethod,
        expenseDate: expenseForm.expenseDate,
        payee: expenseForm.payee,
        referenceNumber: expenseForm.referenceNumber,
        receiptUrl: expenseForm.receiptUrl,
        fund: expenseForm.fund,
        accountCode: expenseForm.accountCode,
        notes: expenseForm.notes,
      });

      toast({
        title: 'Expenditure recorded',
        description: 'The item has been sent into the finance approval workflow.',
      });
      setExpenseForm(defaultExpenseForm());
      await loadAccountingData();
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to record expenditure');
      toast({
        title: 'Could not record expenditure',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportSnapshot = () => {
    const rows = [
      ['Report', 'Line item', 'Amount'],
      ['Balance Sheet', 'Cash and Bank', analytics.cashAndBank],
      ['Balance Sheet', 'Contribution Receivables', analytics.receivables],
      ['Balance Sheet', 'M-Pesa Clearing', analytics.mpesaClearing],
      ['Balance Sheet', 'Total Assets', analytics.totalAssets],
      ['Balance Sheet', 'Member Wallet Liability', analytics.memberWalletLiability],
      ['Balance Sheet', 'Accounts Payable', analytics.payables],
      ['Balance Sheet', 'Refunds Payable', analytics.refundPayables],
      ['Balance Sheet', 'Total Liabilities', analytics.totalLiabilities],
      ['Balance Sheet', 'Fund Balance', analytics.fundBalance],
      ['Income & Expenditure', 'Total Income', analytics.income],
      ['Income & Expenditure', 'Total Expenditure', analytics.totalExpenses],
      ['Income & Expenditure', 'Surplus / Deficit', analytics.surplus],
    ];

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = globalThis.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `accounting-suite-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    anchor.click();
    globalThis.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-foreground">Accounting Suite</h1>
            <Badge variant={Math.abs(analytics.balanceDifference) < 1 ? 'default' : 'destructive'}>
              {Math.abs(analytics.balanceDifference) < 1 ? 'Books balancing' : 'Review balance'}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Treasurer and admin workspace for expenditure entry, statements, charts, summaries, and controls.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={period} onValueChange={(value) => setPeriod(value as PeriodFilter)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Reporting period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">Last 3 Months</SelectItem>
              <SelectItem value="year">Last 12 Months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => void loadAccountingData()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportSnapshot}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Cash Position"
          value={formatKES(analytics.cashAndBank)}
          caption={`${formatKES(analytics.receivables)} pending receivables`}
          icon={Landmark}
          tone={analytics.cashAndBank >= 0 ? 'emerald' : 'red'}
        />
        <MetricCard
          title="Income"
          value={formatKES(analytics.income)}
          caption={`${analytics.paidContributions.length + analytics.completedPayments.length} paid income records`}
          icon={TrendingUp}
          tone="blue"
        />
        <MetricCard
          title="Expenditure"
          value={formatKES(analytics.totalExpenses)}
          caption={`${formatKES(analytics.payables)} waiting approval`}
          icon={TrendingDown}
          tone="amber"
        />
        <MetricCard
          title="Surplus / Deficit"
          value={formatKES(analytics.surplus)}
          caption={`${analytics.unclassifiedExpenses.length} expenses need classification`}
          icon={Scale}
          tone={analytics.surplus >= 0 ? 'emerald' : 'red'}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expenditures">Expenditures</TabsTrigger>
          <TabsTrigger value="statements">Statements</TabsTrigger>
          <TabsTrigger value="ledger">Ledger Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileBarChart className="h-5 w-5" />
                  Income vs Expenditure
                </CardTitle>
                <CardDescription>Monthly movement over the latest six months in the selected period.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.monthlyTrend} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={compactKES} tickLine={false} axisLine={false} width={48} />
                    <Tooltip formatter={(value: number) => formatKES(value)} />
                    <Area type="monotone" dataKey="income" stroke="#16a34a" fill="url(#incomeFill)" strokeWidth={2} />
                    <Area type="monotone" dataKey="expenses" stroke="#f59e0b" fill="url(#expenseFill)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PieChartIcon className="h-5 w-5" />
                  Expense Split
                </CardTitle>
                <CardDescription>Approved expenditure by category.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                {analytics.expensesByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={analytics.expensesByCategory} dataKey="value" nameKey="name" innerRadius={58} outerRadius={98} paddingAngle={2}>
                        {analytics.expensesByCategory.map((entry, index) => (
                          <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatKES(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyPanel title="No approved expenses yet" />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <InsightCard
              title="Approval Queue"
              value={`${analytics.pendingExpenditures.length + analytics.awaitingPayments.length}`}
              caption={`${formatKES(analytics.payables + analytics.mpesaClearing)} waiting for finance action`}
              icon={BookOpenCheck}
            />
            <InsightCard
              title="Classification Quality"
              value={`${Math.max(0, expenditures.length - analytics.unclassifiedExpenses.length)}/${expenditures.length}`}
              caption="Expenses with clear account/category mapping"
              icon={Calculator}
            />
            <InsightCard
              title="Reference Control"
              value={`${analytics.missingReferences.length}`}
              caption="Expense records without payment reference"
              icon={ReceiptText}
            />
          </div>
        </TabsContent>

        <TabsContent value="expenditures" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PlusCircle className="h-5 w-5" />
                  Record Expenditure
                </CardTitle>
                <CardDescription>Submissions enter the existing finance approval workflow.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleRecordExpense}>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="expense-date">Date</Label>
                      <Input
                        id="expense-date"
                        type="date"
                        value={expenseForm.expenseDate}
                        onChange={(event) => updateExpenseForm('expenseDate', event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expense-amount">Amount</Label>
                      <Input
                        id="expense-amount"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="2500"
                        value={expenseForm.amount}
                        onChange={(event) => updateExpenseForm('amount', event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expense-payee">Payee / Supplier</Label>
                    <Input
                      id="expense-payee"
                      placeholder="Name paid or supplier"
                      value={expenseForm.payee}
                      onChange={(event) => updateExpenseForm('payee', event.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={expenseForm.category} onValueChange={(value) => updateExpenseForm('category', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Fund</Label>
                      <Select value={expenseForm.fund} onValueChange={(value) => updateExpenseForm('fund', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fundOptions.map((fund) => (
                            <SelectItem key={fund.value} value={fund.value}>{fund.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select
                        value={expenseForm.paymentMethod}
                        onValueChange={(value) => updateExpenseForm('paymentMethod', value as ExpenditurePaymentMethod)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank">Bank</SelectItem>
                          <SelectItem value="mpesa">M-Pesa</SelectItem>
                          <SelectItem value="wallet">Wallet</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Account</Label>
                      <Select value={expenseForm.accountCode} onValueChange={(value) => updateExpenseForm('accountCode', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseAccounts.map((account) => (
                            <SelectItem key={account.code} value={account.code}>
                              {account.code} - {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expense-description">Description</Label>
                    <Textarea
                      id="expense-description"
                      rows={3}
                      placeholder="What was this expenditure for?"
                      value={expenseForm.description}
                      onChange={(event) => updateExpenseForm('description', event.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="expense-reference">Reference</Label>
                      <Input
                        id="expense-reference"
                        placeholder="Receipt, cheque, M-Pesa code"
                        value={expenseForm.referenceNumber}
                        onChange={(event) => updateExpenseForm('referenceNumber', event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expense-receipt">Receipt URL</Label>
                      <Input
                        id="expense-receipt"
                        placeholder="https://..."
                        value={expenseForm.receiptUrl}
                        onChange={(event) => updateExpenseForm('receiptUrl', event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expense-notes">Notes</Label>
                    <Textarea
                      id="expense-notes"
                      rows={2}
                      placeholder="Internal notes for approvers"
                      value={expenseForm.notes}
                      onChange={(event) => updateExpenseForm('notes', event.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={!canRecord || isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ReceiptText className="mr-2 h-4 w-4" />}
                    Record Expenditure
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Expenditure Register</CardTitle>
                <CardDescription>Recent expenditure records with approval and classification status.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Payee</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenditures.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                            No expenditures recorded yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        expenditures.slice(0, 20).map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{format(parseISO(row.expense_date || row.created_at), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="max-w-[180px] truncate">{row.payee || '-'}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{row.category}</span>
                                <span className="text-xs text-muted-foreground">{row.account_code || 'No account'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{formatKES(row.amount)}</TableCell>
                            <TableCell className="uppercase">{row.payment_method}</TableCell>
                            <TableCell><StatusBadge status={row.status} /></TableCell>
                            <TableCell className="font-mono text-xs">{row.reference_number || '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="statements" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <StatementCard
              title="Balance Sheet"
              subtitle="Statement of financial position"
              sections={[
                {
                  title: 'Assets',
                  rows: [
                    ['Cash and Bank', analytics.cashAndBank],
                    ['Contribution Receivables', analytics.receivables],
                    ['M-Pesa Clearing', analytics.mpesaClearing],
                  ],
                  totalLabel: 'Total Assets',
                  total: analytics.totalAssets,
                },
                {
                  title: 'Liabilities',
                  rows: [
                    ['Member Wallet Liability', analytics.memberWalletLiability],
                    ['Accounts Payable', analytics.payables],
                    ['Refunds Payable', analytics.refundPayables],
                  ],
                  totalLabel: 'Total Liabilities',
                  total: analytics.totalLiabilities,
                },
                {
                  title: 'Fund Balance',
                  rows: [['Accumulated Fund Balance', analytics.fundBalance]],
                  totalLabel: 'Liabilities + Fund Balance',
                  total: analytics.totalLiabilities + analytics.fundBalance,
                },
              ]}
            />

            <StatementCard
              title="Trading & Profit Account"
              subtitle="Income and expenditure / surplus statement"
              sections={[
                {
                  title: 'Income',
                  rows: [
                    ['Paid Contributions', analytics.contributionIncome],
                    ['Direct M-Pesa Payments', analytics.directPaymentIncome],
                    ['Kitty Contributions', analytics.kittyIncome],
                  ],
                  totalLabel: 'Total Income',
                  total: analytics.income,
                },
                {
                  title: 'Expenditure',
                  rows: [
                    ['Approved Operating Expenditure', analytics.operatingExpenses],
                    ['Refunds Paid', analytics.refundExpense],
                    ['Kitty Disbursements', analytics.kittyOutflows],
                  ],
                  totalLabel: 'Total Expenditure',
                  total: analytics.totalExpenses,
                },
                {
                  title: 'Result',
                  rows: [['Surplus / Deficit', analytics.surplus]],
                  totalLabel: 'Net Result',
                  total: analytics.surplus,
                },
              ]}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trial Balance Snapshot</CardTitle>
              <CardDescription>Control totals derived from the current finance records.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.trialBalanceRows.map((row) => (
                    <TableRow key={row.code}>
                      <TableCell className="font-mono">{row.code}</TableCell>
                      <TableCell>{row.account}</TableCell>
                      <TableCell className="text-right">{row.debit > 0 ? formatKES(row.debit) : '-'}</TableCell>
                      <TableCell className="text-right">{row.credit > 0 ? formatKES(row.credit) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2}>Totals</TableCell>
                    <TableCell className="text-right">{formatKES(analytics.trialBalanceDebitTotal)}</TableCell>
                    <TableCell className="text-right">{formatKES(analytics.trialBalanceCreditTotal)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2}>Difference</TableCell>
                    <TableCell colSpan={2} className="text-right">
                      {formatKES(Math.abs(analytics.trialBalanceDifference))}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chart of Accounts</CardTitle>
              <CardDescription>Default accounts used to classify income, assets, liabilities, funds, and expenditure.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {accounts.map((account) => (
                  <div key={account.code} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm text-muted-foreground">{account.code}</p>
                        <p className="font-semibold">{account.name}</p>
                      </div>
                      <Badge variant="outline" className="capitalize">{account.account_type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const MetricCard = ({
  title,
  value,
  caption,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  caption: string;
  icon: typeof Landmark;
  tone: 'emerald' | 'blue' | 'amber' | 'red';
}) => {
  const toneClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-600',
    blue: 'bg-blue-500/10 text-blue-600',
    amber: 'bg-amber-500/10 text-amber-600',
    red: 'bg-red-500/10 text-red-600',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('rounded-lg p-2', toneClasses[tone])}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="break-words text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{caption}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const InsightCard = ({
  title,
  value,
  caption,
  icon: Icon,
}: {
  title: string;
  value: string;
  caption: string;
  icon: typeof BookOpenCheck;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{caption}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const EmptyPanel = ({ title }: { title: string }) => (
  <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
    {title}
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const label = status.replace(/_/g, ' ');
  const className =
    status === 'approved' || status === 'completed'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'pending_approval' || status === 'awaiting_approval'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : status === 'rejected' || status === 'failed'
          ? 'border-red-200 bg-red-50 text-red-700'
          : '';

  return <Badge variant="outline" className={cn('capitalize', className)}>{label}</Badge>;
};

const StatementCard = ({
  title,
  subtitle,
  sections,
}: {
  title: string;
  subtitle: string;
  sections: Array<{
    title: string;
    rows: Array<[string, number]>;
    totalLabel: string;
    total: number;
  }>;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">{title}</CardTitle>
      <CardDescription>{subtitle}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-5">
      {sections.map((section) => (
        <div key={section.title} className="space-y-2">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">{section.title}</h3>
          <div className="rounded-lg border">
            {section.rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 border-b px-4 py-2 text-sm last:border-b-0">
                <span>{label}</span>
                <span className="font-medium">{formatKES(value)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 bg-muted/50 px-4 py-2 text-sm font-bold">
              <span>{section.totalLabel}</span>
              <span>{formatKES(section.total)}</span>
            </div>
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);

export default AccountingSuitePage;
