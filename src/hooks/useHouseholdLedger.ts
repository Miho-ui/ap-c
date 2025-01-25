import { useState, useEffect } from "react";
import { LedgerData } from "../models/LedgerTypes";
import { Income } from "../models/Income";
import { ExpenseItem } from "../models/ExpenseItem";
import { Budget } from "../models/Budget";

/**
 * HouseholdLedger のロジックをまとめたカスタムフック
 */
export function useHouseholdLedger() {
  // localStorage で保存するキー
  const STORAGE_KEY = "household_ledger_data";

  // データの管理用ステート
  const [data, setData] = useState<LedgerData>({
    monthExpenses: {},
    monthIncomes: {},
    monthBudgets: {},
    carryOverAmounts: {},
  });

  // マウント時に localStorage からロード
  useEffect(() => {
    loadFromLocalStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // データが更新されるたびに localStorage へ保存
  useEffect(() => {
    saveToLocalStorage();
  }, [data]);

  /**
   * localStorage に保存されているデータを読み込み
   */
  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: LedgerData = JSON.parse(stored);
        setData(parsed);
      }
    } catch (err) {
      console.error("Failed to load data from localStorage", err);
    }
  };

  /**
   * 現在のデータを localStorage に保存
   */
  const saveToLocalStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error("Failed to save data to localStorage", err);
    }
  };

  /**
   * 前月文字列を取得する "2025-01" -> "2024-12" など
   */
  const getPreviousMonth = (currentMonth: string): string => {
    const [yearStr, monthStr] = currentMonth.split("-");
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10);

    if (month === 1) {
      year--;
      month = 12;
    } else {
      month--;
    }

    return `${year.toString().padStart(4, "0")}-${month
      .toString()
      .padStart(2, "0")}`;
  };

  /**
   * 収入の設定
   */
  const setIncome = (month: string, income: Income) => {
    setData((prev) => ({
      ...prev,
      monthIncomes: {
        ...prev.monthIncomes,
        [month]: income,
      },
    }));
    // 設定後に carryOver を計算
    calculateCarryOver(month, {
      ...data,
      monthIncomes: {
        ...data.monthIncomes,
        [month]: income,
      },
    });
  };

  /**
   * 該当月の収入取得
   */
  const getIncome = (month: string): Income | null => {
    return data.monthIncomes[month] || null;
  };

  /**
   * 支出追加
   * 収入を超えないようにチェックし、OKなら合計額を追加
   */
  const addExpense = (month: string, expense: ExpenseItem): boolean => {
    const income = getIncome(month);
    const totalIncome = income ? income.salary + income.carryOver : 0;
    const totalExpenses = getTotalExpenses(month);

    if (totalExpenses + expense.amount > totalIncome) {
      alert("エラー: 収入を超える支出は行えません。");
      return false;
    }

    setData((prev) => {
      const currentExpenses = prev.monthExpenses[month] || [];
      // 同項目があれば上乗せ
      let found = false;
      const updatedExpenses = currentExpenses.map((item) => {
        if (item.name === expense.name) {
          found = true;
          return { ...item, amount: item.amount + expense.amount };
        }
        return item;
      });
      // なければ新規追加
      if (!found) {
        updatedExpenses.push(expense);
      }

      const newData = {
        ...prev,
        monthExpenses: {
          ...prev.monthExpenses,
          [month]: updatedExpenses,
        },
      };
      // 変更後に繰り越し再計算
      calculateCarryOver(month, newData);
      return newData;
    });

    return true;
  };

  /**
   * 支出修正（指定項目から減額）
   */
  const reduceExpense = (month: string, expense: ExpenseItem) => {
    setData((prev) => {
      const currentExpenses = prev.monthExpenses[month] || [];
      let found = false;
      const updatedExpenses = currentExpenses.map((item) => {
        if (item.name === expense.name) {
          found = true;
          const newAmount = item.amount - expense.amount;
          if (newAmount < 0) {
            alert("支出額が負の値になるため修正できません。");
            return item; // 変更しない
          }
          return { ...item, amount: newAmount };
        }
        return item;
      });

      if (!found) {
        alert("指定した項目が見つかりませんでした。");
        return prev;
      }

      const newData = {
        ...prev,
        monthExpenses: {
          ...prev.monthExpenses,
          [month]: updatedExpenses,
        },
      };
      // 変更後に繰り越し再計算
      calculateCarryOver(month, newData);
      return newData;
    });
  };

  /**
   * 月ごとの支出リストを取得
   */
  const getExpenses = (month: string): ExpenseItem[] => {
    return data.monthExpenses[month] || [];
  };

  /**
   * 月ごとの予算リストを取得
   */
  const getBudgets = (month: string): Budget[] => {
    return data.monthBudgets[month] || [];
  };

  /**
   * 該当月の合計支出
   */
  const getTotalExpenses = (month: string): number => {
    const expenses = getExpenses(month);
    return expenses.reduce((sum, item) => sum + item.amount, 0);
  };

  /**
   * 該当月の合計予算
   */
  const getTotalBudget = (month: string): number => {
    const budgets = getBudgets(month);
    return budgets.reduce((sum, item) => sum + item.amount, 0);
  };

  /**
   * 前月の支出を参考に今月の予算を計算（各支出項目 * 1.05）
   */
  const calculateBudget = (currentMonth: string) => {
    const previousMonth = getPreviousMonth(currentMonth);
    const previousExpenses = getExpenses(previousMonth);
    const prevExpenseMap = new Map<string, number>();
    previousExpenses.forEach((exp) => {
      prevExpenseMap.set(exp.name, exp.amount);
    });

    // 前月支出額の 1.05 倍を新たな予算に
    const newBudgets: Budget[] = [];
    prevExpenseMap.forEach((amount, name) => {
      const newAmount = amount * 1.05;
      newBudgets.push({ name, amount: newAmount });
    });

    setData((prev) => ({
      ...prev,
      monthBudgets: {
        ...prev.monthBudgets,
        [currentMonth]: newBudgets,
      },
    }));
  };

  /**
   * 繰越額の計算
   *  totalIncome - totalExpenses
   */
  const calculateCarryOver = (month: string, newData?: LedgerData) => {
    const d = newData || data;
    const income = d.monthIncomes[month];
    const totalIncome = income ? income.salary + income.carryOver : 0;
    const expenses = d.monthExpenses[month] || [];
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const carryOver = totalIncome - totalExpenses;

    setData((prev) => ({
      ...prev,
      carryOverAmounts: {
        ...prev.carryOverAmounts,
        [month]: carryOver,
      },
    }));
  };

  /**
   * 繰越額の取得
   */
  const getCarryOver = (month: string): number => {
    return data.carryOverAmounts[month] || 0;
  };

  /**
   * 特定の月の家計簿データをクリア
   * (支出と予算を削除し、収入を0 + 繰越しに再設定)
   */
  const clearLedger = (month: string) => {
    setData((prev) => {
      const carryOver = getCarryOver(month);
      return {
        ...prev,
        monthExpenses: {
          ...prev.monthExpenses,
          [month]: [],
        },
        monthBudgets: {
          ...prev.monthBudgets,
          [month]: [],
        },
        monthIncomes: {
          ...prev.monthIncomes,
          [month]: {
            salary: 0,
            carryOver: carryOver,
          },
        },
      };
    });
  };

  /**
   * 全てのデータをクリア
   */
  const clearAll = () => {
    setData({
      monthExpenses: {},
      monthIncomes: {},
      monthBudgets: {},
      carryOverAmounts: {},
    });
  };

  return {
    data,
    setIncome,
    getIncome,
    addExpense,
    reduceExpense,
    getExpenses,
    getBudgets,
    getTotalExpenses,
    getTotalBudget,
    calculateBudget,
    calculateCarryOver,
    getCarryOver,
    clearLedger,
    clearAll,
    getPreviousMonth,
  };
}

