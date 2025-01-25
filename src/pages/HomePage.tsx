import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import { Container, Typography, Button, Box } from "@mui/material";

export default function HomePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // 未ログインの場合はログインページへ
        navigate("/login");
      } else {
        setEmail(data.session.user.email);
      }
    })();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Box sx={{ textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          ホーム画面
        </Typography>
        {email ? (
          <Typography>こんにちは、{email}さん</Typography>
        ) : (
          <Typography>読み込み中...</Typography>
        )}

        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={handleLogout}>
            ログアウト
          </Button>
        </Box>
      </Box>
    </Container>
  );
}

