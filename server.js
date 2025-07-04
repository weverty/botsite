import express from 'express';
import session from 'express-session';
import passport from 'passport';
import DiscordStrategy from 'passport-discord';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import twitch from 'passport-twitch-new';
import Item from './models/Item.js';
import cron from 'node-cron';
import Categoria from './models/Categoria.js';
import multer from 'multer';
import fs from 'fs';
import Config from './models/Config.js';
import LogResgate from './models/LogResgate.js';
import { Client, GatewayIntentBits } from 'discord.js';
import axios from 'axios';
import ConfiguracaoDiscord from './models/ConfiguracaoDiscord.js';
import { getCanalLog } from './utils/discordLogs.js';
import verificarOwner from './middlewares/verificarOwner.js';
import Usuario from './models/UsuarioVinculado.js'; // ajuste o caminho se necessário
import verificarBanimento from './middlewares/verificarBanimento.js';
import { client } from './bot.js';
import { sincronizarVIPs } from './sinc/VipSync.js';
import Rodada from './models/Rodada.js';
import Jogada from'./models/Jogada.js';
import doubleRoutes from './routes/double.js';


const { Strategy: TwitchStrategy } = twitch;

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/api/double', doubleRoutes);


app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// 🎯 Conexão MongoDB
mongoose.connect(process.env.MONGO_URI);

const UsuarioSchema = new mongoose.Schema({
  discordId: String,
  discordUsername: String,
  twitchId: String,
  twitchUsername: String
});




// 🔐 Sessões
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  const user = await Usuario.findById(id);
  done(null, user);
});

// 🔗 Discord Strategy
passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_CALLBACK_URL,
  scope: ['identify']
}, async (accessToken, refreshToken, profile, done) => {
  const nome = profile.username || profile.global_name || 'desconhecido';

  let user = await Usuario.findOne({ discordId: profile.id });

  if (!user) {
    user = await Usuario.create({
      discordId: profile.id,
      discordUsername: nome
    });
  } else {
    user.discordUsername = nome; // ✅ atualiza mesmo se já existir
    await user.save();
  }

  done(null, user);
}));



client.once('ready', async () => {
    sincronizarVIPs();
  setInterval(() => sincronizarVIPs(), 30000);

});


client.once('ready', async () => {
  console.log(`🤖 Bot conectado como ${client.user.tag}`);

  const config = await ConfiguracaoDiscord.findOne({ tipo: 'canal_logs_terminal' });

  if (config?.canalId) {
    try {
      const channel = await client.channels.fetch(config.canalId);
      client.logChannel = channel;

      console.log(`📡 Canal de logs conectado: ${channel.name}`);

      // FORÇA mensagem de teste
      await channel.send('🧪 Logs no discord INICIADO COM SUCESSO! \n Aloo <@732105221567676416> e <@919370866985414677>, o bot teve uma reinicialização na HOST?!');
    } catch (err) {
      console.warn('⚠️ Erro ao buscar ou enviar mensagem no canal de logs:', err.message);
    }
  }
});


client.login(process.env.TOKEN_DISCORD);



const originalLog = console.log;

console.log = function (...args) {
  const texto = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    } else {
      return String(arg);
    }
  }).join(' ');

  originalLog(texto);

  if (client?.logChannel) {
    client.logChannel.send(`📥 ${texto}`).catch(() => {});
  }
};



// 🔗 Twitch Strategy
passport.use(new TwitchStrategy({
  clientID: process.env.TWITCH_CLIENT_ID,
  clientSecret: process.env.TWITCH_CLIENT_SECRET,
  callbackURL: process.env.TWITCH_CALLBACK_URL,
  scope: 'user:read:email',
  passReqToCallback: true // 👈 isso aqui é fundamental!
}, async (req, accessToken, refreshToken, profile, done) => {
  const userId = req.query.state;
  const user = await Usuario.findById(userId);

  if (user) {
    user.twitchId = profile.id;
    user.twitchUsername = profile.display_name;
    await user.save();

    // 👇 AQUI: cria ou atualiza a vinculação no painel
    console.log('👤 Discord do usuário vinculado:', user.discordUsername);
await Usuario.findOneAndUpdate(
  { discordId: user.discordId },
  {
    twitchId: profile.id,
    twitchUsername: profile.display_name,
    discordId: user.discordId,
    discordUsername: user.discordUsername,
    status: 'viewer'
  },
  { upsert: true }
);


    
    return done(null, user);
  } else {
    return done(null, false);
  }
}));


