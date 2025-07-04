import mongoose from 'mongoose';

const JogadaSchema = new mongoose.Schema({
  twitchUsername: String,       // nome do usuário da Twitch
  twitchId: String,             // ID único da Twitch
  valor: Number,                // valor apostado
  cor: String,                  // cor escolhida na aposta
  multiplicador: Number,       // 2x ou 14x
  rodadaId: mongoose.Types.ObjectId, // vínculo com a rodada
  criadaEm: {
    type: Date,
    default: Date.now
  }
});

const Jogada = mongoose.model('Jogada', JogadaSchema);
export default Jogada;
