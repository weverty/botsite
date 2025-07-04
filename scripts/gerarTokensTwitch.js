import axios from 'axios';
import fs from 'fs';

const code = 'w03k6hl1ba9n4glr60vllb6mubo2ky'; // ← da URL depois do login

async function trocarCodePorToken() {
  try {
    const res = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: 'pm04uuaswuyi1yczzaaw8pigmlnl98',
        client_secret: '4k60ap3veytp5ueiu72u7mbwmnr8bq',
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000/twitch-token-callback'
      }
    });

    const { access_token, refresh_token } = res.data;

    fs.writeFileSync('./tokens.json', JSON.stringify({ access_token, refresh_token }, null, 2));
    console.log('✅ Access Token gerado e salvo!');
    console.log('🔄 Refresh Token gerado e salvo!');
  } catch (err) {
    console.error('❌ Erro ao trocar code:', err.response?.data || err.message);
  }
}

trocarCodePorToken();
