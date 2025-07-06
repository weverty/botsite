const roletaTrack = document.getElementById('roleta-track');
const tempoEl = document.getElementById('tempo');
const tempoStatus = document.getElementById('tempo-status');
const botoesAposta = document.querySelectorAll('.btn-cor');
const campoValor = document.getElementById('campo-valor');
const btnApostar = document.getElementById('btn-apostar');

const socket = io(); // conecta ao servidor via socket.io

socket.on('novaRodada', (data) => {
  girarRoletaComNumero(data.numero, data.cor); // recebe número e cor do backend
});

let corSelecionada = null;
let xpDoUsuario = 0;

// 🎯 Escolher cor
botoesAposta.forEach(btn => {
  btn.addEventListener('click', () => {
    botoesAposta.forEach(b => b.classList.remove('selecionada'));
    btn.classList.add('selecionada');
    corSelecionada = btn.dataset.cor;
  });
});

// 🎰 Botão de apostar
btnApostar.addEventListener('click', () => {
  const valor = parseInt(campoValor.value);

  if (!corSelecionada || !valor || valor < 1) {
    return alert('Escolha uma cor e digite um valor válido');
  }

  fetch('/api/double/apostar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ cor: corSelecionada, valor })
  })
    .then(res => res.json())
.then(data => {
  if (data.erro) return alert(`Erro: ${data.erro}`);
  alert(`✅ Você apostou WC$${valor} em ${corSelecionada}`);

  // 🧠 Atualiza pontos e XP com dados reais do backend
  document.getElementById('pontos-usuario').textContent = data.pontos ?? '0';
  xpDoUsuario = parseInt(data.xp ?? 0);

  const nivelAtual = calcularNivel(xpDoUsuario);
  document.getElementById('nivel-aposta').textContent = isNaN(nivelAtual) ? '0' : nivelAtual;
  document.getElementById('faixa-nivel').textContent = faixaDoNivel(nivelAtual);

  // 🧼 Limpa campos e seleção
  campoValor.value = '';
  corSelecionada = null;
  botoesAposta.forEach(b => b.classList.remove('selecionada'));
});
});



// 🔄 Lógica de cor por número
function getCorPorNumero(n) {
  n = parseInt(n);
  if (n === 0) return 'white';
  if ([1, 2, 3, 4].includes(n)) return 'red';
  if ([8, 9, 10, 11].includes(n)) return 'black';
  return 'black';
}

// 🔢 Gerar quadrados com padrão fixo
function gerarQuadrados() {
  roletaTrack.innerHTML = '';
  const sequenciaNumeros = [8, 1, 9, 2, 0, 10, 3, 11, 4];

  for (let i = 0; i < 200; i++) {
    sequenciaNumeros.forEach(num => {
      const cor = getCorPorNumero(num);
      const q = document.createElement('div');
      q.classList.add('quadrado', cor);
      q.textContent = num;
      roletaTrack.appendChild(q);
    });
  }
}

// 🎰 Gira com número fixo (via backend)
function girarRoletaComNumero(numeroFixo, corDaRodada) {
btnApostar.disabled = true;
btnApostar.classList.add('apagado', 'desativado');
btnApostar.textContent = '⏳ Girando...';

  const quadrados = roletaTrack.children;

  // índice base do número
const todosIndices = Array.from(quadrados)
  .map((q, i) => ({ i, numero: parseInt(q.textContent) }))
  .filter(obj => obj.numero === numeroFixo);

const indexCentral = todosIndices[Math.floor(todosIndices.length / 2)].i;
const indexDestinoBase = indexCentral - 2; // ⚠️ Compensação visual p/ alinhar com listra verde


  // 🔄 adiciona múltiplas voltas (ex: 200 quadrados = 1 volta)
  const voltasExtras = 3 * 200; // 3 voltas completas
  const indexDestino = indexDestinoBase + voltasExtras;

  const largura = quadrados[0].offsetWidth;
  const centroWrapper = roletaTrack.parentElement.offsetWidth / 2;
  const offset = -((indexDestino * largura) - centroWrapper + largura / 2);

  roletaTrack.style.transition = 'transform 3.5s cubic-bezier(0.2, 0.8, 0.3, 1)';
  roletaTrack.style.transform = `translateX(${offset}px)`;

  tempoStatus.textContent = '🔄 Girando...';
  botoesAposta.forEach(btn => btn.disabled = true);

  setTimeout(() => {
    tempoStatus.textContent = `🎯 Resultado: ${numeroFixo} (${corDaRodada})`;

    const resultadosContainer = document.getElementById('ultimos-resultados');
    const resultadoDiv = document.createElement('div');
    resultadoDiv.classList.add('quadrado', corDaRodada);
    resultadoDiv.textContent = numeroFixo;
    resultadosContainer.prepend(resultadoDiv);

    while (resultadosContainer.children.length > 15) {
      resultadosContainer.removeChild(resultadosContainer.lastChild);
    }

    fetch('/api/double/rodada', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ numero: numeroFixo, cor: corDaRodada })
    });

    // ✅ após resultado, volta ao ponto de zero
    setTimeout(() => iniciarContadorApostas(), 1000);