cron.schedule('*/5 * * * *', async () => {
  try {
    const online = await estaOnlineNaTwitch();

    if (!online) {
      console.log('⛔ Live OFF. Nada de pontos.');
      return;
    }

    // Resto da lógica…
  } catch (err) {
    console.error('❌ Erro durante o cron:', err);
  }
});



async function estaOnlineNaTwitch() {
  const res = await fetch(`https://api.twitch.tv/helix/streams?user_login=weverty__17`, {
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${process.env.TWITCH_ACCESS_TOKEN}`
    }
  });
  const json = await res.json();
  return json.data && json.data.length > 0;
}

async function estaNoChat(twitchUsername) {
  const res = await fetch(`https://tmi.twitch.tv/group/user/weverty__17/chatters`);
  const json = await res.json();
  const todos = [
    ...json.chatters.viewers,
    ...json.chatters.moderators,
    ...json.chatters.vips
  ];
  return todos.includes(twitchUsername.toLowerCase());
}


const storage = multer.diskStorage({
  destination: 'public/uploads/', // cria essa pasta se não existir
  filename: (req, file, cb) => {
    const nomeArquivo = Date.now() + '-' + file.originalname;
    cb(null, nomeArquivo);
  }
});

const upload = multer({ storage });



const tokenFile = './tokens.json';

// Função que renova o token automaticamente
async function renovarTokenAgendado() {
  const tokens = JSON.parse(fs.readFileSync(tokenFile));
  const { refresh_token } = tokens;

  try {
    const res = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token,
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET
      }
    });

    const { access_token, refresh_token: novoRefresh } = res.data;
    fs.writeFileSync(tokenFile, JSON.stringify({ access_token, refresh_token: novoRefresh }, null, 2));
    console.log(`[${new Date().toLocaleString()}] 🔄 Token Twitch renovado via cron!`);
  } catch (err) {
    console.error('❌ Erro na renovação automática:', err.response?.data || err.message);
  }
}

// ⏱️ Agendar renovação: a cada 3h30min
cron.schedule('*/210 * * * *', () => {
  console.log(`[${new Date().toLocaleString()}] 🕒 Executando tarefa agendada de renovação de token`);
  renovarTokenAgendado();
});


// 🌐 Rotas
app.get('/', async (req, res) => {
  if (!req.user) return res.redirect('/auth/discord');
  const freshUser = await Usuario.findById(req.user._id);
  res.render('home', { user: freshUser });
});


app.get('/vincular', (req, res) => {
  res.render('vincular', { user: req.user });
});

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => {

    // Redireciona automaticamente pra Twitch com o ID do usuário
    console.log('👉 Redirecionando para Twitch: /auth/twitch?state=' + req.user._id);
    req.session.save(() => {
  res.redirect(`/auth/twitch?state=${req.user._id}`);
});
  }
);

app.get('/auth/twitch', async (req, res, next) => {
  const state = req.query.state;
  const user = await Usuario.findById(state);

  if (!user || !user.discordId || !user.discordUsername) {
    return res.status(400).send('⚠️ Você precisa fazer login com o Discord antes de vincular a Twitch.');
  }

  passport.authenticate('twitch', { state })(req, res, next);
});


app.get('/auth/twitch/callback',
  passport.authenticate('twitch', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  });

app.use(express.urlencoded({ extended: true })); // ← isso é essencial!

app.get('/loja', verificarBanimento, async (req, res) => {
  const categorias = await Categoria.find();
  const todosItens = await Item.find();
  const sucesso = req.session.sucesso;
  req.session.sucesso = null; 
  const mensagemErro = req.session.mensagemErro;
  req.session.mensagemErro = null;
  
  const itensPorCategoria = categorias.map(cat => {
    return {
      nome: cat.nome,
      itens: todosItens.filter(item => item.categoria === cat.nome)
    };
  });
  
  const imagem = req.file ? '/uploads/' + req.file.filename : null;
  const capaLoja = await Config.findOne({ chave: 'capaLoja' }); // ou outro modelo

  res.render('loja', {
    categorias,
    itensPorCategoria,
    user: req.user,
    usuario: req.session.usuario || null,
    mensagemErro,
    sucesso, // 👈 adicione isso!
    imagem,
    capaLoja: capaLoja?.valor || null
    
  });
});



