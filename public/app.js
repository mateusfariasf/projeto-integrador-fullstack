const state = {
  token: localStorage.getItem("estoqueToken") || "",
  usuario: null,
  fornecedores: [],
  produtos: [],
  associacoes: [],
  atividades: [],
  produtoSelecionadoId: null,
  fornecedorSelecionadoId: null,
  associacaoSelecionada: null,
  currentTab: "produtos",
  sidebarCollapsed: localStorage.getItem("estoqueSidebarCollapsed") === "true",
  routeHistory: JSON.parse(sessionStorage.getItem("estoqueRouteHistory") || "[]"),
  scannerStream: null,
  scannerLoop: 0
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupAuth();
  setupForms();
  setupSidebar();
  setupScanner();
  window.addEventListener("hashchange", () => applyRouteFromHash());
  boot();
});

async function boot() {
  if (!state.token) {
    showAuth();
    return;
  }

  try {
    const data = await api("/api/auth/me");
    state.usuario = data.usuario;
    showApp();
    await loadAll();
    applyRouteFromHash();
  } catch {
    clearSession();
    showAuth();
  }
}

function setupTabs() {
  $$(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      navigateToTab(button.dataset.tab);
    });
  });
}

function setupAuth() {
  $("#loginForm").addEventListener("submit", login);
  $("#registerForm").addEventListener("submit", register);
  $("#googleDemoLogin").addEventListener("click", googleDemoLogin);
  $("#forgotPasswordButton").addEventListener("click", openPasswordRecoveryModal);
  $("#passwordRecoveryForm").addEventListener("submit", submitPasswordRecovery);
  $("#passwordRecoveryCancel").addEventListener("click", closePasswordRecoveryModal);
  $("#passwordRecoveryModal").addEventListener("click", (event) => {
    if (event.target.id === "passwordRecoveryModal") closePasswordRecoveryModal();
  });
  $("#logoutButton").addEventListener("click", logout);
  $("#authErrorClose").addEventListener("click", closeAuthErrorModal);
  $("#authErrorModal").addEventListener("click", (event) => {
    if (event.target.id === "authErrorModal") closeAuthErrorModal();
  });
  $$(".auth-tab").forEach((button) => {
    button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
  });
}

function setupForms() {
  $("#fornecedorForm").addEventListener("submit", saveFornecedor);
  $("#produtoForm").addEventListener("submit", saveProduto);
  $("#associacaoForm").addEventListener("submit", saveAssociacao);
  $("#limparFornecedor").addEventListener("click", () => openFornecedorModal());
  $("#limparProduto").addEventListener("click", () => openProdutoModal());
  $("#novaAssociacao").addEventListener("click", () => openAssociacaoModal());
  $("#excluirFornecedorModal").addEventListener("click", () => deleteFornecedor(Number($("#fornecedorForm").elements.id.value)));
  $("#excluirProdutoModal").addEventListener("click", () => deleteProduto(Number($("#produtoForm").elements.id.value)));
  $("#excluirAssociacaoModal").addEventListener("click", () => {
    const form = $("#associacaoForm");
    deleteAssociacao(Number(form.elements.oldProdutoId.value), Number(form.elements.oldFornecedorId.value));
  });
  $$("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => closeModal(button.dataset.closeModal));
  });
  $$(".entity-modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal(modal.id);
    });
  });
  $("#produtoBusca").addEventListener("input", () => renderProdutos());
  $("#importarNotaButton").addEventListener("click", importarNotaFiscal);
  $("#carregarMockups").addEventListener("click", carregarMockups);
  $("#exportExcel").addEventListener("click", exportarExcel);
  $("#exportPdf").addEventListener("click", exportarPdf);
  $("#reportFilters").addEventListener("input", () => renderRelatorios());
  $("#reportFilters").addEventListener("change", () => renderRelatorios());
  $("#limparFiltrosRelatorio").addEventListener("click", () => {
    $("#reportFilters").reset();
    renderRelatorios();
  });
  $("#atualizarRelatorios").addEventListener("click", async () => {
    await loadAll();
    showAlert("Relatorios atualizados com os dados mais recentes.", "success");
  });
  $("#successClose").addEventListener("click", closeSuccessModal);
  document.addEventListener("click", closeNotificationsOnOutsideClick);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePasswordRecoveryModal();
      closeNotifications();
    }
  });
}

function setupSidebar() {
  applySidebarState();
  $("#sidebarToggle").addEventListener("click", () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    localStorage.setItem("estoqueSidebarCollapsed", String(state.sidebarCollapsed));
    applySidebarState();
  });
}

function setupScanner() {
  $("#scanBarcodeButton").addEventListener("click", startScanner);
  $("#closeScanner").addEventListener("click", stopScanner);
}

async function login(event) {
  event.preventDefault();
  clearErrors("#loginForm");
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    const result = await api("/api/auth/login", { method: "POST", body: JSON.stringify(data), auth: false });
    saveSession(result);
    showApp();
    await loadAll();
    applyRouteFromHash();
  } catch (error) {
    showErrors("#loginForm", error.data?.errors);
    showAuthError(error.message || "Senha ou e-mail incorretos.");
  }
}

async function register(event) {
  event.preventDefault();
  clearErrors("#registerForm");
  const data = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    const result = await api("/api/auth/register", { method: "POST", body: JSON.stringify(data), auth: false });
    saveSession(result);
    showApp();
    await loadAll();
    applyRouteFromHash();
    showSuccessModal("Usuario cadastrado", "O novo usuario foi criado e autenticado com sucesso.", "Autenticacao");
  } catch (error) {
    showErrors("#registerForm", error.data?.errors);
    showAlert(error.message, "danger");
  }
}

async function googleDemoLogin() {
  try {
    const result = await api("/api/auth/google-demo", { method: "POST", auth: false });
    saveSession(result);
    showApp();
    await loadAll();
    applyRouteFromHash();
  } catch (error) {
    showAuthError(error.message || "Nao foi possivel criar o login demonstrativo.");
  }
}

function openPasswordRecoveryModal() {
  const form = $("#passwordRecoveryForm");
  form.reset();
  form.elements.email.value = $("#loginForm input[name='email']").value || "";
  $("#passwordRecoveryModal").classList.remove("hidden");
}

function closePasswordRecoveryModal() {
  $("#passwordRecoveryModal").classList.add("hidden");
}

function submitPasswordRecovery(event) {
  event.preventDefault();
  const email = new FormData(event.currentTarget).get("email");
  closePasswordRecoveryModal();
  showSuccessModal(
    "Recuperacao solicitada",
    `Se este e-mail estiver cadastrado, as instrucoes de recuperacao seriam enviadas para ${email}.`,
    "Modulo demonstrativo"
  );
}

async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    // Limpamos a sessao local mesmo se o token ja tiver expirado.
  }
  clearSession();
  showAuth();
}

