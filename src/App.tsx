import React, { useState } from "react";
import {
  Button,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Container,
  Box,
} from "@mui/material";
import { useHouseholdLedger } from "./hooks/useHouseholdLedger";
import { ExpenseItem } from "./models/ExpenseItem";

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

function App() {
  const {
    setIncome,
    getIncome,
    addExpense,
    reduceExpense,
    getExpenses,
    getBudgets,
    getTotalExpenses,
    getTotalBudget,
    calculateBudget,
    getCarryOver,
    clearLedger,
    clearAll,
    getPreviousMonth,
  } = useHouseholdLedger();

  // UI 用のステート
  const [currentMonth, setCurrentMonth] = useState("2025-01");
  const [salaryInput, setSalaryInput] = useState("");
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [reduceName, setReduceName] = useState("");
  const [reduceAmount, setReduceAmount] = useState("");

  const income = getIncome(currentMonth);
  const expenses = getExpenses(currentMonth);
  const budgets = getBudgets(currentMonth);
  const totalExpenses = getTotalExpenses(currentMonth);
  const totalBudget = getTotalBudget(currentMonth);
  const carryOver = getCarryOver(currentMonth);

  const handleSetIncome = () => {
    const salaryNum = parseFloat(salaryInput) || 0;
    // 前月繰越を取得
    const prevMonth = getPreviousMonth(currentMonth);
    const prevCarryOver = getCarryOver(prevMonth);
    setIncome(currentMonth, { salary: salaryNum, carryOver: prevCarryOver });
  };

  const handleAddExpense = () => {
    if (!income || (income.salary === 0 && income.carryOver === 0)) {
      alert("先に収入を入力してください。");
      return;
    }
    const amountNum = parseFloat(expenseAmount) || 0;
    addExpense(currentMonth, { name: expenseName, amount: amountNum });
  };

  const handleReduceExpense = () => {
    if (!income || (income.salary === 0 && income.carryOver === 0)) {
      alert("先に収入を入力してください。");
      return;
    }
    const amountNum = parseFloat(reduceAmount) || 0;
    reduceExpense(currentMonth, { name: reduceName, amount: amountNum });
  };

  const handleCalculateBudget = () => {
    if (!income || (income.salary === 0 && income.carryOver === 0)) {
      alert("先に収入を入力してください。");
      return;
    }
    calculateBudget(currentMonth);
  };

  const handleClearLedger = () => {
    clearLedger(currentMonth);
    setSalaryInput(""); // 画面表示用リセット
  };

  const expenseMap: Record<string, number> = {};
  const budgetMap: Record<string, number> = {};

  EXPENSE_ITEMS.forEach((item) => {
    expenseMap[item] = 0;
    budgetMap[item] = 0;
  });

  expenses.forEach((exp) => {
    expenseMap[exp.name] = exp.amount;
  });

  budgets.forEach((bud) => {
    budgetMap[bud.name] = bud.amount;
  });

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        家計簿アプリ（サンプル）
      </Typography>

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
          {income
            ? `給料：${income.salary} + 繰越：${income.carryOver} = 合計: ${
                income.salary + income.carryOver
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
        <Typography variant="body1">
          次月繰越額: {carryOver}
        </Typography>
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

export default App;

