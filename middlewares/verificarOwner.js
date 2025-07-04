export default function verificarOwner(req, res, next) {
  const user = req.user;

  // Substitua pelo seu ID real da Twitch
  const twitchIdDoOwner = '170721291'; // ou use 'weverty' se preferir comparar username

  if (user && user.twitchId === twitchIdDoOwner) {
    return next(); // autorizado
  }

  // Bloqueia acesso
req.session.mensagemErro = '🚫 Você não tem permissão para acessar essa página Dashboard!';
return res.redirect('/');
}