async function loadAll() {
  try {
    const [fornecedores, produtos, associacoes, atividades] = await Promise.all([
      api("/api/fornecedores"),
      api("/api/produtos"),
      api("/api/associacoes"),
      api("/api/atividades")
    ]);

    state.fornecedores = fornecedores;
    state.produtos = produtos;
    state.associacoes = associacoes;
    state.atividades = atividades;
    $("#status").textContent = "Online";

    if (state.produtoSelecionadoId && !state.produtos.some((item) => item.id === state.produtoSelecionadoId)) state.produtoSelecionadoId = null;
    if (state.fornecedorSelecionadoId && !state.fornecedores.some((item) => item.id === state.fornecedorSelecionadoId)) state.fornecedorSelecionadoId = null;

    renderFornecedores();
    renderProdutos();
    renderAssociacoes();
    renderSelects();
    renderProdutoDetalhe();
    renderFornecedorDetalhe();
    renderAssociacaoDetalhe();
    renderAtividades();
    renderRelatorios();
    renderTopbar();
  } catch (error) {
    $("#status").textContent = "Offline";
    if (error.status === 401) {
      clearSession();
      showAuth();
    }
    showAlert(error.message || "Nao foi possivel conectar ao servidor.", "danger");
  }
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (options.auth !== false && state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(path, { ...options, headers });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.mensagem || "Erro na requisicao.");
    error.data = data;
    error.status = response.status;
    throw error;
  }
  return data;
}

async function importarNotaFiscal() {
  const input = $("#notaFiscalInput");
  const file = input.files?.[0];
  if (!file) {
    showAlert("Selecione um XML de NF-e para importar.", "warning");
    return;
  }

  try {
    const xml = await file.text();
    const nota = parseNfeXml(xml);
    if (!nota.produtos.length) {
      showAlert("Nao encontrei produtos no XML informado.", "warning");
      return;
    }

    const result = await api("/api/importacoes/nota", {
      method: "POST",
      body: JSON.stringify(nota)
    });

    input.value = "";
    await loadAll();
    showSuccessModal(
      "Nota fiscal importada",
      `${result.resumo.produtosCriados} produto(s) criado(s), ${result.resumo.produtosAtualizados} atualizado(s) e ${result.resumo.associacoesCriadas} associacao(oes) criada(s).`,
      "Importacao"
    );
  } catch (error) {
    showAlert(error.message || "Nao foi possivel importar a nota fiscal.", "danger");
  }
}

async function carregarMockups() {
  try {
    const result = await api("/api/mockups/seed", { method: "POST" });
    await loadAll();
    showSuccessModal(
      "Mockups carregados",
      `${result.resumo.fornecedores} fornecedor(es), ${result.resumo.produtos} produto(s) e ${result.resumo.associacoesCriadas} associacao(oes) nova(s) disponiveis para simulacao.`,
      "Dados falsos"
    );
  } catch (error) {
    showAlert(error.message || "Nao foi possivel carregar os mockups.", "danger");
  }
}

async function saveFornecedor(event) {
  event.preventDefault();
  clearErrors("#fornecedorForm");
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const editing = Boolean(data.id);

  try {
    const result = await api(editing ? `/api/fornecedores/${data.id}` : "/api/fornecedores", {
      method: editing ? "PUT" : "POST",
      body: JSON.stringify(data)
    });
    state.fornecedorSelecionadoId = result.fornecedor?.id || Number(data.id) || state.fornecedorSelecionadoId;
    showSuccessModal(editing ? "Fornecedor atualizado" : "Fornecedor cadastrado", result.mensagem, "Fornecedores");
    resetFornecedorForm(false);
    closeModal("fornecedorModal");
    await loadAll();
  } catch (error) {
    showErrors("#fornecedorForm", error.data?.errors);
    showAlert(error.message, "danger");
  }
}

async function saveProduto(event) {
  event.preventDefault();
  clearErrors("#produtoForm");
  const form = event.currentTarget;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  const file = formData.get("imagemArquivo");
  delete data.imagemArquivo;
  data.imagem = file && file.size ? await fileToDataUrl(file) : form.dataset.imagemAtual || "";
  const editing = Boolean(data.id);

  try {
    const result = await api(editing ? `/api/produtos/${data.id}` : "/api/produtos", {
      method: editing ? "PUT" : "POST",
      body: JSON.stringify(data)
    });
    state.produtoSelecionadoId = result.produto?.id || Number(data.id) || state.produtoSelecionadoId;
    showSuccessModal(editing ? "Produto atualizado" : "Produto cadastrado", result.mensagem, "Produtos");
    resetProdutoForm(false);
    closeModal("produtoModal");
    await loadAll();
  } catch (error) {
    showErrors("#produtoForm", error.data?.errors);
    showAlert(error.message, "danger");
  }
}

async function saveAssociacao(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const oldProdutoId = Number(data.oldProdutoId || 0);
  const oldFornecedorId = Number(data.oldFornecedorId || 0);
  const produtoId = Number(data.produtoId);
  const fornecedorId = Number(data.fornecedorId);

  try {
    const changing = oldProdutoId && oldFornecedorId && (oldProdutoId !== produtoId || oldFornecedorId !== fornecedorId);
    const targetExists = state.associacoes.some((item) => item.produtoId === produtoId && item.fornecedorId === fornecedorId);
    if ((!oldProdutoId || changing) && targetExists) {
      showAlert("Essa associacao ja existe.", "warning");
      return;
    }

    if (oldProdutoId && oldFornecedorId && (oldProdutoId !== produtoId || oldFornecedorId !== fornecedorId)) {
      await api(`/api/produtos/${oldProdutoId}/fornecedores/${oldFornecedorId}`, { method: "DELETE" });
    }
    const result = oldProdutoId === produtoId && oldFornecedorId === fornecedorId
      ? { mensagem: "Associacao mantida sem alteracoes." }
      : await api(`/api/produtos/${produtoId}/fornecedores/${fornecedorId}`, { method: "POST" });
    state.associacaoSelecionada = { produtoId, fornecedorId };
    closeModal("associacaoModal");
    resetAssociacaoForm(false);
    showSuccessModal(oldProdutoId ? "Associacao atualizada" : "Associacao criada", result.mensagem, "Associacoes");
    await loadAll();
  } catch (error) {
    showAlert(error.message, "danger");
  }
}

