import * as evolucaoRepository from "../repositories/evolucaoRepository.js";

export async function dashboard(userId) {
    const execucoes = await evolucaoRepository.listarExecucoesFinalizadas(userId);
    const treinosFeitos = execucoes.length;

    const porTreino = new Map();
    for (const exec of execucoes) {
        if (!porTreino.has(exec.treino_id)) porTreino.set(exec.treino_id, []);
        porTreino.get(exec.treino_id).push(exec);
    }

    const datasComExecucao = [...new Set(execucoes.map(e => e.data_execucao.slice(0, 10)))].sort();

    const progressaoHistorico = [];

    for (const dia of datasComExecucao) {
        let somaPesoPercentual = 0;
        let somaPeso = 0;

        for (const execsDoTreino of porTreino.values()) {
            const ateOdia = execsDoTreino.filter(e => e.data_execucao.slice(0, 10) <= dia);
            if (ateOdia.length === 0) continue;

            const primeira = execsDoTreino[0];
            const ultimaAteOdia = ateOdia[ateOdia.length - 1];

            const peso = ateOdia.length;
            const percentual = primeira.volume_total > 0
                ? ((ultimaAteOdia.volume_total - primeira.volume_total) / primeira.volume_total) * 100
                : 0;

            somaPesoPercentual += peso * percentual;
            somaPeso += peso;
        }

        const progressaoTotal = somaPeso > 0 ? somaPesoPercentual / somaPeso : 0;
        progressaoHistorico.push({ dia, progressao_total: parseFloat(progressaoTotal.toFixed(2)) });
    }

    return { treinos_feitos: treinosFeitos, progressao_historico: progressaoHistorico };
}
