import ConfiguracaoDiscord from '../models/ConfiguracaoDiscord.js';

export async function getCanalLog(bot, tipo) {
  try {
    const config = await ConfiguracaoDiscord.findOne({ tipo });
    if (!config?.canalId) return null;

    const canal = await bot.channels.fetch(config.canalId);
    return canal;
  } catch (err) {
    console.error(`Erro ao buscar canal de log (${tipo}):`, err);
    return null;
  }
}
