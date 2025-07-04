import mongoose from 'mongoose';

const UsuarioVinculadoSchema = new mongoose.Schema({
  twitchUsername: String,
  twitchId: String,
  discordUsername: String,
  discordId: String,
  status: { type: String, enum: ['viewer', 'sub', 'mod', 'vip'], default: 'viewer' },
  banido: { type: Boolean, default: false },
  pontos: { type: Number, default: 0 }
});

const UsuarioVinculado = mongoose.model('UsuarioVinculado', UsuarioVinculadoSchema);
export default UsuarioVinculado;
