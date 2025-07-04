export default async function verificarBanimento(req, res, next) {
  if (!req.user) return res.redirect('/auth/discord');

  if (req.user.banido) {
    return res.render('banido', {
      motivo: 'Você foi banido do site. Entre em contato com o administrador para mais informações.'
    });
  }

  next();
}
