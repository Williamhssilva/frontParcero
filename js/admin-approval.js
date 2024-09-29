console.log('admin-approval.js carregado');

import { API_BASE_URL } from './config.js';
import { getCurrentUser, checkPermission } from './auth.js';
import { renderMenu } from './menu.js';

document.addEventListener('DOMContentLoaded', function() {
    renderMenu();
    console.log('DOMContentLoaded event fired');
    checkPermission('administrador');
    loadPendingAgents();
});

async function loadPendingAgents() {
    try {
        console.log('Iniciando loadPendingAgents');
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Token não encontrado');
        }

        console.log('Token:', token);
        console.log('API_BASE_URL:', API_BASE_URL);

        console.log('Fazendo requisição para:', `${API_BASE_URL}/api/users/pending-agents`);
        const response = await fetch(`${API_BASE_URL}/api/users/pending-agents`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            mode: 'cors'
        });

        console.log('Resposta recebida:', response);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Dados recebidos:', data);

        if (data.status === 'success' && data.data && Array.isArray(data.data.pendingAgents)) {
            displayPendingAgents(data.data.pendingAgents);
        } else {
            console.log('Nenhum agente pendente encontrado ou formato de resposta inesperado');
            displayPendingAgents([]);
        }
    } catch (error) {
        console.error('Erro detalhado ao carregar corretores pendentes:', error);
        console.error('Stack trace:', error.stack);
        alert(`Erro ao carregar corretores pendentes: ${error.message}`);
    }
}

function displayPendingAgents(agents) {
    const list = document.getElementById('pending-agents-list');
    list.innerHTML = '';
    if (agents.length === 0) {
        list.innerHTML = '<li>Nenhum corretor pendente de aprovação.</li>';
        return;
    }
    agents.forEach(agent => {
        const li = document.createElement('li');
        li.className = 'agent-item';
        li.innerHTML = `
            <span>${agent.name} (${agent.email})</span>
            <button onclick="approveAgent('${agent._id}')" class="approve-button">Aprovar</button>
            <button onclick="rejectAgent('${agent._id}')" class="reject-button">Rejeitar</button>
        `;
        list.appendChild(li);
    });
}

window.approveAgent = async function(agentId) {
    try {
        console.log(`Iniciando aprovação do agente com ID: ${agentId}`);
        
        const response = await fetch(`${API_BASE_URL}/api/users/approve-agent/${agentId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao aprovar o agente');
        }

        const data = await response.json();
        console.log('Resposta recebida:', data);

        if (data.status === 'success') {
            alert('Agente aprovado com sucesso!');
            loadPendingAgents(); // Recarrega a lista de agentes pendentes
        } else {
            throw new Error(data.message || 'Erro ao aprovar agente');
        }
    } catch (error) {
        console.error('Erro ao aprovar corretor:', error);
        alert(`Erro ao aprovar o agente: ${error.message}`);
    }
};

window.rejectAgent = async function(agentId) {
    try {
        console.log(`Iniciando rejeição do agente com ID: ${agentId}`);
        
        const response = await fetch(`${API_BASE_URL}/api/users/reject-agent/${agentId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao rejeitar o agente');
        }

        const data = await response.json();
        console.log('Resposta recebida:', data);

        if (data.status === 'success') {
            alert('Agente rejeitado com sucesso!');
            loadPendingAgents(); // Recarrega a lista de agentes pendentes
        } else {
            throw new Error(data.message || 'Erro ao rejeitar agente');
        }
    } catch (error) {
        console.error('Erro ao rejeitar corretor:', error);
        alert(`Erro ao rejeitar o agente: ${error.message}`);
    }
};

const controller = new AbortController();
const timeoutId = setTimeout(() => {
    console.log('Timeout atingido, abortando requisição');
    controller.abort();
}, 10000); // 10 segundos