import mongoose from 'mongoose';

const RodadaSchema = new mongoose.Schema({
  numero: Number,
  cor: String,
  dataHora: {
    type: Date,
    default: Date.now
  }
});

const Rodada = mongoose.model('Rodada', RodadaSchema);
export default Rodada;