app.post('/loja', upload.single('imagem'), async (req, res) => {
  try {
    const { nome, valor, quantidade, descricao, categoria } = req.body;

    if (!nome || nome.length > 30) {
      req.session.mensagemErro = '⚠️ O nome do item não pode ter mais de 30 caracteres!';
      return res.redirect('/loja');
    }

    const imagem = req.file ? '/uploads/' + req.file.filename : null;

    const novoItem = new Item({
      nome,
      valor,
      quantidade,
      descricao,
      categoria,
      imagem
    });
    console.log('Imagem recebida:', imagem);
    await novoItem.save();
    req.session.sucesso = `Item "${nome}" criado com sucesso!`;
    res.redirect('/loja');
  } catch (err) {
    console.error(err);
    req.session.mensagemErro = '⚠️ Erro ao criar o item.';
    res.redirect('/loja');
  }
});



app.post('/loja/deletar/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      req.session.mensagemErro = 'Item não encontrado.';
      return res.redirect('/loja');
    }

    // Apaga a imagem se existir
    if (item.imagem) {
      const caminhoImagem = path.join(__dirname, 'public', item.imagem);
      if (fs.existsSync(caminhoImagem)) {
        fs.unlinkSync(caminhoImagem);
      }
    }

    await Item.findByIdAndDelete(req.params.id);

    req.session.sucesso = `Item "${item.nome}" deletado com sucesso!`;
    res.redirect('/loja');
  } catch (err) {
    console.error(err);
    req.session.mensagemErro = 'Erro ao deletar item.';
    res.redirect('/loja');
  }
});


app.post('/loja/pausar/:id', async (req, res) => {
  const item = await Item.findById(req.params.id);
  item.ativo = !item.ativo; // alterna estado
  await item.save();
  res.redirect('/loja');
});

app.post('/loja/resgatar/:id', async (req, res) => {
  try {
    const user = req.user;
    const item = await Item.findById(req.params.id);

    if (!item || !item.ativo || item.quantidade <= 0) {
      req.session.mensagemErro = '⚠️ Item inválido ou indisponível.';
      return res.redirect('/loja');
    }

    if (user.pontos < item.valor) {
      const pontosFaltando = item.valor - user.pontos;
      req.session.mensagemErro = `⚠️ Você tem ${user.pontos} pontos, e para concluir o resgate faltam ${pontosFaltando} pontos.`;
      return res.redirect('/loja');
    }

    // Aplica o resgate
    user.pontos -= item.valor;
    await user.save();

    item.quantidade -= 1;
    if (item.quantidade <= 0) item.ativo = false;
    await item.save();

    // Envia log pro canal configurado
try {
  const canalLog = await getCanalLog(client, 'log_resgates');
  if (canalLog) {
    await canalLog.send({
      embeds: [{
        title: '📦 Novo Resgate na Loja!',
        color: 0x00ff99,
        fields: [
          { name: '👤 Usuário', value: user.twitchUsername, inline: true },
          { name: '🆔 Twitch ID', value: String(user.twitchId || user._id), inline: true },
          { name: '🎁 Item', value: item.nome }
        ],
        timestamp: new Date().toISOString()
      }]
    });
  }
} catch (erroLog) {
  console.error('❌ Erro ao enviar log de resgate pro Discord:', erroLog);
}

    req.session.sucesso = `🎁 Você resgatou "${item.nome}" com sucesso!`;
    return res.redirect('/loja');

  } catch (err) {
    console.error('Erro geral ao processar resgate:', err);
    req.session.mensagemErro = '❌ Erro ao processar resgate. Verifique se sua conta está vinculada e tente novamente.';
    return res.redirect('/loja');
  }
});



app.post('/loja/categoria', async (req, res) => {
  try {
    if (!req.user || req.user.twitchUsername !== 'weverty__17') {
      return res.status(403).send('Acesso negado');
    }

    const novaCategoria = new Categoria({
      nome: req.body.nomeCategoria
    });

    await novaCategoria.save();

    // 💾 Salvar na sessão
    req.session.novaCategoria = novaCategoria.nome;

    // 🔁 Redirecionar evita duplicações ao dar F5
    return res.redirect('/loja');

  } catch (erro) {
    console.error('Erro ao criar categoria:', erro);
    return res.status(500).send('Erro ao criar categoria');
  }
});

