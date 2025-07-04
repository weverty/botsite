import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  nome: {
  type: String,
  required: true,
  maxlength: 30
},
  valor: Number,
  quantidade: Number,
  descricao: String,
  ativo: { type: Boolean, default: true },
  categoria: {
  type: String,
  required: false, // ou true se você quiser exigir
},
  imagem: String, // 👈 este aqui é obrigatório agora!

});

const Item = mongoose.model('Item', itemSchema);
export default Item;
