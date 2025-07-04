import mongoose from 'mongoose';

const LogResgateSchema = new mongoose.Schema({
  twitchUsername: String,
  twitchId: String,
  itemResgatado: String,
  dataHora: { type: Date, default: Date.now }
});

const LogResgate = mongoose.model('LogResgate', LogResgateSchema);
export default LogResgate;