app.post('/loja/categoria/excluir/:nome', async (req, res) => {
  try {
    await Categoria.deleteOne({ nome: req.params.nome });
    await Item.deleteMany({ categoria: req.params.nome }); // opcional: remove itens da categoria
    res.redirect('/loja');
  } catch (err) {
    console.error('Erro ao excluir categoria:', err);
    res.status(500).send('Erro ao excluir categoria');
  }
});

app.post('/loja/categoria/editar/:nome', async (req, res) => {
  const categorias = await Categoria.find();
  const todosItens = await Item.find();

  const itensPorCategoria = categorias.map(cat => {
    return {
      nome: cat.nome,
      editando: cat.nome === req.params.nome,
      itens: todosItens.filter(item => item.categoria === cat.nome)
    };
  });

  res.render('loja', {
    categorias,
    itensPorCategoria,
    user: req.user,
    usuario: req.session.usuario || null,
    mensagemErro: null,
    sucesso: req.query.sucesso 
  });
});

app.post('/loja/categoria/renomear/:nomeAntigo', async (req, res) => {
  const novoNome = req.body.novoNome;

  await Categoria.updateOne({ nome: req.params.nomeAntigo }, { nome: novoNome });
  await Item.updateMany({ categoria: req.params.nomeAntigo }, { categoria: novoNome });

  res.redirect('/loja');
});

app.post('/loja/capa', upload.single('capa'), async (req, res) => {
  try {
  const caminho = '/uploads/' + req.file.filename;

    // Salva ou atualiza a capa no banco
    await Config.findOneAndUpdate(
  { chave: 'capaLoja' },
  { valor: caminho },
  { upsert: true }
  );

    req.session.sucesso = 'Capa atualizada com sucesso!';
    res.redirect('/loja');
  } catch (err) {
    console.error(err);
    req.session.mensagemErro = 'Erro ao salvar a capa.';
    res.redirect('/loja');
  }
});

app.get('/dashboard', verificarOwner, verificarBanimento, async (req, res) => {
    try {
    const logs = await LogResgate.find().sort({ dataHora: -1 }).limit(100);
    const configuracoes = await ConfiguracaoDiscord.find();

    const config = {};
    configuracoes.forEach((c) => {
      config[c.tipo] = c.canalId;
    });

    // 🧠 Busca canais e cargos do servidor
    const guild = await client.guilds.fetch('1280048155525906525');
    const canais = await guild.channels.fetch();
    const cargos = await guild.roles.fetch();

    // Filtrar apenas canais de texto e cargos úteis
    const canaisTexto = [...canais.values()].filter((c) => c.type === 0);
    const listaCargos = [...cargos.values()].filter((r) => !r.managed && r.name !== '@everyone');

    const vinculados = await Usuario.find().sort({ twitchUsername: 1 });
    res.render('dashboard', {
      logs,
      config,
      canaisTexto,
      listaCargos,
      vinculados,
      user: req.user
    });
  } catch (err) {
    console.error('Erro no dashboard:', err);
    res.status(500).send('Erro ao carregar dashboard');
    req.session.mensagemErro = '🚫 Você não tem permissão para acessar o painel.';
    return res.redirect('/');
  }
});

app.post('/dashboard/discord/salvar', async (req, res) => {
  try {
    console.log('📥 Recebido da dashboard:', req.body);

    const mapa = {
      log_resgates: req.body.log_resgates,
      log_banimentos: req.body.log_banimentos,
      cargo_entrada: req.body.cargo_entrada,
      cargo_vip: req.body.cargo_vip,
      canal_logs_terminal: req.body.canal_logs_terminal
    };

    for (const tipo in mapa) {
      const valor = mapa[tipo];

      // ⚠️ Pula se estiver vazio
      if (!valor) continue;

      if (tipo === 'cargo_vip') {
        // 🔄 Desativa os cargos VIP anteriores
        await ConfiguracaoDiscord.updateMany(
          { tipo: 'cargo_vip' },
          { $set: { ativo: false } }
        );

        // ✅ Salva o novo cargo como ativo
        await ConfiguracaoDiscord.create({
          tipo: 'cargo_vip',
          canalId: valor,
          ativo: true,
          atualizadoEm: new Date()
        });
      } else {
        // 🌐 Atualiza os demais tipos normalmente
        await ConfiguracaoDiscord.findOneAndUpdate(
          { tipo },
          { canalId: valor, atualizadoEm: new Date() },
          { upsert: true }
        );
      }

      // 🔄 Atualiza o canal de logs do terminal dinamicamente
if (tipo === 'canal_logs_terminal' && client?.channels) {
  const novoCanal = await client.channels.fetch(valor).catch(() => null);
  if (novoCanal) {
    client.logChannel = novoCanal; // ← atualiza dinamicamente
    console.log(`🔄 Canal de logs atualizado para: ${novoCanal.name}`);
    await novoCanal.send('📦 Este canal agora receberá logs do terminal do bot!');
  }
}
    }

    req.session.sucesso = '✅ Configurações do Discord atualizadas com sucesso!';
    res.redirect('/dashboard');

  } catch (err) {
    console.error('Erro ao salvar configurações do Discord:', err);
    req.session.mensagemErro = '❌ Não foi possível salvar as configurações.';
    res.redirect('/dashboard');
  }
});

