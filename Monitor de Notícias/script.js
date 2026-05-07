const axios = require('axios');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose();

// 1. Configuração do Banco de Dados
const db = new sqlite3.Database('monitoramento.db', (err) => {
    if (err) console.error("Erro ao abrir banco:", err.message);
    else console.log("Conectado ao SQLite: monitoramento.db");
});

// Inicialização da Tabela
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS noticias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        url TEXT NOT NULL,
        data_acesso DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

/**
 * Função principal de Scraping e Inserção
 */
async function coletarNoticias() {
    try {
        console.log("Iniciando coleta no G1...");
        const { data } = await axios.get('https://g1.globo.com/');
        const $ = cheerio.load(data);
        
        let contador = 0;

        // O seletor '.feed-post-link' captura as manchetes principais do G1
        $('.feed-post-link').each((i, element) => {
            const titulo = $(element).text().trim();
            const url = $(element).attr('href');

            if (titulo && url) {
                const stmt = db.prepare("INSERT INTO noticias (titulo, url) VALUES (?, ?)");
                stmt.run(titulo, url);
                stmt.finalize();
                contador++;
            }
        });

        console.log(`Sucesso! ${contador} manchetes foram capturadas e salvas.`);
        
        // Chamar as operações de gerenciamento após a coleta
        executarGerenciamento();

    } catch (error) {
        console.error("Erro na coleta:", error.message);
    }
}

/**
 * Funções de Gerenciamento (CRUD)
 */
function executarGerenciamento() {
    console.log("\n--- Iniciando Operações CRUD ---");

    // READ: Consultar todos os registros
    db.all("SELECT * FROM noticias LIMIT 5", (err, rows) => {
        if (err) throw err;
        console.log(">> Últimas 5 notícias salvas:");
        console.table(rows);

        // UPDATE: Simulando correção no ID 1
        db.run("UPDATE noticias SET titulo = '[CORRIGIDO] ' || titulo WHERE id = 1", function(err) {
            if (err) return console.log(err.message);
            console.log(`>> Registro atualizado: ${this.changes} linha(s) alterada(s).`);

            // DELETE: Remover se houver título vazio ou critério específico
            db.run("DELETE FROM noticias WHERE titulo IS NULL", function(err) {
                if (err) return console.log(err.message);
                console.log(`>> Limpeza concluída: ${this.changes} registro(s) deletado(s).`);
                
                // Fechar conexão ao terminar
                // db.close(); 
            });
        });
    });
}

// Iniciar o processo
coletarNoticias();