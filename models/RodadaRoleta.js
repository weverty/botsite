// models/RodadaRoleta.js
import mongoose from 'mongoose';

const RodadaSchema = new mongoose.Schema({
  numero: Number,
  cor: String,
  timestamp: Date
});

export default mongoose.model('RodadaRoleta', RodadaSchema);
