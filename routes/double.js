// routes/double.js
import express from 'express';
const router = express.Router();

router.post('/apostar', async (req, res) => {
  const { cor, valor } = req.body;

  if (!cor || !valor || valor < 1) {
    return res.status(400).json({ erro: 'Dados inválidos.' });
  }

  console.log(`📝 Aposta: R$${valor} em ${cor}`);
  res.json({ sucesso: true });
});

export default router;
