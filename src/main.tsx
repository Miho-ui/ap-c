import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@mui/material"; // 必要に応じてインポート
import "@mui/icons-material"; // アイコンを使う場合

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

