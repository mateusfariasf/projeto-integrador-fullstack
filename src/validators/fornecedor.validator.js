function validateFornecedor(data) {
  const errors = {};
  if (!data.nomeEmpresa?.trim()) errors.nomeEmpresa = "Informe o nome da empresa.";
  if (!data.cnpj?.trim()) errors.cnpj = "Informe o CNPJ.";
  if (data.cnpj && !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(data.cnpj.trim())) {
    errors.cnpj = "Use o formato 00.000.000/0000-00.";
  }
  if (!data.endereco?.trim()) errors.endereco = "Informe o endereco.";
  if (!data.telefone?.trim()) errors.telefone = "Informe o telefone.";
  if (!data.email?.trim()) errors.email = "Informe o e-mail.";
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = "Informe um e-mail valido.";
  }
  if (!data.contatoPrincipal?.trim()) errors.contatoPrincipal = "Informe o contato principal.";
  return Object.keys(errors).length ? { ok: false, mensagem: "Existem campos invalidos.", errors } : { ok: true };
}

module.exports = {
  validateFornecedor
};
