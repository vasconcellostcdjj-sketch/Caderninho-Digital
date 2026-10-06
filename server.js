const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'banco.json');
const HTML_FILE = path.join(__dirname, 'index.html');

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

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Entrega o ficheiro index.html da raiz
  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    if (fs.existsSync(HTML_FILE)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(HTML_FILE));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Ficheiro index.html nao encontrado.');
    }
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
        return res.end(JSON.stringify({ error: 'Nome e telefone obrigatorios.' }));
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
        return res.end(JSON.stringify({ error: 'Dados invalidos.' }));
      }
      const db = lerBanco();
      const novoProduto = { id: Date.now(), nome, preco: parseFloat(preco) };
      db.produtos.push(novoProduto);
      salvarBanco(db);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(novoProduto));
    });
  }

  // Lancamentos
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
  res.end('Nao encontrado');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Sistema rodando com sucesso na porta ${PORT}!`);
});
