const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = const PORT = process.env.PORT || 3000;
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
        const res = await fetch('/api/produtos');
        produtos = await res.json();
        const select = document.getElementById("selectProduto");
        select.innerHTML = '<option value="">-- Escolha um produto ou digite abaixo --</option>';
        produtos.forEach(p => {
          const opt = document.createElement("option");
          opt.value = p.id;
          opt.innerText = p.nome + ' - R$ ' + p.preco.toFixed(2);
          select.appendChild(opt);
        });
      } catch (e) {
        console.error("Erro ao carregar produtos:", e);
      }
    }

    async function cadastrarProduto() {
      const nome = document.getElementById("novoProdNome").value.trim();
      const preco = parseFloat(document.getElementById("novoProdPreco").value);
      if (!nome || isNaN(preco) || preco <= 0) return alert("Preencha nome e preço válido!");

      await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, preco })
      });

      document.getElementById("novoProdNome").value = "";
      document.getElementById("novoProdPreco").value = "";
      alert("Produto cadastrado com sucesso!");
      carregarProdutos();
    }

    function selecionarProdutoCatalogo() {
      const prodId = Number(document.getElementById("selectProduto").value);
      const prod = produtos.find(p => p.id === prodId);
      if (prod) {
        document.getElementById("lancDesc").value = prod.nome;
        precoUnitarioAtual = prod.preco;
        recalcularSubtotal();
      }
    }

    function recalcularSubtotal() {
      const qtd = parseInt(document.getElementById("lancQtd").value) || 1;
      if (precoUnitarioAtual > 0) {
        document.getElementById("lancValor").value = (precoUnitarioAtual * qtd).toFixed(2);
      }
    }

    async function carregarClientes() {
      try {
        const res = await fetch('/api/clientes');
        clientes = await res.json();
        const ul = document.getElementById("listaClientes");
        ul.innerHTML = "";

        clientes.forEach(c => {
          const li = document.createElement("li");
          li.className = 'client-item' + (clienteAtual && clienteAtual.id === c.id ? ' active' : '');
          li.innerHTML = '<div><strong>' + c.nome + '</strong><br><small style="color:#6b7280;">' + c.telefone + '</small></div>' +
                         '<span class="badge">R$ ' + parseFloat(c.total_devido).toFixed(2) + '</span>';
          li.onclick = () => selecionarCliente(c);
          ul.appendChild(li);
        });
      } catch (e) {
        console.error("Erro ao carregar clientes:", e);
      }
    }

    async function cadastrarCliente() {
      const nome = document.getElementById("novoNome").value.trim();
      const telefone = document.getElementById("novoTel").value.trim();
      if (!nome || !telefone) return alert("Digite nome e telefone!");

      await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, telefone })
      });

      document.getElementById("novoNome").value = "";
      document.getElementById("novoTel").value = "";
      carregarClientes();
    }

    async function selecionarCliente(c) {
      clienteAtual = c;
      document.getElementById("tituloCliente").innerText = 'Caderno de: ' + c.nome;
      document.getElementById("painelLancamento").style.display = "block";
      await carregarLancamentos();
      await carregarClientes();
    }

    async function carregarLancamentos() {
      if (!clienteAtual) return;
      try {
        const res = await fetch('/api/clientes/' + clienteAtual.id + '/lancamentos');
        lancamentosAtuais = await res.json();
        const tbody = document.getElementById("tabelaLancamentos");
        tbody.innerHTML = "";
        let total = 0;

        lancamentosAtuais.forEach(l => {
          if (l.status === 'PENDENTE') total += l.valor;
          const tr = document.createElement("tr");
          tr.innerHTML = '<td>' + l.data + '</td>' +
                         '<td>' + l.descricao + '</td>' +
                         '<td>R$ ' + parseFloat(l.valor).toFixed(2) + '</td>' +
                         '<td style="color:' + (l.status === 'PAGO' ? '#059669' : '#dc2626') + '; font-weight:bold;">' + l.status + '</td>';
          tbody.appendChild(tr);
        });

        document.getElementById("spanTotalDevido").innerText = total.toFixed(2);
      } catch (e) {
        console.error("Erro ao carregar lançamentos:", e);
      }
    }

    async function adicionarLancamento() {
      let desc = document.getElementById("lancDesc").value.trim();
      const qtd = parseInt(document.getElementById("lancQtd").value) || 1;
      const valor = parseFloat(document.getElementById("lancValor").value);
      const data = document.getElementById("lancData").value;

      if (!desc || isNaN(valor) || valor <= 0) {
        return alert("Preencha descrição e valor válidos!");
      }

      if (qtd > 1) {
        desc = qtd + 'x ' + desc;
      }

      await fetch('/api/lancamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: clienteAtual.id, descricao: desc, valor, data })
      });

      document.getElementById("lancDesc").value = "";
      document.getElementById("lancValor").value = "";
      document.getElementById("selectProduto").value = "";
      document.getElementById("lancQtd").value = "1";
      precoUnitarioAtual = 0;

      await carregarLancamentos();
      await carregarClientes();
    }

    async function darBaixa() {
      if (!confirm('Deseja quitar a conta de ' + clienteAtual.nome + '?')) return;
      await fetch('/api/clientes/' + clienteAtual.id + '/pagar', { method: 'POST' });
      await carregarLancamentos();
      await carregarClientes();
    }

    function cobrarWhatsApp() {
      const pendentes = lancamentosAtuais.filter(l => l.status === 'PENDENTE');
      if (pendentes.length === 0) return alert("Não há débitos pendentes!");

      let total = 0;
      let textoItens = "";

      pendentes.forEach(item => {
        total += item.valor;
        textoItens += '• ' + item.data + ' - ' + item.descricao + ': R$ ' + item.valor.toFixed(2) + '\\n';
      });

      const tel = clienteAtual.telefone.replace(/\\D/g, "");
      const pixChave = localStorage.getItem("pix_chave") || "";
      const pixNome = localStorage.getItem("pix_nome") || "";

      let msg = 'Olá, *' + clienteAtual.nome + '*! Tudo bem?\\n\\n';
      msg += 'Segue o extrato dos seus consumos no caderninho:\\n\\n';
      msg += textoItens;
      msg += '\\n*Total a acertar: R$ ' + total.toFixed(2) + '*';

      if (pixChave) {
        msg += '\\n\\n══════════════════';
        msg += '\\n*PAGAMENTO VIA PIX:*';
        if (pixNome) msg += '\\nFavorecido: ' + pixNome;
        msg += '\\nChave Pix: \`' + pixChave + '\`';
        msg += '\\n_(Copie a chave e pague no seu banco)_';
        msg += '\\n══════════════════';
      }

      msg += '\\n\\nQualquer dúvida estou à disposição!';

      window.open('https://wa.me/55' + tel + '?text=' + encodeURIComponent(msg), "_blank");
    }

    carregarProdutos();
    carregarClientes();
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Rota principal: entrega o HTML completo garantido
  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(HTML_PAGE);
  }

  function readBody(callback) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        callback(JSON.parse(body || '{}'));
      } catch (e) {
        callback({});
      }
    });
  }

  // Clientes
  if (req.method === 'GET' && pathname === '/api/clientes') {
    const db = lerBanco();
    const lista = db.clientes.map(c => {
      const total = db.lancamentos
        .filter(l => l.cliente_id === c.id && l.status === 'PENDENTE')
        .reduce((sum, item) => sum + item.valor, 0);
      return { ...c, total_devido: total };
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(lista));
  }

  if (req.method === 'POST' && pathname === '/api/clientes') {
    return readBody(body => {
      const { nome, telefone } = body;
      if (!nome || !telefone) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Nome e telefone obrigatórios.' }));
      }
      const db = lerBanco();
      const novo = { id: Date.now(), nome, telefone };
      db.clientes.push(novo);
      salvarBanco(db);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...novo, total_devido: 0 }));
    });
  }

  // Produtos
  if (req.method === 'GET' && pathname === '/api/produtos') {
    const db = lerBanco();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(db.produtos || []));
  }

  if (req.method === 'POST' && pathname === '/api/produtos') {
    return readBody(body => {
      const { nome, preco } = body;
      if (!nome || isNaN(preco)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Dados inválidos.' }));
      }
      const db = lerBanco();
      const novoProduto = { id: Date.now(), nome, preco: parseFloat(preco) };
      db.produtos.push(novoProduto);
      salvarBanco(db);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(novoProduto));
    });
  }

  // Lançamentos
  const lancMatch = pathname.match(/^\/api\/clientes\/(\d+)\/lancamentos$/);
  if (req.method === 'GET' && lancMatch) {
    const id = Number(lancMatch[1]);
    const db = lerBanco();
    const itens = db.lancamentos.filter(l => l.cliente_id === id).reverse();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(itens));
  }

  if (req.method === 'POST' && pathname === '/api/lancamentos') {
    return readBody(body => {
      const { cliente_id, descricao, valor, data } = body;
      if (!cliente_id || !descricao || !valor) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Dados incompletos.' }));
      }
      const db = lerBanco();
      const novoItem = {
        id: Date.now(),
        cliente_id: Number(cliente_id),
        descricao,
        valor: parseFloat(valor),
        data: data || new Date().toISOString().split('T')[0],
        status: 'PENDENTE'
      };
      db.lancamentos.push(novoItem);
      salvarBanco(db);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(novoItem));
    });
  }

  // Quitar conta
  const pagarMatch = pathname.match(/^\/api\/clientes\/(\d+)\/pagar$/);
  if (req.method === 'POST' && pagarMatch) {
    const id = Number(pagarMatch[1]);
    const db = lerBanco();
    db.lancamentos.forEach(l => {
      if (l.cliente_id === id && l.status === 'PENDENTE') {
        l.status = 'PAGO';
      }
    });
    salvarBanco(db);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Não encontrado');
});

server.listenserver.listen(PORT, '0.0.0.0', () => {
  console.log(`Sistema rodando com sucesso! Acesse no navegador: http://localhost:${PORT}`);
});
