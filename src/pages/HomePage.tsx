import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Button,
  Box,
  TextField,
  Paper,
  Table,
  TableHead,
  TableCell,
  TableBody,
  TableRow,
} from "@mui/material";

/**
 * 家計簿用の型定義
 */
interface ExpenseItem {
  name: string;
  amount: number;
}
interface Budget {
  name: string;
  amount: number;
}
interface Income {
  salary: number;
  carryOver: number;
}

/**
 * HomePage:
 * - ログインチェック（未ログイン時は "/login" へリダイレクト）
 * - ログアウトボタン
 * - 家計簿機能（前回のコードを1ファイルに集約）
 */
export default function HomePage() {
  const navigate = useNavigate();

  // ログインユーザーのメール表示用
  const [email, setEmail] = useState<string | null>(null);

  /**
   * 家計簿の状態管理
   */
  const [currentMonth, setCurrentMonth] = useState("2025-01");
  const [salaryInput, setSalaryInput] = useState("");
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [reduceName, setReduceName] = useState("");
  const [reduceAmount, setReduceAmount] = useState("");

  // 「月ごと」管理用
  const [monthExpenses, setMonthExpenses] = useState<{
    [month: string]: ExpenseItem[];
  }>({});
  const [monthIncomes, setMonthIncomes] = useState<{
    [month: string]: Income;
  }>({});
  const [monthBudgets, setMonthBudgets] = useState<{
    [month: string]: Budget[];
  }>({});
  const [carryOverAmounts, setCarryOverAmounts] = useState<{
    [month: string]: number;
  }>({});

  // ----------------------------------------------------------------
  // ログインチェック: HomePageマウント時にSupabaseセッションを確認
  // ----------------------------------------------------------------
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // 未ログイン → ログインページへ
        navigate("/login");
      } else {
        setEmail(data.session.user.email ?? null);
      }
    })();
  }, [navigate]);

  // ----------------------------------------------------------------
  // 家計簿データを localStorage に保存/読み込み (必要であれば)
  // ----------------------------------------------------------------
  useEffect(() => {
    // マウント時に localStorage から読み込み
    loadFromLocalStorage();
  }, []);

  useEffect(() => {
    // 状態が変わるたびに localStorage に保存
    saveToLocalStorage();
  }, [monthExpenses, monthIncomes, monthBudgets, carryOverAmounts]);

  const STORAGE_KEY = "household_ledger_data_singlePage";

  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.monthExpenses) setMonthExpenses(parsed.monthExpenses);
        if (parsed.monthIncomes) setMonthIncomes(parsed.monthIncomes);
        if (parsed.monthBudgets) setMonthBudgets(parsed.monthBudgets);
        if (parsed.carryOverAmounts)
          setCarryOverAmounts(parsed.carryOverAmounts);
      }
    } catch (err) {
      console.error("Failed to load data from localStorage", err);
    }
  };

  const saveToLocalStorage = () => {
    try {
      const dataToSave = {
        monthExpenses,
        monthIncomes,
        monthBudgets,
        carryOverAmounts,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (err) {
      console.error("Failed to save data to localStorage", err);
    }
  };

  // ----------------------------------------------------------------
  // 家計簿のロジック
  // ----------------------------------------------------------------

  // 前月文字列
  const getPreviousMonth = (month: string) => {
    const [yearStr, monthStr] = month.split("-");
    let year = parseInt(yearStr, 10);
    let m = parseInt(monthStr, 10);
    if (m === 1) {
      year--;
      m = 12;
    } else {
      m--;
    }
    return `${year.toString().padStart(4, "0")}-${m
      .toString()
      .padStart(2, "0")}`;
  };

  // 該当月の income を取得
  const getIncome = (month: string): Income | null => {
    return monthIncomes[month] || null;
  };

  // 収入設定
  const setIncome = (month: string, income: Income) => {
    setMonthIncomes((prev) => ({
      ...prev,
      [month]: income,
    }));
    calculateCarryOver(month);
  };

  // 合計支出を取得
  const getTotalExpenses = (month: string): number => {
    const items = monthExpenses[month] || [];
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  // 合計予算を取得
  const getTotalBudget = (month: string): number => {
    const buds = monthBudgets[month] || [];
    return buds.reduce((sum, b) => sum + b.amount, 0);
  };

  // 繰越額を取得
  const getCarryOver = (month: string): number => {
    return carryOverAmounts[month] || 0;
  };

  // 支出追加
  const addExpense = (month: string, expense: ExpenseItem): boolean => {
    const income = getIncome(month);
    const totalIncome = income ? income.salary + income.carryOver : 0;
    const currentExpenses = getTotalExpenses(month);

    if (currentExpenses + expense.amount > totalIncome) {
      alert("エラー: 収入を超える支出は行えません。");
      return false;
    }

    setMonthExpenses((prev) => {
      const oldList = prev[month] || [];
      let found = false;
      const updatedList = oldList.map((item) => {
        if (item.name === expense.name) {
          found = true;
          return { ...item, amount: item.amount + expense.amount };
        }
        return item;
      });
      if (!found) {
        updatedList.push(expense);
      }
      return {
        ...prev,
        [month]: updatedList,
      };
    });

    // 終了後、繰越再計算
    setTimeout(() => calculateCarryOver(month), 0);
    return true;
  };

  // 支出修正（指定項目から減額）
  const reduceExpense = (month: string, expense: ExpenseItem) => {
    setMonthExpenses((prev) => {
      const oldList = prev[month] || [];
      let found = false;
      const updatedList = oldList.map((item) => {
        if (item.name === expense.name) {
          found = true;
          const newAmount = item.amount - expense.amount;
          if (newAmount < 0) {
            alert("支出額が負の値になるため修正できません。");
            return item; // 変更せずにそのまま
          }
          return { ...item, amount: newAmount };
        }
        return item;
      });
      if (!found) {
        alert("指定した項目が見つかりません。");
        return prev;
      }
      return {
        ...prev,
        [month]: updatedList,
      };
    });
    // 終了後、繰越再計算
    setTimeout(() => calculateCarryOver(month), 0);
  };

  // 予算計算 (前月の支出をもとに *1.05 で算出)
  const calculateBudget = (currentMonth: string) => {
    const prevMonth = getPreviousMonth(currentMonth);
    const prevExpenses = monthExpenses[prevMonth] || [];
    const newBudgets: Budget[] = prevExpenses.map((exp) => ({
      name: exp.name,
      amount: exp.amount * 1.05,
    }));
    setMonthBudgets((prev) => ({
      ...prev,
      [currentMonth]: newBudgets,
    }));
  };

  // 繰越計算 (今月の総収入 - 総支出)
  const calculateCarryOver = (month: string) => {
    const income = getIncome(month);
    if (!income) return;
    const totalIncome = income.salary + income.carryOver;
    const expenses = monthExpenses[month] || [];
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const carry = totalIncome - totalExpenses;
    setCarryOverAmounts((prev) => ({
      ...prev,
      [month]: carry,
    }));
  };

  // 今月の家計簿をクリア
  const clearLedger = (month: string) => {
    const co = getCarryOver(month);
    setMonthExpenses((prev) => ({ ...prev, [month]: [] }));
    setMonthBudgets((prev) => ({ ...prev, [month]: [] }));
    setMonthIncomes((prev) => ({
      ...prev,
      [month]: {
        salary: 0,
        carryOver: co,
      },
    }));
  };

  // 全部削除
  const clearAll = () => {
    setMonthExpenses({});
    setMonthBudgets({});
    setMonthIncomes({});
    setCarryOverAmounts({});
  };

  // ----------------------------------------------------------------
  // 各種UIのイベントハンドラ
  // ----------------------------------------------------------------

  // 給料入力(収入設定)
  const handleSetIncome = () => {
    const salaryNum = parseFloat(salaryInput) || 0;
    const prevMonth = getPreviousMonth(currentMonth);
    const prevCarry = getCarryOver(prevMonth);
    const newIncome: Income = {
      salary: salaryNum,
      carryOver: prevCarry,
    };
    setIncome(currentMonth, newIncome);
  };

  // 支出追加
  const handleAddExpense = () => {
    const inc = getIncome(currentMonth);
    if (!inc || (inc.salary === 0 && inc.carryOver === 0)) {
      alert("先に収入を入力してください。");
      return;
    }
    const amountNum = parseFloat(expenseAmount) || 0;
    addExpense(currentMonth, {
      name: expenseName,
      amount: amountNum,
    });
  };

  // 支出修正
  const handleReduceExpense = () => {
    const inc = getIncome(currentMonth);
    if (!inc || (inc.salary === 0 && inc.carryOver === 0)) {
      alert("先に収入を入力してください。");
      return;
    }
    const amountNum = parseFloat(reduceAmount) || 0;
    reduceExpense(currentMonth, {
      name: reduceName,
      amount: amountNum,
    });
  };

  const handleCalculateBudget = () => {
    const inc = getIncome(currentMonth);
    if (!inc || (inc.salary === 0 && inc.carryOver === 0)) {
      alert("先に収入を入力してください。");
      return;
    }
    calculateBudget(currentMonth);
  };

  const handleClearLedger = () => {
    clearLedger(currentMonth);
    setSalaryInput("");
  };

  // ログアウト
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  // ----------------------------------------------------------------
  // 表示用
  // ----------------------------------------------------------------
  const EXPENSE_ITEMS = [
    "家賃",
    "光熱費",
    "食費",
    "保険",
    "日用品",
    "通信費",
    "交通費",
    "交際費",
    "その他",
  ];

  const inc = getIncome(currentMonth);
  const totalExpenses = getTotalExpenses(currentMonth);
  const totalBudget = getTotalBudget(currentMonth);
  const carryOver = getCarryOver(currentMonth);

  // 表示用マップ（支出と予算）
  const expenseMap: Record<string, number> = {};
  const budgetMap: Record<string, number> = {};
  EXPENSE_ITEMS.forEach((item) => {
    expenseMap[item] = 0;
    budgetMap[item] = 0;
  });

  const expList = monthExpenses[currentMonth] || [];
  expList.forEach((ex) => {
    expenseMap[ex.name] = ex.amount;
  });
  const budList = monthBudgets[currentMonth] || [];
  budList.forEach((b) => {
    budgetMap[b.name] = b.amount;
  });

  // ----------------------------------------------------------------
  // レンダリング
  // ----------------------------------------------------------------
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      {/* ヘッダ部分: ログアウト */}
      <Box sx={{ textAlign: "right", mb: 2 }}>
        {email ? (
          <Typography variant="body1">
            ログイン中: {email} さん
            <Button
              variant="outlined"
              color="secondary"
              sx={{ ml: 2 }}
              onClick={handleLogout}
            >
              ログアウト
            </Button>
          </Typography>
        ) : (
          <Typography>ログイン情報を読み込み中...</Typography>
        )}
      </Box>

      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography variant="h4">家計簿メイン画面</Typography>
      </Box>

      {/* 月の設定 */}
      <Box sx={{ mb: 2 }}>
        <TextField
          label="現在の月 (例: 2025-01)"
          value={currentMonth}
          onChange={(e) => setCurrentMonth(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ mr: 2 }}
        />
      </Box>

      {/* 収入設定 */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">給料の入力（初回 or 修正）</Typography>
        <TextField
          label="給料"
          value={salaryInput}
          onChange={(e) => setSalaryInput(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ mr: 2 }}
        />
        <Button variant="contained" onClick={handleSetIncome}>
          収入を設定
        </Button>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body1">
          現在の月の収入：
          {inc
            ? `給料：${inc.salary} + 繰越：${inc.carryOver} = 合計: ${
                inc.salary + inc.carryOver
              }`
            : "未設定"}
        </Typography>
      </Box>

      {/* 支出追加 */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">支出の追加</Typography>
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2">
            項目例: {EXPENSE_ITEMS.join(" / ")}
          </Typography>
        </Box>
        <TextField
          label="支出項目"
          value={expenseName}
          onChange={(e) => setExpenseName(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ mr: 2 }}
        />
        <TextField
          label="支出額"
          value={expenseAmount}
          onChange={(e) => setExpenseAmount(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ mr: 2 }}
        />
        <Button variant="contained" onClick={handleAddExpense}>
          支出追加
        </Button>
      </Box>

      {/* 支出修正 */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">支出の修正（指定項目から減額）</Typography>
        <TextField
          label="支出項目"
          value={reduceName}
          onChange={(e) => setReduceName(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ mr: 2 }}
        />
        <TextField
          label="減額する金額"
          value={reduceAmount}
          onChange={(e) => setReduceAmount(e.target.value)}
          variant="outlined"
          size="small"
          sx={{ mr: 2 }}
        />
        <Button variant="contained" onClick={handleReduceExpense}>
          減額
        </Button>
      </Box>

      {/* 予算計算 */}
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={handleCalculateBudget}>
          予算を計算する
        </Button>
      </Box>

      {/* テーブル表示 */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">支出と予算一覧</Typography>
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>項目</TableCell>
                <TableCell>支出</TableCell>
                <TableCell>予算</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {EXPENSE_ITEMS.map((item) => (
                <TableRow key={item}>
                  <TableCell>{item}</TableCell>
                  <TableCell>{expenseMap[item]}</TableCell>
                  <TableCell>{budgetMap[item]}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell>合計</TableCell>
                <TableCell>{totalExpenses}</TableCell>
                <TableCell>{totalBudget}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Paper>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body1">次月繰越額: {carryOver}</Typography>
      </Box>

      {/* その他操作 */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          color="warning"
          sx={{ mr: 2 }}
          onClick={handleClearLedger}
        >
          今月の家計簿をクリア
        </Button>
        <Button
          variant="outlined"
          color="error"
          onClick={() => {
            clearAll();
            setSalaryInput("");
            setExpenseName("");
            setExpenseAmount("");
            setReduceName("");
            setReduceAmount("");
          }}
        >
          全てのファイルをクリア
        </Button>
      </Box>
    </Container>
  );
}
