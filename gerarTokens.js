import axios from 'axios';
import fs from 'fs';

// 🧩 Substitua pelos seus dados:
const CLIENT_ID = 'pm04uuaswuyi1yczzaaw8pigmlnl98';
const CLIENT_SECRET = 'xzutsvdgtjat3ouvbbd6n2edh1usj1';
const CODE = 'acu90jadmvieeirczelgywpr6yu3j6'; // aquele que apareceu na URL
const REDIRECT_URI = 'http://localhost:3000/auth/twitch/callback';

async function trocarCodePorToken() {
  try {
    const res = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: CODE,
        redirect_uri: REDIRECT_URI
      }
    });

    const { access_token, refresh_token, expires_in } = res.data;
    console.log('✅ Access Token:', access_token);
    console.log('🔁 Refresh Token:', refresh_token);

    // 💾 Salvar num arquivo
    fs.writeFileSync('./tokens.json', JSON.stringify({ access_token, refresh_token, expires_in }, null, 2));
    console.log('📦 Tokens salvos em tokens.json');

  } catch (err) {
    console.error('❌ Erro ao trocar code por token:', err.response?.data || err.message);
  }
}

trocarCodePorToken();
