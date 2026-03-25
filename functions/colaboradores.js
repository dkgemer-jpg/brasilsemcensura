export async function onRequest() {
    return new Response(JSON.stringify({
        colaboradores: [
            { nome: "João Silva", indicacoes: 5, avatar: "https://randomuser.me/api/portraits/men/1.jpg" },
            { nome: "Maria Oliveira", indicacoes: 3, avatar: "https://randomuser.me/api/portraits/women/2.jpg" }
        ]
    }), { headers: { 'Content-Type': 'application/json' } });
}
