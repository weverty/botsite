import mongoose from 'mongoose';

const CategoriaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  criadaEm: {
    type: Date,
    default: Date.now
  }
});

const Categoria = mongoose.model('Categoria', CategoriaSchema);
export default Categoria;
