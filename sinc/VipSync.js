import ConfiguracaoDiscord from '../models/ConfiguracaoDiscord.js';
import UsuarioVinculado from '../models/UsuarioVinculado.js';
import { client } from '../bot.js';
import axios from 'axios';
import fs from 'fs';

const tokenFile = './tokens.json';

console.log('🔄 vipSync.js carregado com sucesso');

// 🔐 Renova token Twitch com base no refresh recebido
async function renovarToken(refreshTokenParam) {
  try {
    const res = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: refreshTokenParam,
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET
      }
    });

    const { access_token, refresh_token: novoRefresh, expires_in } = res.data;

    const tokensAtualizados = {
      access_token,
      refresh_token: novoRefresh,
      expires_in
    };

    fs.writeFileSync(tokenFile, JSON.stringify(tokensAtualizados, null, 2));
    console.log('✅ Token Twitch renovado com sucesso!');
    return tokensAtualizados;
  } catch (err) {
    console.error('❌ Erro ao renovar token Twitch:', err.response?.data || err.message);
    return null;
  }
}

// 🔎 Busca VIPs usando token válido
async function obterListaVIPs(broadcasterId) {
  let savedTokens;
  try {
    savedTokens = JSON.parse(fs.readFileSync(tokenFile));
  } catch {
    console.warn('⚠️ Token salvo não encontrado. Usando .env como fallback');
    savedTokens = {
      access_token: process.env.TWITCH_ACCESS_TOKEN,
      refresh_token: process.env.TWITCH_REFRESH_TOKEN
    };
  }

  const fetchVIPs = async (accessToken) => {
    const res = await fetch(`https://api.twitch.tv/helix/channels/vips?broadcaster_id=${broadcasterId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID
      }
    });
    return await res.json();
  };

  let json = await fetchVIPs(savedTokens.access_token);

  if (json.status === 401 || !json.data) {
    console.warn('⚠️ Token inválido ou expirado. Tentando renovar...');
    const tokensRenovados = await renovarToken(savedTokens.refresh_token);
    if (!tokensRenovados) return [];

    savedTokens = tokensRenovados;
    fs.writeFileSync(tokenFile, JSON.stringify(savedTokens, null, 2));
    json = await fetchVIPs(savedTokens.access_token);
  }

  const lista = (json.data || []).map(vip => String(vip.user_id));
  console.log('🎖️ VIPs encontrados na Twitch:', lista.length);
  return lista;
}


// 🔁 Sincroniza cargos VIP no Discord
export async function sincronizarVIPs() {
  console.log('🔁 Rodando sincronização de VIPs...');

  const configAtual = await ConfiguracaoDiscord.findOne({ tipo: 'cargo_vip', ativo: true });
  const configAnterior = await ConfiguracaoDiscord.findOne({ tipo: 'cargo_vip', ativo: false }).sort({ atualizadoEm: -1 });

  const cargoVipId = configAtual?.canalId;
  const cargoVipAnteriorId = configAnterior?.canalId;
  const twitchId = process.env.TWITCH_BROADCASTER_ID;

  if (!cargoVipId || !twitchId) {
    console.warn('⚠️ Configuração incompleta (.env ou banco)');
    return;
  }

  let savedTokens;
  try {
    savedTokens = JSON.parse(fs.readFileSync(tokenFile));
  } catch {
    console.warn('⚠️ Token salvo não encontrado. Usando .env como fallback');
    savedTokens = {
      access_token: process.env.TWITCH_ACCESS_TOKEN,
      refresh_token: process.env.TWITCH_REFRESH_TOKEN
    };
  }

  const listaVIPs = await obterListaVIPs(twitchId);
  const vipSet = new Set(listaVIPs);
  const vinculados = await UsuarioVinculado.find();

  const GUILD_ID = process.env.DISCORD_GUILD_ID;
  let guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) {
    guild = await client.guilds.fetch(GUILD_ID).catch(err => {
      console.error('❌ Não foi possível buscar a guilda:', err.message);
      return null;
    });
  }

  for (const user of vinculados) {
    try {
      const membro = await guild.members.fetch(user.discordId);
      const éVIP = vipSet.has(String(user.twitchId));
      const temCargoAtual = membro.roles.cache.has(cargoVipId);

      if (cargoVipAnteriorId && cargoVipAnteriorId !== cargoVipId && membro.roles.cache.has(cargoVipAnteriorId)) {
        await membro.roles.remove(cargoVipAnteriorId);
        console.log(`♻️ Cargo VIP anterior removido de ${user.discordUsername}`);
      }

      if (éVIP && !temCargoAtual) {
        await membro.roles.add(cargoVipId);
        console.log(`✨ Cargo VIP adicionado: ${user.discordUsername} (${user.twitchUsername})`);
      }

      if (!éVIP && temCargoAtual) {
        await membro.roles.remove(cargoVipId);
        console.log(`❌ Cargo VIP removido: ${user.discordUsername} (${user.twitchUsername})`);
      }

    } catch (err) {
      console.warn(`⚠️ Erro ao processar ${user.discordUsername}: ${err.message}`);
    }
  }
}