btnApostar.disabled = false;
btnApostar.classList.remove('apagado', 'desativado');
btnApostar.textContent = '🎰 Apostar';

  }, 3600);
}


// ⏱️ Contador de rodada (sem girar localmente)
function iniciarContadorApostas() {
  gerarQuadrados();
  roletaTrack.style.transition = 'none';

  requestAnimationFrame(() => {
    const quadrados = roletaTrack.children;
    const largura = quadrados[0].offsetWidth;
    const indexDoZero = Array.from(quadrados).findIndex(q => q.textContent === '0');
    const centroWrapper = roletaTrack.parentElement.offsetWidth / 2;
    const offsetFactor = 0.70;
    const offset = -((indexDoZero * largura) - centroWrapper + largura * offsetFactor);
    roletaTrack.style.transform = `translateX(${offset}px)`;
  });

  let tempoRestante = 10;
tempoStatus.innerHTML = `⏳ Girando em: <span id="tempo">${tempoRestante}</span>s`;
const tempoEl = document.getElementById('tempo'); // 🔁 re-obtém o elemento
  botoesAposta.forEach(btn => btn.disabled = false);

  const interval = setInterval(() => {
    tempoRestante--;
    tempoEl.textContent = tempoRestante;

    if (tempoRestante <= 0) {
      clearInterval(interval);
      // ❌ NÃO chama girarRoleta() local — resultado vem via socket
    }
  }, 1000);
}

// 🔧 XP e nível
function calcularXP(valor) {
  return Math.floor(valor * 0.02);
}
function calcularNivel(xpTotal) {
  return Math.min(200, Math.floor(xpTotal / 100));
}
function faixaDoNivel(nivel) {
  if (nivel <= 20) return 'Bronze';
  if (nivel <= 50) return 'Prata';
  if (nivel <= 80) return 'Ouro';
  if (nivel <= 120) return 'Ouro 2';
  if (nivel <= 150) return 'Platina';
  return 'MESTRE';
}

// 🚀 Início
gerarQuadrados();
iniciarContadorApostas();

// 🧑‍💼 Carregar perfil do jogador
function atualizarPerfil() {
  fetch('/api/perfil', {
    method: 'GET',
    credentials: 'include'
  })
    .then(res => res.json())
    .then(data => {
      if (data.erro) {
        console.warn('🚫 Erro ao carregar perfil:', data.erro);
        return;
      }

      // 🎯 Informações básicas
      document.getElementById('nome-twitch').textContent = data.twitchName || '–';
      document.getElementById('id-twitch').textContent = data.twitchID || '–';
      document.getElementById('nome-discord').textContent = data.discordName || '–';
      document.getElementById('id-discord').textContent = data.discordID || '–';
      document.getElementById('pontos-usuario').textContent = data.pontos ?? '0';

      // 🧠 XP e nível
      xpDoUsuario = parseInt(data.xp || 0);
      const nivelAtual = calcularNivel(xpDoUsuario);
      const faixa = faixaDoNivel(nivelAtual);

      document.getElementById('nivel-aposta').textContent = nivelAtual;
      document.getElementById('faixa-nivel').textContent = faixa;
    })
    .catch(err => {
      console.error('❌ Erro ao carregar perfil:', err.message);
    });
}


atualizarPerfil();
