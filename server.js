const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

// Habilita o Express para ler dados em formato JSON
app.use(express.json());

// 1. Conexão e Criação do Banco de Dados SQLite
const db = new sqlite3.Database('./fiec.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao SQLite', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite com sucesso!');
    }
});

// Criar a tabela de alunos caso ela não exista
db.run(`CREATE TABLE IF NOT EXISTS alunos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    ra TEXT UNIQUE NOT NULL,
    curso TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
)`);

// ==========================================
// ROTAS DA API
// ==========================================

// 📌 1. CADASTRAR ALUNO (POST /alunos)
app.post('/alunos', (req, res) => {
    const { nome, ra, curso, email } = req.body;

    // Validações de Negócio
    if (!nome || nome.trim().length < 3) {
        return res.status(400).json({ erro: "O nome precisa ter no mínimo 3 letras." });
    }
    if (!email || !email.includes('@')) {
        return res.status(400).json({ erro: "O e-mail precisa ser válido e conter '@'." });
    }
    if (!ra || ra.toString().length !== 5 || isNaN(ra)) {
        return res.status(400).json({ erro: "O RA precisa ter exatamente 5 dígitos numéricos." });
    }

    const query = `INSERT INTO alunos (nome, ra, curso, email) VALUES (?, ?, ?, ?)`;
    
    db.run(query, [nome, ra, curso, email], function(err) {
        if (err) {
            // Se der erro, provavelmente o RA ou E-mail já existem (por causa do UNIQUE)
            return res.status(400).json({ erro: "RA ou E-mail já cadastrados no sistema." });
        }

        res.status(201).json({
            mensagem: "Aluno cadastrado com sucesso!",
            aluno: {
                id: this.lastID,
                nome,
                ra,
                curso,
                email
            }
        });
    });
});

// 📌 2. LISTAR TODOS OS ALUNOS (GET /alunos) + CONTAGEM TOTAL
app.get('/alunos', (req, res) => {
    db.all(`SELECT * FROM alunos`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ erro: err.message });
        }

        res.status(200).json({
            total: rows.length,
            alunos: rows
        });
    });
});

// 📌 3. BUSCAR ALUNO POR ID (GET /alunos/:id)
app.get('/alunos/:id', (req, res) => {
    const { id } = req.params;
    const query = `SELECT * FROM alunos WHERE id = ?`;

    db.get(query, [id], (err, row) => {
        if (err) {
            return res.status(500).json({ erro: err.message });
        }
        if (!row) {
            return res.status(404).json({ erro: "Aluno não encontrado." });
        }

        res.status(200).json(row);
    });
});

// 📌 4. ATUALIZAR ALUNO (PUT /alunos/:id)
app.put('/alunos/:id', (req, res) => {
    const { id } = req.params;
    const { nome, ra, curso, email } = req.body;

    const query = `UPDATE alunos SET nome = COALESCE(?, nome), ra = COALESCE(?, ra), curso = COALESCE(?, curso), email = COALESCE(?, email) WHERE id = ?`;

    db.run(query, [nome, ra, curso, email, id], function(err) {
        if (err) {
            return res.status(400).json({ erro: "Erro ao atualizar. Verifique se o RA ou E-mail já pertencem a outro aluno." });
        }
        if (this.changes === 0) {
            return res.status(404).json({ erro: "Aluno não encontrado para atualizar." });
        }

        res.status(200).json({ mensagem: "Aluno atualizado com sucesso!" });
    });
});

// 📌 5. DELETAR ALUNO (DELETE /alunos/:id)
app.delete('/alunos/:id', (req, res) => {
    const { id } = req.params;
    const query = `DELETE FROM alunos WHERE id = ?`;

    db.run(query, [id], function(err) {
        if (err) {
            return res.status(500).json({ erro: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ erro: "Aluno não encontrado para deletar." });
        }

        res.status(200).json({ mensagem: "Aluno deletado com sucesso!" });
    });
});

// Inicializar o Servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT} 🚀`);
});