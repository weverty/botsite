import mongoose from 'mongoose';

const configSchema = new mongoose.Schema({
  chave: { type: String, required: true, unique: true },
  valor: { type: String, required: true }
});

const Config = mongoose.model('Config', configSchema);
export default Config;
