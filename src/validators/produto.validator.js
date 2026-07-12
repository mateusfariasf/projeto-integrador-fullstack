function validateProduto(data) {
  const errors = {};
  if (!data.nome?.trim()) errors.nome = "Informe o nome do produto.";
  if (!data.codigoBarras?.trim()) errors.codigoBarras = "Informe o codigo de barras.";
  if (data.codigoBarras && !/^\d+$/.test(data.codigoBarras.trim())) {
    errors.codigoBarras = "Use apenas numeros no codigo de barras.";
  }
  if (!data.descricao?.trim()) errors.descricao = "Informe a descricao.";
  if (data.preco !== undefined && data.preco !== "" && Number(data.preco) < 0) errors.preco = "O preco nao pode ser negativo.";
  if (data.quantidade !== undefined && data.quantidade !== "" && Number(data.quantidade) < 0) {
    errors.quantidade = "A quantidade nao pode ser negativa.";
  }
  if (!data.categoria?.trim()) errors.categoria = "Informe a categoria.";
  return Object.keys(errors).length ? { ok: false, mensagem: "Existem campos invalidos.", errors } : { ok: true };
}

module.exports = {
  validateProduto
};
