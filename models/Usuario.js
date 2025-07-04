import mongoose from 'mongoose';

const usuarioSchema = new mongoose.Schema({
  discordId: String,
  twitchId: String,
  twitchUsername: String,
  pontos: { type: Number, default: 0 }
});

const Usuario = mongoose.model('Usuario', usuarioSchema);
export default Usuario;
