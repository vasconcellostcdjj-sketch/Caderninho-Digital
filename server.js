const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'banco.json');

// Inicializa banco de dados
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ clientes: [], produtos: [], lancamentos: [] }, null, 2));
}

function lerBanco() {
  try {
    const dados = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    if (!dados.produtos) dados.produtos = [];
    if (!dados.clientes) dados.clientes = [];
    if (!dados.lancamentos) dados.lancamentos = [];
    return dados;
  } catch (e) {
    return { clientes: [], produtos: [], lancamentos: [] };
  }
}

function salvarBanco(dados) {
  fs.writeFileSync(DB_FILE, JSON.stringify(dados, null, 2));
}

// O código HTML embutido diretamente aqui (sem risco de ficheiro em branco)
const HTML_PAGE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Caderninho Digital</title>
  <style>
    * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
    body { background: #f3f4f6; margin: 0; padding: 20px; color: #1f2937; }
    .container { max-width: 1050px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1.3fr; gap: 20px; }
    @media (max-width: 768px) { .container { grid-template-columns: 1fr; } }
    .card { background: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.08); margin-bottom: 20px; }
    h2, h3 { margin-top: 0; color: #111827; }
    label { font-size: 13px; font-weight: 600; display: block; margin-top: 10px; color: #374151; }
    input, select { width: 100%; padding: 10px; margin-top: 4px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
    button { width: 100%; padding: 10px; margin-top: 12px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; transition: 0.2s; }
    .btn-blue { background: #2563eb; color: white; }
    .btn-blue:hover { background: #1d4ed8; }
    .btn-orange { background: #ea580c; color: white; margin-top: 8px; }
    .btn-pix { background: #0284c7; color: white; margin-top: 8px; }
    .btn-wpp { background: #16a34a; color: white; margin-top: 10px; }
    .btn-pay { background: #059669; color: white; margin-top: 8px; }
    .client-list { list-style: none; padding: 0; margin: 0; max-height: 250px; overflow-y: auto; }
    .client-item { padding: 12px; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border-radius: 6px; }
    .client-item:hover, .client-item.active { background: #eff6ff; }
    .badge { background: #fee2e2; color: #b91c1c; padding: 4px 8px; border-radius: 20px; font-weight: bold; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 4px; text-align: left; }
    .total-box { font-size: 20px; font-weight: bold; color: #dc2626; text-align: right; margin-top: 15px; }
    .pix-box { background: #f0fdf4; border: 1px dashed #16a34a; padding: 14px; border-radius: 8px; margin-bottom: 16px; }
    .prod-box { background: #fff7ed; border: 1px dashed #ea580c; padding: 14px; border-radius: 8px; margin-bottom: 16px; }
  </style>
</head>
<body>

  <div class="container">
    <div>
      <div class="card pix-box">
        <h3 style="color: #166534; font-size: 15px; margin-bottom: 4px;">⚙️ Minha Chave Pix</h3>
        <label>Chave Pix:</label>
        <input type="text" id="configPixChave" placeholder="Ex: seu-pix@email.com" />
        <label>Nome do Favorecido / Loja:</label>
        <input type="text" id="configPixNome" placeholder="Ex: Minha Loja" />
        <button class="btn-pix" onclick="salvarConfigPix()">💾 Salvar Chave Pix</button>
      </div>

      <div class="card prod-box">
        <h3 style="color: #9a3412; font-size: 15px; margin-bottom: 4px;">🍰 Cadastrar Produto / Preço</h3>
        <label>Nome do Produto:</label>
        <input type="text" id="novoProdNome" placeholder="Ex: Fatia Bolo Maracujá" />
        <label>Preço Padrão (R$):</label>
        <input type="number" step="0.01" id="novoProdPreco" placeholder="Ex: 18.00" />
        <button class="btn-orange" onclick="cadastrarProduto()">+ Salvar Produto no Catálogo</button>
      </div>

      <div class="card">
        <h3>Novo Cliente</h3>
        <label>Nome:</label>
        <input type="text" id="novoNome" placeholder="Ex: Thiago" />
        <label>WhatsApp (com DDD):</label>
        <input type="text" id="novoTel" placeholder="Ex: 82999998888" />
        <button class="btn-blue" onclick="cadastrarCliente()">+ Cadastrar Cliente</button>
      </div>

      <div class="card">
        <h3>Clientes Cadastrados</h3>
        <ul id="listaClientes" class="client-list"></ul>
      </div>
    </div>

    <div>
      <div class="card">
        <h3 id="tituloCliente">Selecione um cliente ao lado</h3>
        
        <div id="painelLancamento" style="display: none;">
          <label>Data:</label>
          <input type="date" id="lancData" />

          <label>Escolher Produto do Catálogo (Opcional):</label>
          <select id="selectProduto" onchange="selecionarProdutoCatalogo()">
            <option value="">-- Escolha um produto ou digite abaixo --</option>
          </select>

          <label>Descrição do Item:</label>
          <input type="text" id="lancDesc" placeholder="Ex: Fatia de bolo / Salgado" />

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label>Qtd:</label>
              <input type="number" id="lancQtd" value="1" min="1" oninput="recalcularSubtotal()" />
            </div>
            <div>
              <label>Valor Total (R$):</label>
              <input type="number" step="0.01" id="lancValor" placeholder="18.00" />
            </div>
          </div>

          <button class="btn-blue" onclick="adicionarLancamento()">Adicionar ao Fiado</button>

          <table style="margin-top: 20px;">
            <thead>
              <tr><th>Data</th><th>Item</th><th>R$</th><th>Status</th></tr>
            </thead>
            <tbody id="tabelaLancamentos"></tbody>
          </table>

          <div class="total-box">
            Total a Pagar: R$ <span id="spanTotalDevido">0,00</span>
          </div>

          <button class="btn-wpp" onclick="cobrarWhatsApp()">📲 Enviar Cobrança com Pix no WhatsApp</button>
          <button class="btn-pay" onclick="darBaixa()">✔ Quitar Conta (Marcar Pago)</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    let clientes = [];
    let produtos = [];
    let clienteAtual = null;
    let lancamentosAtuais = [];
    let precoUnitarioAtual = 0;

    const elPixChave = document.getElementById("configPixChave");
    const elPixNome = document.getElementById("configPixNome");
    if (elPixChave) elPixChave.value = localStorage.getItem("pix_chave") || "";
    if (elPixNome) elPixNome.value = localStorage.getItem("pix_nome") || "";
    document.getElementById("lancData").value = new Date().toISOString().split('T')[0];

    function salvarConfigPix() {
      localStorage.setItem("pix_chave", document.getElementById("configPixChave").value.trim());
      localStorage.setItem("pix_nome", document.getElementById("configPixNome").value.trim());
      alert("Configurações do Pix salvas!");
    }

    async function carregarProdutos() {
      try {
        const res = await fetch('/api/
