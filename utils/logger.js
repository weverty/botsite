import { client } from '../bot.js';

export function logInfo(mensagem) {
  console.log(mensagem);

  if (client?.logChannel) {
    client.logChannel.send(`📢 ${mensagem}`).catch(err => {
      console.warn('❌ Erro ao enviar log para o Discord:', err.message);
    });
  } else {
    console.warn('⚠️ Nenhum canal de logs está definido no client.');
  }
}
