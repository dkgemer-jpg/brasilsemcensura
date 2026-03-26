export async function onRequest(context) {
  const { request } = context;

  // Ranking simulado de colaboradores (futuramente conectar a banco de dados)
  const colaboradores = [
    { nome: 'Apoiador #1', indicacoes: 12, diasGanhos: 26 },
    { nome: 'Apoiador #2', indicacoes: 8, diasGanhos: 18 },
    { nome: 'Apoiador #3', indicacoes: 5, diasGanhos: 12 },
    { nome: 'Apoiador #4', indicacoes: 3, diasGanhos: 8 },
    { nome: 'Apoiador #5', indicacoes: 1, diasGanhos: 4 }
  ];

  return new Response(JSON.stringify({ colaboradores }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
