#!/usr/bin/env node

import bcrypt from 'bcryptjs';
import db from '../../DB/db.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function criarUsuario() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  Criar Novo Usuário - Hackeando Treino  ║');
  console.log('╚══════════════════════════════════════╝\n');

  try {
    const username = await question('Username (mínimo 3 caracteres): ');
    const nomeCompleto = await question('Nome completo (opcional): ');
    const password = await question('Senha (mínimo 6 caracteres): ');

    // Validações
    if (username.length < 3) {
      console.error('❌ Erro: Username deve ter no mínimo 3 caracteres');
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('❌ Erro: Senha deve ter no mínimo 6 caracteres');
      process.exit(1);
    }

    // Verifica duplicação
    const existente = db.prepare(
      'SELECT id FROM usuarios WHERE username = ? COLLATE NOCASE'
    ).get(username);

    if (existente) {
      console.error('❌ Erro: Username já existe');
      process.exit(1);
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // Insere usuário
    const result = db.prepare(`
      INSERT INTO usuarios (username, password_hash, nome_completo, data_criacao, ativo)
      VALUES (?, ?, ?, ?, 1)
    `).run(username, passwordHash, nomeCompleto || null, new Date().toISOString());

    console.log('\n✅ Usuário criado com sucesso!');
    console.log(`ID: ${result.lastInsertRowid}`);
    console.log(`Username: ${username}`);
    console.log(`Nome: ${nomeCompleto || '(não informado)'}\n`);

  } catch (erro) {
    console.error('❌ Erro ao criar usuário:', erro.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

criarUsuario();
