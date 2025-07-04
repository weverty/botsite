// models/ConfiguracaoDiscord.js
import mongoose from 'mongoose';

const ConfiguracaoDiscordSchema = new mongoose.Schema({
  tipo: { type: String, required: true }, // ex: log_resgates, log_banimentos
  canalId: String,
  cargoAutoJoin: String,
  cargoTwitchVip: String,
  ativo: Boolean,
  atualizadoEm: { type: Date, default: Date.now },
  log_banimentos: String,
  
});

const ConfiguracaoDiscord = mongoose.model('ConfiguracaoDiscord', ConfiguracaoDiscordSchema);
export default ConfiguracaoDiscord;
