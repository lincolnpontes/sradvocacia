const assert = require('node:assert/strict');
const { test } = require('node:test');
const acorn = require('acorn');
const { source } = require('./app-ambiente.cjs');
test('nenhum fluxo esquece de aguardar persistencia e acoes assincronas', () => {
  const ast = acorn.parse(source, { ecmaVersion: 'latest' });
  const nomes = new Set(ast.body.filter(node => node.type === 'FunctionDeclaration' && node.async).map(node => node.id.name));
  const pendentes = [];
  function walk(node, parent) {
    if (!node?.type) return;
    if (node.type === 'CallExpression') {
      const c = node.callee;
      const persistencia = c.type === 'MemberExpression' && c.object.name === 'armazenamentoLocal' && ['gravarItens', 'setItem', 'removeItem', 'aguardar', 'inicializar', 'confirmarMigracao'].includes(c.property.name);
      const acao = c.type === 'Identifier' && nomes.has(c.name) && c.name !== 'iniciarAplicativo';
      if ((persistencia || acao) && !['AwaitExpression', 'ReturnStatement'].includes(parent?.type)) pendentes.push(source.slice(node.start, node.end).slice(0, 100));
      assert.ok(!(c.type === 'MemberExpression' && c.object.name === 'localStorage' && ['setItem', 'removeItem', 'clear'].includes(c.property.name)), 'Nao modificar localStorage legado');
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) for (const child of value) walk(child, node);
      else if (value?.type) walk(value, node);
    }
  }
  walk(ast);
  assert.deepEqual(pendentes, []);
});
