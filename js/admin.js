import { renderMenu } from './menu.js';
import { API_BASE_URL } from './config.js';
import { getCurrentUser, checkPermission } from './auth.js';

document.addEventListener('DOMContentLoaded', function() {
    renderMenu();
    checkPermission('administrador');
    loadPendingAgents();
});

async function loadPendingAgents() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('Usuário não autenticado. Redirecionando para login.');
        window.location.href = 'login.html';
        return;
    }
    try {
        console.log('Iniciando loadPendingAgents');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.log('Timeout atingido, abortando requisição');
            controller.abort();
        }, 30000); // 30 segundos de timeout

        const response = await fetch(`${API_BASE_URL}/api/users/pending-agents`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('Resposta recebida:', response);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro na resposta: ${response.status} - ${errorData.message || 'Erro desconhecido'}`);
        }

        const data = await response.json();
        console.log('Dados recebidos:', data);

        displayPendingAgents(data.data.pendingAgents);
    } catch (error) {
        console.error('Erro detalhado ao carregar corretores pendentes:', error);
        console.error('Stack trace:', error.stack);
        if (error.name === 'AbortError') {
            alert('A requisição excedeu o tempo limite. Verifique sua conexão e tente novamente.');
        } else {
            alert(`Erro ao carregar corretores pendentes: ${error.message}`);
        }
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
        `;
        list.appendChild(li);
    });
}

window.approveAgent = async function(agentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/approve-agent/${agentId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        if (response.ok) {
            alert('Corretor aprovado com sucesso');
            loadPendingAgents();
        } else {
            alert(data.message || 'Erro ao aprovar corretor');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor');
    }
}