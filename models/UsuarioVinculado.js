import mongoose from 'mongoose';

const UsuarioVinculadoSchema = new mongoose.Schema({
  twitchId: { type: String, required: true },         // ID único da Twitch
  twitchUsername: { type: String },                   // Nome exibido na Twitch
  discordId: { type: String },                        // ID do usuário no Discord
  discordUsername: { type: String },                  // Nome do Discord (ex: wevsli#1234)
  pontos: { type: Number, default: 100000 },          // WC$ iniciais ou acumulados
  xp: { type: Number, default: 0 }                    // Experiência acumulada
});

const UsuarioVinculado = mongoose.model('UsuarioVinculado', UsuarioVinculadoSchema);
export default UsuarioVinculado;
