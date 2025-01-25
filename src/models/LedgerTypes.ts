import { Budget } from "./Budget";
import { ExpenseItem } from "./ExpenseItem";
import { Income } from "./Income";

export interface LedgerData {
  monthExpenses: { [month: string]: ExpenseItem[] };
  monthIncomes: { [month: string]: Income };
  monthBudgets: { [month: string]: Budget[] };
  carryOverAmounts: { [month: string]: number };
}