app.post('/dashboard/banir/:id', async (req, res) => {
  const userId = req.params.id;
  const usuario = await Usuario.findById(userId);

  if (!usuario) return res.redirect('/dashboard');

  // ⛔ Alterna o estado de banido
  const foiBanido = !usuario.banido;
  usuario.banido = foiBanido;
  await usuario.save();

  // 📥 Canal de logs
  try {
    const canalLog = await getCanalLog(client, 'log_banimentos');
    const imagemDiscord = usuario.discordAvatarURL; // exemplo: campo salvo durante login
    const imagemTwitch = usuario.twitchProfileImageURL;
    const imagemPerfil = imagemDiscord || imagemTwitch || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
  if (canalLog) {
    await canalLog.send({
      embeds: [{
        title: foiBanido ? '🚫 Usuário Banido' : '✅ Usuário Desbanido',
        color: 0x00ff99,
        thumbnail: {
  url: imagemPerfil
},
        fields: [
          { name: 'Discord', value: usuario.discordUsername || 'N/A', inline: true },
          { name: 'ID Discord', value: usuario.discordId, inline: false },
          { name: 'Twitch', value: usuario.twitchUsername || 'N/A', inline: true },
          { name: 'ID Twitch', value: usuario.twitchId, inline: false },

        ],
        timestamp: new Date().toISOString()
      }]
    });
  }
} catch (erroLog) {
  console.error('❌ Erro ao enviar log de Banimento pro Discord:', erroLog);
}

  res.redirect('/dashboard');
});

app.post('/dashboard/desvincular/:id', verificarOwner, async (req, res) => {
  await Usuario.findByIdAndDelete(req.params.id);
  res.redirect('/dashboard');
});

app.get('/api/vinculados', verificarOwner, async (req, res) => {
  const vinculados = await Usuario.find().sort({ twitchUsername: 1 });
  res.json(vinculados);
});

app.get('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.redirect('/');
    });
  });
});

app.post('/api/double/rodada', async (req, res) => {
  const { numero, cor } = req.body;

  if (typeof numero !== 'number' || !cor) {
    return res.status(400).json({ erro: 'Dados inválidos' });
  }

  const novaRodada = new Rodada({
    numero,
    cor,
    dataHora: new Date()
  });

  await novaRodada.save();
  res.json({ ok: true, rodadaId: novaRodada._id });
});

app.get('/api/double/status', async (req, res) => {
  const rodadaAtual = await Rodada.findOne().sort({ dataHora: -1 });
  const historico = await Rodada.find().sort({ dataHora: -1 }).limit(10);

  res.json({ rodadaAtual, historico });
});

app.post('/api/double/apostar', async (req, res) => {
  const { cor, valor } = req.body;

  if (!cor || !valor || valor < 1) {
    return res.status(400).json({ erro: 'Dados de aposta inválidos.' });
  }

  console.log(`🎯 Aposta recebida: R$${valor} em ${cor}`);
  // Aqui você pode validar usuário, saldo, VIP, etc.

  return res.json({ sucesso: true });
});



app.get('/double', (req, res) => {
  res.render('double');
});

// Inicia o app Express
const PORT = process.env.PORT || 3000;

// Rotas do site
app.get('/', (req, res) => {
  res.send('🌐 Site rodando com o bot!');
});

// Inicia o servidor web
app.listen(PORT, () => {
  console.log(`🌍 Site disponível em http://localhost:${PORT}`);
});
