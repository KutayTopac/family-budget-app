import type { TransactionListItem } from '@/features/transactions/application/transaction-gateway';
export type MoneySummary={currency:string;income:number;expense:number;netFlow:number;budgetLimit:number;remainingBudget:number|null;liquidAssets:number;investmentValue:number;debt:number;netWorth:number};
export type BreakdownItem={id:string;label:string;value:number;color:string};
export type MonthlyTrendItem={key:string;label:string;income:number;expense:number};
export type BudgetProgressItem={id:string;category:string;limit:number;spent:number;currency:string};
export type DashboardData={summary:MoneySummary;recent:TransactionListItem[]};
export type AnalyticsData={currency:string;categories:BreakdownItem[];people:BreakdownItem[];trend:MonthlyTrendItem[];budgets:BudgetProgressItem[]};
export interface DashboardGateway{getDashboard(householdId:string):Promise<DashboardData>;getAnalytics(householdId:string):Promise<AnalyticsData>}
