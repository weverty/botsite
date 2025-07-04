const roletaTrack = document.getElementById('roleta-track');
const tempoEl = document.getElementById('tempo');
const tempoStatus = document.getElementById('tempo-status');
const botoesAposta = document.querySelectorAll('.btn-cor');
const campoValor = document.getElementById('campo-valor');
const btnApostar = document.getElementById('btn-apostar');

let corSelecionada = null;

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
    body: JSON.stringify({ cor: corSelecionada, valor })
  })
    .then(res => res.json())
    .then(data => {
      if (data.erro) return alert(`Erro: ${data.erro}`);
      alert(`✅ Você apostou R$${valor} em ${corSelecionada}`);
      campoValor.value = '';
      corSelecionada = null;
      botoesAposta.forEach(b => b.classList.remove('selecionada'));
    })
    .catch(err => {
      console.error('❌ Erro ao apostar:', err);
      alert('Erro ao conectar com o servidor');
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

// 🎲 Girar a roleta
function girarRoleta() {
  const quadrados = roletaTrack.children;
  const faixaCentro = Math.floor(quadrados.length / 2);
  const indexDestino = faixaCentro + Math.floor(Math.random() * 21) - 10;

  const largura = quadrados[0].offsetWidth;
  const centroWrapper = roletaTrack.parentElement.offsetWidth / 2;
  const offset = -((indexDestino * largura) - centroWrapper + largura / 2);

  // Movimento da roleta
  roletaTrack.style.transition = 'transform 3.5s cubic-bezier(0.2, 0.8, 0.3, 1)';
  roletaTrack.style.transform = `translateX(${offset}px)`;

  tempoStatus.textContent = '🔄 Girando...';
  botoesAposta.forEach(btn => btn.disabled = true);

  // Captura resultado após movimento
setTimeout(() => {
  const quadrados = roletaTrack.children;
  const largura = quadrados[0].offsetWidth;
  const centroWrapper = roletaTrack.parentElement.offsetWidth / 2;

  const transform = window.getComputedStyle(roletaTrack).transform;
  const matrixValues = transform.match(/matrix\(([^)]+)\)/);
  const deslocamento = matrixValues ? parseFloat(matrixValues[1].split(',')[4]) : 0;

  const indexCentral = Math.round((-deslocamento + centroWrapper - largura / 2) / largura);
  const sorteado = quadrados[indexCentral];

  const numero = parseInt(sorteado.textContent);
  const cor = getCorPorNumero(numero);

  tempoStatus.textContent = `🎯 Resultado: ${numero} (${cor})`;

  const resultadosContainer = document.getElementById('ultimos-resultados');
  const resultadoDiv = document.createElement('div');
  resultadoDiv.classList.add('quadrado', cor);
  resultadoDiv.textContent = numero;
  resultadosContainer.prepend(resultadoDiv);
  while (resultadosContainer.children.length > 15) {
    resultadosContainer.removeChild(resultadosContainer.lastChild);
  }

  fetch('/api/double/rodada', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numero, cor })
  });

  setTimeout(() => iniciarContadorApostas(), 1500);
}, 3600);
}

// ⏱️ Alinhamento inicial + contador de apostas
function iniciarContadorApostas() {
  gerarQuadrados();
  roletaTrack.style.transition = 'none';

  requestAnimationFrame(() => {
    const quadrados = roletaTrack.children;
    const largura = quadrados[0].offsetWidth;
    const indexDoZero = Array.from(quadrados).findIndex(q => q.textContent === '0');
    const centroWrapper = roletaTrack.parentElement.offsetWidth / 2;
    const offset = -((indexDoZero * largura) - centroWrapper + largura / 2);

    roletaTrack.style.transform = `translateX(${offset}px)`;
  });

  let tempoRestante = 15;
  botoesAposta.forEach(btn => btn.disabled = false);
  tempoStatus.textContent = '⏳ Girando em: ';
  tempoEl.textContent = tempoRestante;

  const interval = setInterval(() => {
    tempoRestante--;
    tempoEl.textContent = tempoRestante;

    if (tempoRestante <= 0) {
      clearInterval(interval);
      girarRoleta();
    }
  }, 1000);
}

// 🚀 Inicialização
gerarQuadrados();
iniciarContadorApostas();