function renderProdutos() {
  const tbody = $("#produtosTabela");
  const term = normalize($("#produtoBusca").value);
  const produtos = state.produtos.filter((item) => {
    const haystack = normalize(`${item.nome} ${item.codigoBarras} ${item.categoria} ${item.descricao}`);
    return haystack.includes(term);
  });

  tbody.innerHTML = produtos.length
    ? produtos.map((item) => `
      <tr class="${item.id === state.produtoSelecionadoId ? "selected" : ""}" onclick="selectProduto(${item.id})">
        <td>
          ${item.imagem ? `<img class="thumb" src="${item.imagem}" alt="">` : ""}
          <strong>${escapeHtml(item.nome)}</strong><br><span class="muted">${escapeHtml(item.descricao)}</span>
        </td>
        <td>${escapeHtml(item.codigoBarras)}</td>
        <td>${Number(item.quantidade || 0)} un.<br><span class="muted">R$ ${Number(item.preco || 0).toFixed(2)}</span></td>
        <td>${escapeHtml(item.categoria)}</td>
        <td class="actions" onclick="event.stopPropagation()">
          <button class="secondary" onclick="editProduto(${item.id})">Editar</button>
          <button class="danger" onclick="deleteProduto(${item.id})">Excluir</button>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="5" class="muted">Nenhum produto encontrado.</td></tr>`;
}

function renderFornecedores() {
  const tbody = $("#fornecedoresTabela");
  tbody.innerHTML = state.fornecedores.length
    ? state.fornecedores.map((item) => `
      <tr class="${item.id === state.fornecedorSelecionadoId ? "selected" : ""}" onclick="selectFornecedor(${item.id})">
        <td><strong>${escapeHtml(item.nomeEmpresa)}</strong><br><span class="muted">${escapeHtml(item.email)}</span></td>
        <td>${escapeHtml(item.cnpj)}</td>
        <td>${escapeHtml(item.contatoPrincipal)}<br><span class="muted">${escapeHtml(item.telefone)}</span></td>
        <td class="actions" onclick="event.stopPropagation()">
          <button class="secondary" onclick="editFornecedor(${item.id})">Editar</button>
          <button class="danger" onclick="deleteFornecedor(${item.id})">Excluir</button>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="4" class="muted">Nenhum fornecedor cadastrado.</td></tr>`;
}

function renderAssociacoes() {
  const tbody = $("#associacoesTabela");
  tbody.innerHTML = state.associacoes.length
    ? state.associacoes.map((item) => {
      const selected = state.associacaoSelecionada
        && state.associacaoSelecionada.produtoId === item.produtoId
        && state.associacaoSelecionada.fornecedorId === item.fornecedorId;
      return `
        <tr class="${selected ? "selected" : ""}" onclick="selectAssociacao(${item.produtoId}, ${item.fornecedorId})">
          <td>${escapeHtml(item.produtoNome)}</td>
          <td>${escapeHtml(item.codigoBarras)}</td>
          <td>${escapeHtml(item.nomeEmpresa)}</td>
          <td>${escapeHtml(item.cnpj)}</td>
          <td class="actions" onclick="event.stopPropagation()">
            <button class="secondary" onclick="editAssociacao(${item.produtoId}, ${item.fornecedorId})">Editar</button>
            <button class="danger" onclick="deleteAssociacao(${item.produtoId}, ${item.fornecedorId})">Desassociar</button>
          </td>
        </tr>
      `;
    }).join("")
    : `<tr><td colspan="5" class="muted">Nenhuma associacao cadastrada.</td></tr>`;
}

function renderProdutoDetalhe() {
  const detail = $("#produtoDetalhe");
  const item = state.produtos.find((produto) => produto.id === state.produtoSelecionadoId);
  if (!item) {
    detail.classList.add("empty");
    detail.innerHTML = "Selecione um produto para visualizar os detalhes.";
    return;
  }

  const fornecedores = state.associacoes.filter((assoc) => assoc.produtoId === item.id);
  detail.classList.remove("empty");
  detail.innerHTML = `
    ${item.imagem ? `<img class="detail-image" src="${item.imagem}" alt="">` : ""}
    <h3>${escapeHtml(item.nome)}</h3>
    <dl>
      <div><dt>Codigo</dt><dd>${escapeHtml(item.codigoBarras)}</dd></div>
      <div><dt>Categoria</dt><dd>${escapeHtml(item.categoria)}</dd></div>
      <div><dt>Estoque</dt><dd>${Number(item.quantidade || 0)} unidades</dd></div>
      <div><dt>Preco</dt><dd>R$ ${Number(item.preco || 0).toFixed(2)}</dd></div>
      <div><dt>Validade</dt><dd>${item.dataValidade || "Nao informada"}</dd></div>
    </dl>
    <p>${escapeHtml(item.descricao)}</p>
    <h4>Fornecedores associados</h4>
    ${fornecedores.length
      ? `<ul>${fornecedores.map((assoc) => `<li>${escapeHtml(assoc.nomeEmpresa)} <span>${escapeHtml(assoc.cnpj)}</span></li>`).join("")}</ul>`
      : `<p class="muted">Nenhum fornecedor associado.</p>`}
  `;
}

function renderFornecedorDetalhe() {
  const detail = $("#fornecedorDetalhe");
  const item = state.fornecedores.find((fornecedor) => fornecedor.id === state.fornecedorSelecionadoId);
  if (!item) {
    detail.classList.add("empty");
    detail.innerHTML = "Selecione um fornecedor para visualizar os detalhes.";
    return;
  }

  const produtos = state.associacoes.filter((assoc) => assoc.fornecedorId === item.id);
  detail.classList.remove("empty");
  detail.innerHTML = `
    <h3>${escapeHtml(item.nomeEmpresa)}</h3>
    <dl>
      <div><dt>CNPJ</dt><dd>${escapeHtml(item.cnpj)}</dd></div>
      <div><dt>Contato</dt><dd>${escapeHtml(item.contatoPrincipal)}</dd></div>
      <div><dt>Telefone</dt><dd>${escapeHtml(item.telefone)}</dd></div>
      <div><dt>E-mail</dt><dd>${escapeHtml(item.email)}</dd></div>
    </dl>
    <p>${escapeHtml(item.endereco)}</p>
    <h4>Produtos associados</h4>
    ${produtos.length
      ? `<ul>${produtos.map((assoc) => `<li>${escapeHtml(assoc.produtoNome)} <span>${escapeHtml(assoc.codigoBarras)}</span></li>`).join("")}</ul>`
      : `<p class="muted">Nenhum produto associado.</p>`}
  `;
}

function renderAssociacaoDetalhe() {
  const detail = $("#associacaoDetalhe");
  const selected = state.associacaoSelecionada;
  const assoc = selected && state.associacoes.find((item) => item.produtoId === selected.produtoId && item.fornecedorId === selected.fornecedorId);
  if (!assoc) {
    detail.classList.add("empty");
    detail.innerHTML = "Selecione uma associacao para visualizar o relacionamento.";
    return;
  }

  detail.classList.remove("empty");
  detail.innerHTML = `
    <h3>${escapeHtml(assoc.produtoNome)}</h3>
    <dl>
      <div><dt>Codigo</dt><dd>${escapeHtml(assoc.codigoBarras)}</dd></div>
      <div><dt>Fornecedor</dt><dd>${escapeHtml(assoc.nomeEmpresa)}</dd></div>
      <div><dt>CNPJ</dt><dd>${escapeHtml(assoc.cnpj)}</dd></div>
    </dl>
    <p class="muted">Essa associacao indica que o produto pode ser comprado deste fornecedor.</p>
  `;
}

function renderAtividades() {
  renderActivityList("#atividadesProdutos", state.atividades.filter((item) => item.entidade === "produto" || item.entidade === "nota_fiscal"));
  renderActivityList("#atividadesFornecedores", state.atividades.filter((item) => item.entidade === "fornecedor"));
  renderActivityList("#atividadesAssociacoes", state.atividades.filter((item) => item.tipo === "associacao"));
  renderActivityList("#atividadesRelatorios", state.atividades);
  renderNotifications();
}

function renderRelatorios() {
  renderReportCategoryOptions();
  const produtosFiltrados = getProdutosFiltradosRelatorio();
  const produtoIds = new Set(produtosFiltrados.map((item) => item.id));
  const totalProdutos = produtosFiltrados.length;
  const totalFornecedores = state.fornecedores.length;
  const totalAssociacoes = state.associacoes.filter((item) => produtoIds.has(item.produtoId)).length;
  const totalUnidades = produtosFiltrados.reduce((sum, item) => sum + Number(item.quantidade || 0), 0);
  const valorEstoque = produtosFiltrados.reduce((sum, item) => sum + Number(item.preco || 0) * Number(item.quantidade || 0), 0);
  const baixoEstoque = produtosFiltrados.filter((item) => Number(item.quantidade || 0) <= 5);

  $("#reportCards").innerHTML = [
    ["Produtos", totalProdutos],
    ["Fornecedores", totalFornecedores],
    ["Associacoes", totalAssociacoes],
    ["Unidades em estoque", totalUnidades],
    ["Valor estimado", `R$ ${valorEstoque.toFixed(2)}`],
    ["Baixo estoque", baixoEstoque.length]
  ].map(([label, value]) => `
    <article class="report-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `).join("");

  $("#reportSummary").innerHTML = `
    <p>A visao filtrada possui <strong>${totalProdutos}</strong> produto(s), <strong>${totalFornecedores}</strong> fornecedor(es) e <strong>${totalAssociacoes}</strong> associacao(oes).</p>
    <p>Valor estimado em estoque: <strong>R$ ${valorEstoque.toFixed(2)}</strong>.</p>
  `;

  const categorias = produtosFiltrados.reduce((acc, item) => {
    const key = item.categoria || "Sem categoria";
    acc[key] ||= { categoria: key, produtos: 0, unidades: 0 };
    acc[key].produtos += 1;
    acc[key].unidades += Number(item.quantidade || 0);
    return acc;
  }, {});

  $("#categoriaRelatorio").innerHTML = Object.values(categorias).length
    ? Object.values(categorias).map((item) => `
      <tr>
        <td>${escapeHtml(item.categoria)}</td>
        <td>${item.produtos}</td>
        <td>${item.unidades}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="3" class="muted">Sem produtos cadastrados.</td></tr>`;

  $("#baixoEstoqueRelatorio").innerHTML = baixoEstoque.length
    ? baixoEstoque.map((item) => `
      <tr onclick="selectProduto(${item.id})">
        <td>${escapeHtml(item.nome)}</td>
        <td>${escapeHtml(item.codigoBarras)}</td>
        <td>${Number(item.quantidade || 0)}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="3" class="muted">Nenhum produto com baixo estoque.</td></tr>`;

  renderReportCharts(produtosFiltrados, categorias, baixoEstoque);
}

function renderReportCharts(produtosFiltrados, categorias, baixoEstoque) {
  const categoriasOrdenadas = Object.values(categorias)
    .map((item) => ({
      ...item,
      valor: produtosFiltrados
        .filter((produto) => (produto.categoria || "Sem categoria") === item.categoria)
        .reduce((sum, produto) => sum + Number(produto.preco || 0) * Number(produto.quantidade || 0), 0)
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 6);
  const maxCategoria = Math.max(...categoriasOrdenadas.map((item) => item.valor), 1);

  $("#categoriaGrafico").innerHTML = categoriasOrdenadas.length
    ? categoriasOrdenadas.map((item) => `
      <div class="bar-row">
        <span>${escapeHtml(item.categoria)}</span>
        <div><i style="width:${Math.max(8, (item.valor / maxCategoria) * 100)}%"></i></div>
        <strong>R$ ${item.valor.toFixed(2)}</strong>
      </div>
    `).join("")
    : `<p class="muted">Sem dados para gerar grafico.</p>`;

  const zerado = produtosFiltrados.filter((item) => Number(item.quantidade || 0) === 0).length;
  const baixo = baixoEstoque.length - zerado;
  const disponivel = Math.max(produtosFiltrados.length - baixo - zerado, 0);
  const total = Math.max(produtosFiltrados.length, 1);
  const disponivelPct = (disponivel / total) * 100;
  const baixoPct = (baixo / total) * 100;
  const donut = $("#estoqueDonut");
  donut.style.background = `conic-gradient(var(--primary) 0 ${disponivelPct}%, var(--accent) ${disponivelPct}% ${disponivelPct + baixoPct}%, var(--danger) ${disponivelPct + baixoPct}% 100%)`;
  donut.dataset.total = String(produtosFiltrados.length);
  $("#estoqueLegenda").innerHTML = [
    ["Disponivel", disponivel, "primary"],
    ["Baixo", baixo, "accent"],
    ["Zerado", zerado, "danger"]
  ].map(([label, value, color]) => `<span><i class="${color}"></i>${label}: <strong>${value}</strong></span>`).join("");

  const ranking = [...produtosFiltrados]
    .map((item) => ({ ...item, valor: Number(item.preco || 0) * Number(item.quantidade || 0) }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);
  const maxValor = Math.max(...ranking.map((item) => item.valor), 1);
  $("#valorProdutosGrafico").innerHTML = ranking.length
    ? ranking.map((item, index) => `
      <article>
        <span>${index + 1}</span>
        <div>
          <strong>${escapeHtml(item.nome)}</strong>
          <i style="width:${Math.max(8, (item.valor / maxValor) * 100)}%"></i>
        </div>
        <b>R$ ${item.valor.toFixed(2)}</b>
      </article>
    `).join("")
    : `<p class="muted">Sem produtos para ranquear.</p>`;
}

function exportarExcel() {
  const produtos = getProdutosFiltradosRelatorio();
  const produtoIds = new Set(produtos.map((item) => item.id));
  const associacoes = state.associacoes.filter((item) => produtoIds.has(item.produtoId));
  const resumo = buildReportSummary(produtos, associacoes);
  const html = `
    <html>
      <head><meta charset="UTF-8" /></head>
      <body>
        <h1>Relatorio de Estoque</h1>
        ${tableToHtml("Resumo", [
          ["Indicador", "Valor"],
          ["Produtos", resumo.totalProdutos],
          ["Fornecedores", resumo.totalFornecedores],
          ["Associacoes", resumo.totalAssociacoes],
          ["Unidades", resumo.totalUnidades],
          ["Valor estimado", resumo.valorEstoque.toFixed(2)],
          ["Baixo estoque", resumo.baixoEstoque]
        ])}
        ${tableToHtml("Produtos", [["Nome", "Codigo", "Categoria", "Quantidade", "Preco", "Descricao"], ...produtos.map((item) => [
          item.nome,
          item.codigoBarras,
          item.categoria,
          item.quantidade,
          Number(item.preco || 0).toFixed(2),
          item.descricao
        ])])}
        ${tableToHtml("Fornecedores", [["Empresa", "CNPJ", "Contato", "Telefone", "E-mail"], ...state.fornecedores.map((item) => [
          item.nomeEmpresa,
          item.cnpj,
          item.contatoPrincipal,
          item.telefone,
          item.email
        ])])}
        ${tableToHtml("Associacoes", [["Produto", "Codigo", "Fornecedor", "CNPJ"], ...associacoes.map((item) => [
          item.produtoNome,
          item.codigoBarras,
          item.nomeEmpresa,
          item.cnpj
        ])])}
      </body>
    </html>
  `;
  downloadBlob(new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }), `relatorio-estoque-${dateStamp()}.xls`);
  showAlert("Arquivo Excel gerado com sucesso.", "success");
}

function exportarPdf() {
  const produtos = getProdutosFiltradosRelatorio();
  const produtoIds = new Set(produtos.map((item) => item.id));
  const associacoes = state.associacoes.filter((item) => produtoIds.has(item.produtoId));
  const resumo = buildReportSummary(produtos, associacoes);
  const topProdutos = [...produtos]
    .sort((a, b) => (Number(b.preco || 0) * Number(b.quantidade || 0)) - (Number(a.preco || 0) * Number(a.quantidade || 0)))
    .slice(0, 8);
  const lines = [
    "Relatorio de Estoque",
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    "",
    `Produtos: ${resumo.totalProdutos}`,
    `Fornecedores: ${resumo.totalFornecedores}`,
    `Associacoes: ${resumo.totalAssociacoes}`,
    `Unidades em estoque: ${resumo.totalUnidades}`,
    `Valor estimado: R$ ${resumo.valorEstoque.toFixed(2)}`,
    `Produtos em baixo estoque: ${resumo.baixoEstoque}`,
    "",
    "Produtos com maior valor em estoque:",
    ...topProdutos.map((item, index) => {
      const valor = Number(item.preco || 0) * Number(item.quantidade || 0);
      return `${index + 1}. ${item.nome} - ${item.quantidade} un. - R$ ${valor.toFixed(2)}`;
    }),
    "",
    "Observacao: PDF demonstrativo gerado pelo modulo de exportacao do sistema."
  ];
  downloadBlob(createPdfBlob(lines), `relatorio-estoque-${dateStamp()}.pdf`);
  showAlert("Arquivo PDF gerado com sucesso.", "success");
}

function buildReportSummary(produtos, associacoes) {
  return {
    totalProdutos: produtos.length,
    totalFornecedores: state.fornecedores.length,
    totalAssociacoes: associacoes.length,
    totalUnidades: produtos.reduce((sum, item) => sum + Number(item.quantidade || 0), 0),
    valorEstoque: produtos.reduce((sum, item) => sum + Number(item.preco || 0) * Number(item.quantidade || 0), 0),
    baixoEstoque: produtos.filter((item) => Number(item.quantidade || 0) <= 5).length
  };
}

function tableToHtml(title, rows) {
  return `
    <h2>${escapeHtml(title)}</h2>
    <table border="1">
      ${rows.map((row, index) => `
        <tr>${row.map((cell) => `${index === 0 ? "<th>" : "<td>"}${escapeHtml(cell)}${index === 0 ? "</th>" : "</td>"}`).join("")}</tr>
      `).join("")}
    </table>
  `;
}

function renderReportCategoryOptions() {
  const select = $("#reportCategoria");
  if (!select) return;
  const current = select.value;
  const categories = [...new Set(state.produtos.map((item) => item.categoria).filter(Boolean))].sort();
  select.innerHTML = `<option value="">Todas</option>` + categories
    .map((categoria) => `<option value="${escapeHtml(categoria)}">${escapeHtml(categoria)}</option>`)
    .join("");
  if (categories.includes(current)) select.value = current;
}

function getProdutosFiltradosRelatorio() {
  const form = $("#reportFilters");
  if (!form) return state.produtos;
  const data = Object.fromEntries(new FormData(form).entries());
  return state.produtos.filter((item) => {
    const quantidade = Number(item.quantidade || 0);
    const preco = Number(item.preco || 0);
    if (data.categoria && item.categoria !== data.categoria) return false;
    if (data.estoque === "baixo" && quantidade > 5) return false;
    if (data.estoque === "zerado" && quantidade !== 0) return false;
    if (data.estoque === "disponivel" && quantidade <= 0) return false;
    if (data.precoMin !== "" && preco < Number(data.precoMin)) return false;
    if (data.precoMax !== "" && preco > Number(data.precoMax)) return false;
    return true;
  });
}

function renderActivityList(selector, items) {
  const target = $(selector);
  const limited = items.slice(0, 6);
  target.innerHTML = limited.length
    ? limited.map((item) => `
      <article class="activity-item">
        <strong>${escapeHtml(item.titulo)}</strong>
        <span>${escapeHtml(item.detalhe || item.origem)}</span>
        <small>${formatDateTime(item.criadoEm)}</small>
      </article>
    `).join("")
    : `<p class="muted">Nenhum registro recente.</p>`;
}

function renderNotifications() {
  const notifications = state.atividades.slice(0, 8);
  $("#notificationCount").textContent = String(notifications.length);
  $("#notificationList").innerHTML = notifications.length
    ? notifications.map((item) => `
      <article class="notification-item">
        <strong>${escapeHtml(notificationTitle(item))}</strong>
        <span>${escapeHtml(item.detalhe || item.origem)}</span>
        <small>${formatDateTime(item.criadoEm)}</small>
      </article>
    `).join("")
    : `<p class="muted">Nenhuma notificacao recente.</p>`;
}

function renderTopbar() {
  const parts = routeParts();
  const tab = parts[0] || state.currentTab || "produtos";
  const labels = {
    produtos: "Produtos",
    fornecedores: "Fornecedores",
    associacoes: "Associacoes",
    relatorios: "Relatorios"
  };
  const detail = getRouteDetailLabel(parts);
  const crumb = ["Estoque", labels[tab] || "Produtos", detail].filter(Boolean).join(" / ");
  $("#breadcrumb").textContent = crumb;
  $("#routePath").textContent = `#/${parts.join("/") || "produtos"}`;
  renderRouteHistory();
}

function renderRouteHistory() {
  const target = $("#routeHistory");
  const items = state.routeHistory.slice(0, 4);
  target.innerHTML = items.length
    ? items.map((item) => `<button type="button" class="history-chip" onclick="setHash('${escapeHtml(item.path)}')">${escapeHtml(item.label)}</button>`).join("")
    : `<span class="muted compact-text">Sem historico</span>`;
}

function notificationTitle(item) {
  const typeLabels = {
    cadastro: "Cadastro",
    atualizacao: "Atualizacao",
    importacao: "Importacao",
    associacao: "Associacao"
  };
  return `${typeLabels[item.tipo] || "Atividade"}: ${item.titulo}`;
}

function getRouteDetailLabel(parts) {
  const [tab, first, second] = parts;
  if (tab === "produtos" && first) {
    return state.produtos.find((item) => item.id === Number(first))?.nome || `Produto ${first}`;
  }
  if (tab === "fornecedores" && first) {
    return state.fornecedores.find((item) => item.id === Number(first))?.nomeEmpresa || `Fornecedor ${first}`;
  }
  if (tab === "associacoes" && first && second) {
    const assoc = state.associacoes.find((item) => item.produtoId === Number(first) && item.fornecedorId === Number(second));
    return assoc ? `${assoc.produtoNome} + ${assoc.nomeEmpresa}` : "Relacionamento";
  }
  return "";
}

function renderSelects() {
  const produtoSelect = $("#associacaoForm select[name='produtoId']");
  const fornecedorSelect = $("#associacaoForm select[name='fornecedorId']");

  produtoSelect.innerHTML = `<option value="">Selecione um produto</option>` + state.produtos
    .map((item) => `<option value="${item.id}">${escapeHtml(item.nome)} - ${escapeHtml(item.codigoBarras)}</option>`)
    .join("");

  fornecedorSelect.innerHTML = `<option value="">Selecione um fornecedor</option>` + state.fornecedores
    .map((item) => `<option value="${item.id}">${escapeHtml(item.nomeEmpresa)} - ${escapeHtml(item.cnpj)}</option>`)
    .join("");
}

function openProdutoModal(item = null) {
  resetProdutoForm(false);
  $("#produtoModalTitle").textContent = item ? "Editar produto" : "Novo produto";
  $("#excluirProdutoModal").classList.toggle("hidden", !item);
  if (item) {
    state.produtoSelecionadoId = item.id;
    const form = $("#produtoForm");
    fillForm(form, item);
    form.dataset.imagemAtual = item.imagem || "";
    renderProdutos();
    renderProdutoDetalhe();
  }
  openModal("produtoModal");
}

function openFornecedorModal(item = null) {
  resetFornecedorForm(false);
  $("#fornecedorModalTitle").textContent = item ? "Editar fornecedor" : "Novo fornecedor";
  $("#excluirFornecedorModal").classList.toggle("hidden", !item);
  if (item) {
    state.fornecedorSelecionadoId = item.id;
    fillForm($("#fornecedorForm"), item);
    renderFornecedores();
    renderFornecedorDetalhe();
  }
  openModal("fornecedorModal");
}

function openAssociacaoModal(assoc = null) {
  resetAssociacaoForm(false);
  renderSelects();
  $("#associacaoModalTitle").textContent = assoc ? "Editar associacao" : "Nova associacao";
  $("#excluirAssociacaoModal").classList.toggle("hidden", !assoc);
  if (assoc) {
    const form = $("#associacaoForm");
    form.elements.produtoId.value = assoc.produtoId;
    form.elements.fornecedorId.value = assoc.fornecedorId;
    form.elements.oldProdutoId.value = assoc.produtoId;
    form.elements.oldFornecedorId.value = assoc.fornecedorId;
  }
  openModal("associacaoModal");
}

function openModal(id) {
  const modal = $(`#${id}`);
  if (modal) modal.classList.remove("hidden");
}

function closeModal(id) {
  const modal = $(`#${id}`);
  if (modal) modal.classList.add("hidden");
}

function selectProduto(id) {
  state.produtoSelecionadoId = id;
  setHash(`/produtos/${id}`);
  renderProdutos();
  renderProdutoDetalhe();
  renderTopbar();
}

function selectFornecedor(id) {
  state.fornecedorSelecionadoId = id;
  setHash(`/fornecedores/${id}`);
  renderFornecedores();
  renderFornecedorDetalhe();
  renderTopbar();
}

function selectAssociacao(produtoId, fornecedorId) {
  state.associacaoSelecionada = { produtoId, fornecedorId };
  setHash(`/associacoes/${produtoId}/${fornecedorId}`);
  renderAssociacoes();
  renderAssociacaoDetalhe();
  renderTopbar();
}

function editFornecedor(id) {
  const item = state.fornecedores.find((fornecedor) => fornecedor.id === id);
  if (!item) return;
  setHash(`/fornecedores/${id}`);
  activateTab("fornecedores", false);
  openFornecedorModal(item);
  renderTopbar();
}

function editProduto(id) {
  const item = state.produtos.find((produto) => produto.id === id);
  if (!item) return;
  setHash(`/produtos/${id}`);
  activateTab("produtos", false);
  openProdutoModal(item);
  renderTopbar();
}

function editAssociacao(produtoId, fornecedorId) {
  const assoc = state.associacoes.find((item) => item.produtoId === produtoId && item.fornecedorId === fornecedorId);
  if (!assoc) return;
  state.associacaoSelecionada = { produtoId, fornecedorId };
  setHash(`/associacoes/${produtoId}/${fornecedorId}`);
  activateTab("associacoes", false);
  renderAssociacoes();
  renderAssociacaoDetalhe();
  openAssociacaoModal(assoc);
  renderTopbar();
}

async function deleteFornecedor(id) {
  if (!confirm("Deseja excluir este fornecedor?")) return;
  try {
    const result = await api(`/api/fornecedores/${id}`, { method: "DELETE" });
    if (state.fornecedorSelecionadoId === id) state.fornecedorSelecionadoId = null;
    closeModal("fornecedorModal");
    showAlert(result.mensagem, "success");
    await loadAll();
  } catch (error) {
    showAlert(error.message, "danger");
  }
}

async function deleteProduto(id) {
  if (!confirm("Deseja excluir este produto?")) return;
  try {
    const result = await api(`/api/produtos/${id}`, { method: "DELETE" });
    if (state.produtoSelecionadoId === id) state.produtoSelecionadoId = null;
    closeModal("produtoModal");
    showAlert(result.mensagem, "success");
    await loadAll();
  } catch (error) {
    showAlert(error.message, "danger");
  }
}

async function deleteAssociacao(produtoId, fornecedorId) {
  try {
    const result = await api(`/api/produtos/${produtoId}/fornecedores/${fornecedorId}`, { method: "DELETE" });
    state.associacaoSelecionada = null;
    closeModal("associacaoModal");
    showAlert(result.mensagem, "success");
    await loadAll();
  } catch (error) {
    showAlert(error.message, "danger");
  }
}

function parseNfeXml(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  const parserError = tagText(doc, "parsererror");
  if (parserError) throw new Error("O arquivo selecionado nao parece ser um XML valido.");

  const emit = firstNode(doc, "emit");
  const ide = firstNode(doc, "ide");
  const enderEmit = emit ? firstNode(emit, "enderEmit") : null;
  const fornecedor = emit ? {
    nomeEmpresa: textFrom(emit, "xNome") || "Fornecedor da nota fiscal",
    cnpj: formatCnpj(textFrom(emit, "CNPJ")),
    endereco: [
      textFrom(enderEmit, "xLgr"),
      textFrom(enderEmit, "nro"),
      textFrom(enderEmit, "xBairro"),
      textFrom(enderEmit, "xMun"),
      textFrom(enderEmit, "UF")
    ].filter(Boolean).join(", ") || "Endereco nao informado",
    telefone: formatPhone(textFrom(enderEmit, "fone")),
    email: "sem-email@fornecedor.local",
    contatoPrincipal: textFrom(emit, "xNome") || "Contato da nota"
  } : null;

  const produtos = nodes(doc, "det").map((det, index) => {
    const prod = firstNode(det, "prod");
    const cEAN = textFrom(prod, "cEAN");
    const cProd = textFrom(prod, "cProd");
    return {
      nome: textFrom(prod, "xProd") || `Produto importado ${index + 1}`,
      codigoBarras: cleanBarcode(cEAN) || cleanBarcode(cProd),
      descricao: textFrom(prod, "xProd") || "Produto importado da NF-e",
      preco: toNumber(textFrom(prod, "vUnCom") || textFrom(prod, "vProd")),
      quantidade: toNumber(textFrom(prod, "qCom")) || 1,
      categoria: textFrom(prod, "NCM") ? `NCM ${textFrom(prod, "NCM")}` : "Importado da NF-e"
    };
  });

  return {
    numeroNota: textFrom(ide, "nNF"),
    fornecedor,
    produtos
  };
}

async function startScanner() {
  if (!("BarcodeDetector" in window)) {
    showAlert("Este navegador nao possui leitor de codigo de barras nativo. Use o campo manual.", "warning");
    return;
  }

  try {
    $("#scannerModal").classList.remove("hidden");
    $("#scannerStatus").textContent = "Solicitando acesso a camera...";
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    state.scannerStream = stream;
    const video = $("#scannerVideo");
    video.srcObject = stream;
    await video.play();

    const detector = new BarcodeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"]
    });
    $("#scannerStatus").textContent = "Aponte a camera para o codigo de barras.";
    scanLoop(detector, video);
  } catch {
    stopScanner();
    showAlert("Nao foi possivel acessar a camera.", "danger");
  }
}

async function scanLoop(detector, video) {
  cancelAnimationFrame(state.scannerLoop);
  try {
    const codes = await detector.detect(video);
    if (codes.length) {
      const value = codes[0].rawValue;
      $("#produtoForm input[name='codigoBarras']").value = value;
      stopScanner();
      showAlert(`Codigo lido: ${value}`, "success");
      return;
    }
  } catch {
    $("#scannerStatus").textContent = "Tentando reconhecer o codigo...";
  }
  state.scannerLoop = requestAnimationFrame(() => scanLoop(detector, video));
}

function stopScanner() {
  cancelAnimationFrame(state.scannerLoop);
  if (state.scannerStream) state.scannerStream.getTracks().forEach((track) => track.stop());
  state.scannerStream = null;
  $("#scannerVideo").srcObject = null;
  $("#scannerModal").classList.add("hidden");
}

function resetFornecedorForm(clearSelection = true) {
  const form = $("#fornecedorForm");
  form.reset();
  form.elements.id.value = "";
  form.querySelector("button[type='submit']").textContent = "Salvar";
  clearErrors("#fornecedorForm");
  $("#fornecedorModalTitle").textContent = "Novo fornecedor";
  $("#excluirFornecedorModal").classList.add("hidden");
  if (clearSelection) {
    state.fornecedorSelecionadoId = null;
    renderFornecedores();
    renderFornecedorDetalhe();
  }
}

function resetProdutoForm(clearSelection = true) {
  const form = $("#produtoForm");
  form.reset();
  form.elements.id.value = "";
  form.dataset.imagemAtual = "";
  form.querySelector("button[type='submit']").textContent = "Salvar";
  clearErrors("#produtoForm");
  $("#produtoModalTitle").textContent = "Novo produto";
  $("#excluirProdutoModal").classList.add("hidden");
  if (clearSelection) {
    state.produtoSelecionadoId = null;
    renderProdutos();
    renderProdutoDetalhe();
  }
}

function resetAssociacaoForm(clearSelection = true) {
  const form = $("#associacaoForm");
  form.reset();
  form.elements.oldProdutoId.value = "";
  form.elements.oldFornecedorId.value = "";
  $("#associacaoModalTitle").textContent = "Nova associacao";
  $("#excluirAssociacaoModal").classList.add("hidden");
  if (clearSelection) {
    state.associacaoSelecionada = null;
    renderAssociacoes();
    renderAssociacaoDetalhe();
  }
}

function saveSession(result) {
  state.token = result.token;
  state.usuario = result.usuario;
  localStorage.setItem("estoqueToken", result.token);
}

function clearSession() {
  state.token = "";
  state.usuario = null;
  localStorage.removeItem("estoqueToken");
}

function showAuth() {
  $("#authScreen").classList.remove("hidden");
  $("#appShell").classList.add("hidden");
  setAuthMode("login");
}

function showApp() {
  $("#authScreen").classList.add("hidden");
  $("#appShell").classList.remove("hidden");
  resetRouteHistory();
  const name = state.usuario?.nome || "Usuario";
  $("#userName").textContent = name;
  $("#userProvider").textContent = state.usuario?.provedor || "local";
  $("#userAvatar").textContent = name.slice(0, 1).toUpperCase();
  applySidebarState();
}

function resetRouteHistory() {
  state.routeHistory = [];
  sessionStorage.removeItem("estoqueRouteHistory");
  renderRouteHistory();
}

function applySidebarState() {
  const shell = $("#appShell");
  if (!shell) return;
  shell.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
  const toggle = $("#sidebarToggle");
  if (toggle) {
    const label = state.sidebarCollapsed ? "Abrir menu" : "Recolher menu";
    toggle.title = label;
    toggle.setAttribute("aria-label", label);
  }
}

function setAuthMode(mode) {
  const selected = mode === "register" ? "register" : "login";
  $$(".auth-tab").forEach((button) => {
    const active = button.dataset.authMode === selected;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  $$(".auth-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.authPanel === selected);
  });
}

function showAuthError(message) {
  $("#authErrorMessage").textContent = message || "Confira os dados informados e tente novamente.";
  $("#authErrorModal").classList.remove("hidden");
}

function closeAuthErrorModal() {
  $("#authErrorModal").classList.add("hidden");
}

function closeNotificationsOnOutsideClick(event) {
  const panel = $("#notificationsPanel");
  if (!panel || !panel.open) return;
  if (!panel.contains(event.target)) panel.open = false;
}

function closeNotifications() {
  const panel = $("#notificationsPanel");
  if (panel) panel.open = false;
}

function fillForm(form, data) {
  Object.entries(data).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value ?? "";
  });
}

function clearErrors(formSelector) {
  $$(`${formSelector} .error`).forEach((item) => {
    item.textContent = "";
  });
}

function showErrors(formSelector, errors = {}) {
  Object.entries(errors).forEach(([field, message]) => {
    const target = $(`${formSelector} [data-error='${field}']`);
    if (target) target.textContent = message;
  });
}

function navigateToTab(tabName) {
  setHash(`/${tabName}`);
}

function applyRouteFromHash() {
  if (!location.hash) {
    setHash("/produtos");
    return;
  }
  const parts = routeParts();
  const tab = ["produtos", "fornecedores", "associacoes", "relatorios"].includes(parts[0]) ? parts[0] : "produtos";
  const first = Number(parts[1]);
  const second = Number(parts[2]);

  activateTab(tab, false);

  if (tab === "produtos") {
    state.produtoSelecionadoId = first || null;
    renderProdutos();
    renderProdutoDetalhe();
  }

  if (tab === "fornecedores") {
    state.fornecedorSelecionadoId = first || null;
    renderFornecedores();
    renderFornecedorDetalhe();
  }

  if (tab === "associacoes") {
    state.associacaoSelecionada = first && second ? { produtoId: first, fornecedorId: second } : null;
    renderAssociacoes();
    renderAssociacaoDetalhe();
  }

  if (tab === "relatorios") {
    renderRelatorios();
  }

  rememberRoute();
  renderTopbar();
}

function activateTab(tabName, updateRoute = true) {
  state.currentTab = tabName;
  $$(".tab").forEach((item) => item.classList.toggle("active", item.dataset.tab === tabName));
  $$(".panel").forEach((item) => item.classList.toggle("active", item.id === tabName));
  if (updateRoute) setHash(`/${tabName}`);
}

function routeParts() {
  return (location.hash || "#/produtos")
    .replace(/^#\/?/, "")
    .split("/")
    .filter(Boolean);
}

function setHash(path) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (location.hash !== `#${normalized}`) {
    location.hash = normalized;
  } else {
    applyRouteFromHash();
  }
}

function rememberRoute() {
  const parts = routeParts();
  const path = `/${parts.join("/") || "produtos"}`;
  const label = getRouteDetailLabel(parts) || ({ produtos: "Produtos", fornecedores: "Fornecedores", associacoes: "Associacoes", relatorios: "Relatorios" }[parts[0]] || "Produtos");
  state.routeHistory = [{ path, label }, ...state.routeHistory.filter((item) => item.path !== path)].slice(0, 8);
  sessionStorage.setItem("estoqueRouteHistory", JSON.stringify(state.routeHistory));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function nodes(parent, name) {
  if (!parent) return [];
  return [
    ...Array.from(parent.getElementsByTagName(name)),
    ...Array.from(parent.getElementsByTagNameNS("*", name))
  ].filter((node, index, list) => list.indexOf(node) === index);
}

function firstNode(parent, name) {
  return nodes(parent, name)[0] || null;
}

function textFrom(parent, name) {
  return firstNode(parent, name)?.textContent?.trim() || "";
}

function tagText(parent, name) {
  return parent.getElementsByTagName(name)[0]?.textContent || "";
}

function cleanBarcode(value) {
  const text = String(value || "").trim();
  if (!text || /sem gtin/i.test(text)) return "";
  return text.replace(/\D/g, "");
}

function formatCnpj(value) {
  const digits = String(value || "").replace(/\D/g, "").padStart(14, "0").slice(-14);
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length >= 10) return digits.replace(/^(\d{2})(\d{4,5})(\d{4}).*$/, "($1) $2-$3");
  return "(00) 0000-0000";
}

function toNumber(value) {
  return Number(String(value || "0").replace(",", "."));
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function createPdfBlob(lines) {
  const safeLines = lines.flatMap((line) => wrapText(toPdfText(line), 86));
  const content = [
    "BT",
    "/F1 12 Tf",
    "50 790 Td",
    "16 TL",
    ...safeLines.map((line, index) => `${index === 0 ? "" : "T*"}(${escapePdf(line)}) Tj`),
    "ET"
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function wrapText(text, maxLength) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    if (`${current} ${word}`.trim().length > maxLength) {
      lines.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function toPdfText(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function escapePdf(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function showAlert(message, type = "info") {
  const stack = $("#alertStack");
  const item = document.createElement("div");
  item.className = `floating-alert ${type}`;
  item.innerHTML = `
    <strong>${escapeHtml(alertTitle(type))}</strong>
    <span>${escapeHtml(message)}</span>
    <button type="button" aria-label="Fechar alerta">x</button>
  `;
  item.querySelector("button").addEventListener("click", () => dismissAlert(item));
  stack.appendChild(item);
  requestAnimationFrame(() => item.classList.add("show"));
  setTimeout(() => dismissAlert(item), 4600);
}

function dismissAlert(item) {
  if (!item || item.classList.contains("leaving")) return;
  item.classList.add("leaving");
  setTimeout(() => item.remove(), 220);
}

function showSuccessModal(title, message, kicker = "Confirmacao") {
  $("#successKicker").textContent = kicker;
  $("#successTitle").textContent = title;
  $("#successMessage").textContent = message;
  $("#successModal").classList.remove("hidden");
}

function closeSuccessModal() {
  $("#successModal").classList.add("hidden");
}

function alertTitle(type) {
  return {
    success: "Sucesso",
    danger: "Erro",
    warning: "Atencao",
    info: "Informacao"
  }[type] || "Informacao";
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function normalize(value) {
  return String(value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.editFornecedor = editFornecedor;
window.editProduto = editProduto;
window.editAssociacao = editAssociacao;
window.deleteFornecedor = deleteFornecedor;
window.deleteProduto = deleteProduto;
window.deleteAssociacao = deleteAssociacao;
window.selectProduto = selectProduto;
window.selectFornecedor = selectFornecedor;
window.selectAssociacao = selectAssociacao;

