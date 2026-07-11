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
  $("#logoutButton").addEventListener("click", logout);
  $("#toggleRegister").addEventListener("click", () => $("#registerForm").classList.toggle("hidden"));
}

function setupForms() {
  $("#fornecedorForm").addEventListener("submit", saveFornecedor);
  $("#produtoForm").addEventListener("submit", saveProduto);
  $("#associacaoForm").addEventListener("submit", saveAssociacao);
  $("#limparFornecedor").addEventListener("click", () => resetFornecedorForm());
  $("#limparProduto").addEventListener("click", () => resetProdutoForm());
  $("#produtoBusca").addEventListener("input", () => renderProdutos());
  $("#importarNotaButton").addEventListener("click", importarNotaFiscal);
  $("#atualizarRelatorios").addEventListener("click", async () => {
    await loadAll();
    showAlert("Relatorios atualizados com os dados mais recentes.", "success");
  });
  $("#successClose").addEventListener("click", closeSuccessModal);
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
    showSuccessModal("Login realizado", "Acesso autorizado ao sistema de controle de estoque.", "Autenticacao");
  } catch (error) {
    showErrors("#loginForm", error.data?.errors);
    showAlert(error.message, "danger");
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
    showSuccessModal("Login Google demo", "Sessao demonstrativa criada com sucesso.", "Autenticacao");
  } catch (error) {
    showAlert(error.message, "danger");
  }
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

  try {
    const result = await api(`/api/produtos/${data.produtoId}/fornecedores/${data.fornecedorId}`, { method: "POST" });
    state.associacaoSelecionada = { produtoId: Number(data.produtoId), fornecedorId: Number(data.fornecedorId) };
    showSuccessModal("Associacao criada", result.mensagem, "Associacoes");
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
  const totalProdutos = state.produtos.length;
  const totalFornecedores = state.fornecedores.length;
  const totalAssociacoes = state.associacoes.length;
  const totalUnidades = state.produtos.reduce((sum, item) => sum + Number(item.quantidade || 0), 0);
  const valorEstoque = state.produtos.reduce((sum, item) => sum + Number(item.preco || 0) * Number(item.quantidade || 0), 0);
  const baixoEstoque = state.produtos.filter((item) => Number(item.quantidade || 0) <= 5);

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
    <p>O estoque possui <strong>${totalProdutos}</strong> produto(s), <strong>${totalFornecedores}</strong> fornecedor(es) e <strong>${totalAssociacoes}</strong> associacao(oes).</p>
    <p>Valor estimado em estoque: <strong>R$ ${valorEstoque.toFixed(2)}</strong>.</p>
  `;

  const categorias = state.produtos.reduce((acc, item) => {
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
  state.fornecedorSelecionadoId = id;
  fillForm($("#fornecedorForm"), item);
  $("#fornecedorForm button[type='submit']").textContent = "Atualizar";
  setHash(`/fornecedores/${id}`);
  activateTab("fornecedores", false);
  renderFornecedorDetalhe();
  renderTopbar();
}

function editProduto(id) {
  const item = state.produtos.find((produto) => produto.id === id);
  if (!item) return;
  state.produtoSelecionadoId = id;
  const form = $("#produtoForm");
  fillForm(form, item);
  form.dataset.imagemAtual = item.imagem || "";
  form.querySelector("button[type='submit']").textContent = "Atualizar";
  setHash(`/produtos/${id}`);
  activateTab("produtos", false);
  renderProdutos();
  renderProdutoDetalhe();
  renderTopbar();
}

async function deleteFornecedor(id) {
  if (!confirm("Deseja excluir este fornecedor?")) return;
  try {
    const result = await api(`/api/fornecedores/${id}`, { method: "DELETE" });
    if (state.fornecedorSelecionadoId === id) state.fornecedorSelecionadoId = null;
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
  form.querySelector("button[type='submit']").textContent = "Cadastrar";
  clearErrors("#fornecedorForm");
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
  form.querySelector("button[type='submit']").textContent = "Cadastrar";
  clearErrors("#produtoForm");
  if (clearSelection) {
    state.produtoSelecionadoId = null;
    renderProdutos();
    renderProdutoDetalhe();
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
}

function showApp() {
  $("#authScreen").classList.add("hidden");
  $("#appShell").classList.remove("hidden");
  const name = state.usuario?.nome || "Usuario";
  $("#userName").textContent = name;
  $("#userProvider").textContent = state.usuario?.provedor || "local";
  $("#userAvatar").textContent = name.slice(0, 1).toUpperCase();
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

function showAlert(message, type = "info") {
  const stack = $("#alertStack");
  const item = document.createElement("div");
  item.className = `floating-alert ${type}`;
  item.innerHTML = `
    <strong>${escapeHtml(alertTitle(type))}</strong>
    <span>${escapeHtml(message)}</span>
    <button type="button" aria-label="Fechar alerta">×</button>
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
window.deleteFornecedor = deleteFornecedor;
window.deleteProduto = deleteProduto;
window.deleteAssociacao = deleteAssociacao;
window.selectProduto = selectProduto;
window.selectFornecedor = selectFornecedor;
window.selectAssociacao = selectAssociacao;
