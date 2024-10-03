import { API_BASE_URL } from './config.js';
import { renderMenu } from './menu.js';

// Remova ou comente esta linha, pois estamos importando API_BASE_URL acima
// const API_BASE_URL = 'http://localhost:5000';

import { getCurrentUser, checkPermission } from './auth.js';

let allLeads = []; // Armazenará todos os leads

document.addEventListener('DOMContentLoaded', function() {
    renderMenu();
    if (checkPermission(['corretor', 'administrador'])) {
        setupEventListeners();
        loadLeads();
        initializeSortable();
        initializeDraggableScroll(); // Adicione esta linha
    }
});

function initializeSortable() {
    const stages = document.querySelectorAll('.stage-leads');
    stages.forEach(stage => {
        new Sortable(stage, {
            group: 'shared',
            animation: 150,
            ghostClass: 'sortable-ghost',  // Classe para o elemento fantasma durante o arrasto
            chosenClass: 'sortable-chosen',  // Classe para o elemento escolhido
            dragClass: 'sortable-drag',  // Classe para o elemento sendo arrastado
            onEnd: function (evt) {
                const leadId = evt.item.getAttribute('data-id');
                const newStage = evt.to.getAttribute('data-stage');
                updateLeadStage(leadId, newStage);
            },
            // Ajuste estas opções:
            forceFallback: false,  // Desativa o fallback para melhorar o desempenho
            fallbackTolerance: 0,  // Reduz a tolerância para iniciar o arrasto
            fallbackOnBody: false, // Desativa para melhorar o desempenho
            swapThreshold: 1,      // Ajusta para permitir soltar em qualquer lugar
            direction: 'vertical'  // Garante que o arrasto seja vertical
        });
    });
}

function initializeDraggableScroll() {
    const salesFunnel = document.querySelector('.sales-funnel');
    let isDown = false;
    let startX;
    let scrollLeft;

    salesFunnel.addEventListener('mousedown', (e) => {
        // Ignora se o clique for em um card ou em um elemento dentro do card
        if (e.target.closest('.lead-card')) return;
        
        isDown = true;
        salesFunnel.style.cursor = 'grabbing';
        startX = e.pageX - salesFunnel.offsetLeft;
        scrollLeft = salesFunnel.scrollLeft;
    });

    salesFunnel.addEventListener('mouseleave', () => {
        isDown = false;
        salesFunnel.style.cursor = 'default';
    });

    salesFunnel.addEventListener('mouseup', () => {
        isDown = false;
        salesFunnel.style.cursor = 'default';
    });

    salesFunnel.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - salesFunnel.offsetLeft;
        const walk = (x - startX) * 2; // Ajuste o multiplicador para controlar a velocidade do scroll
        salesFunnel.scrollLeft = scrollLeft - walk;
    });
}

function setupEventListeners() {
    const addLeadButton = document.getElementById('add-lead-button');
    if (addLeadButton) {
        addLeadButton.addEventListener('click', showAddLeadForm);
    } else {
        console.error('Elemento com ID "add-lead-button" não encontrado');
    }

    const leadForm = document.getElementById('lead-form');
    if (leadForm) {
        leadForm.addEventListener('submit', handleFormSubmit);
    } else {
        console.error('Elemento com ID "lead-form" não encontrado');
    }

    document.getElementById('search-leads').addEventListener('input', filterLeads);
    document.getElementById('stage-filter').addEventListener('change', filterLeads);
    document.getElementById('status-filter').addEventListener('change', filterLeads);
    document.getElementById('interest-filter').addEventListener('change', filterLeads);

    // Adicione verificações similares para outros elementos
}

async function loadLeads() {
    console.log('Token armazenado:', localStorage.getItem('token'));
    console.log('Iniciando carregamento de leads');
    try {
        const response = await fetch(`${API_BASE_URL}/api/leads`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        console.log('Resposta recebida:', response.status, response.statusText);
        const data = await response.json();
        console.log('Dados recebidos:', data);
        if (response.ok) {
            allLeads = data.data;
            displayLeadsInFunnel(allLeads);
        } else {
            console.error('Erro ao carregar leads:', data.error);
        }
    } catch (error) {
        console.error('Erro ao carregar leads:', error);
    }
}

function filterLeads() {
    const searchTerm = document.getElementById('search-leads').value.toLowerCase();
    const stageFilter = document.getElementById('stage-filter').value;
    const statusFilter = document.getElementById('status-filter').value;
    const interestFilter = document.getElementById('interest-filter').value;

    const filteredLeads = allLeads.filter(lead => {
        const matchesSearch = lead.name.toLowerCase().includes(searchTerm) ||
                              lead.email.toLowerCase().includes(searchTerm);
        const matchesStage = !stageFilter || lead.stage === stageFilter;
        const matchesStatus = !statusFilter || lead.status === statusFilter;
        const matchesInterest = !interestFilter || lead.interest === interestFilter;

        return matchesSearch && matchesStage && matchesStatus && matchesInterest;
    });

    displayLeadsInFunnel(filteredLeads);
}

function displayLeadsInFunnel(leads) {
    const stages = document.querySelectorAll('.stage-leads');
    stages.forEach(stage => stage.innerHTML = '');

    leads.forEach(lead => {
        const leadCard = createLeadCard(lead);
        const stageElement = document.querySelector(`.stage-leads[data-stage="${lead.stage}"]`);
        if (stageElement) {
            stageElement.appendChild(leadCard);
        }
    });
}

function createLeadCard(lead) {
    const card = document.createElement('div');
    card.className = 'lead-card';
    card.setAttribute('data-id', lead._id);
    card.innerHTML = `
        <h4>${lead.name}</h4>
        <p>${lead.email}</p>
        <p>Interesse: ${lead.interest}</p>
        <p>Status: ${lead.status}</p>
        <button class="btn btn-actions">Ações</button>
    `;
    const actionButton = card.querySelector('.btn-actions');
    actionButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Impede que o evento de clique se propague para o card
        showStageActions(lead._id);
    });
    card.addEventListener('click', () => showLeadDetails(lead));
    return card;
}

function showAddLeadForm() {
    const form = document.getElementById('lead-form');
    form.reset(); // Limpa o formulário
    form.removeAttribute('data-lead-id'); // Remove o atributo de ID do lead, se houver
    
    document.getElementById('lead-form-title').textContent = 'Adicionar Novo Lead';
    document.getElementById('lead-form-container').style.display = 'block';
}

async function showEditLeadForm(leadId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/leads/${leadId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            const lead = data.data;
            populateForm(lead);
            document.getElementById('lead-form-title').textContent = 'Editar Lead';
            document.getElementById('lead-form-container').style.display = 'block';
        } else {
            throw new Error(data.error || 'Erro desconhecido ao carregar lead');
        }
    } catch (error) {
        console.error('Erro ao carregar lead:', error);
        alert(`Erro ao carregar lead: ${error.message}`);
    }
}

function closeForm() {
    document.getElementById('lead-form-container').style.display = 'none';
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const leadId = form.getAttribute('data-lead-id');
    const leadData = {
        name: form.elements.name.value,
        email: form.elements.email.value,
        phone: form.elements.phone.value,
        interest: form.elements.interest.value,
        status: form.elements.status.value
    };

    try {
        const url = leadId ? `${API_BASE_URL}/api/leads/${leadId}` : `${API_BASE_URL}/api/leads`;
        const method = leadId ? 'PUT' : 'POST';
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(leadData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
            loadLeads(); // Recarrega a lista de leads
            document.getElementById('lead-form-container').style.display = 'none';
            alert(leadId ? 'Lead atualizado com sucesso!' : 'Novo lead adicionado com sucesso!');
        } else {
            throw new Error(data.error || 'Erro desconhecido ao salvar lead');
        }
    } catch (error) {
        console.error('Erro ao salvar lead:', error);
        alert(`Erro ao salvar lead: ${error.message}`);
    }
}

async function updateLeadStage(leadId, newStage) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/leads/${leadId}/stage`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ stage: newStage })
        });

        if (!response.ok) {
            throw new Error('Falha ao atualizar estágio do lead');
        }

        // Atualização bem-sucedida, não precisamos recarregar todos os leads
    } catch (error) {
        console.error('Erro ao atualizar estágio do lead:', error);
        alert('Erro ao atualizar estágio do lead. Por favor, tente novamente.');
        loadLeads(); // Recarrega todos os leads para garantir a consistência
    }
}

async function updateLeadStatus(leadId, newStatus) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/leads/${leadId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
            throw new Error('Falha ao atualizar status do lead');
        }

        // Recarregar leads após atualização bem-sucedida
        loadLeads();
    } catch (error) {
        console.error('Erro ao atualizar status do lead:', error);
        alert('Erro ao atualizar status do lead. Por favor, tente novamente.');
    }
}

async function deleteLead(leadId) {
    if (!confirm('Tem certeza que deseja excluir este lead?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/leads/${leadId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        if (response.ok) {
            loadLeads(); // Recarrega a lista de leads
            alert('Lead excluído com sucesso!');
        } else {
            console.error('Erro ao excluir lead:', data.error);
            alert('Erro ao excluir lead. Por favor, tente novamente.');
        }
    } catch (error) {
        console.error('Erro ao excluir lead:', error);
        alert('Erro ao excluir lead. Por favor, tente novamente.');
    }
}

function populateForm(lead) {
    const form = document.getElementById('lead-form');
    form.setAttribute('data-lead-id', lead._id);
    
    form.elements.name.value = lead.name;
    form.elements.email.value = lead.email;
    form.elements.phone.value = lead.phone;
    form.elements.interest.value = lead.interest;
    form.elements.status.value = lead.status;
}

function showLeadDetails(lead) {
    // Implemente uma modal ou painel lateral para mostrar detalhes do lead
    console.log('Detalhes do lead:', lead);
    // Aqui você pode abrir uma modal com mais informações e opções para editar o lead
}

function showStageActions(leadId) {
    const lead = allLeads.find(l => l._id === leadId);
    if (!lead) {
        console.error('Lead não encontrado');
        return;
    }

    const stageActions = {
        contatoInicial: [
            { name: 'Fazer primeira chamada', action: () => scheduleCall(lead) },
            { name: 'Enviar e-mail de boas-vindas', action: () => sendWelcomeEmail(lead) }
        ],
        visita: [
            { name: 'Agendar visita', action: () => scheduleVisit(lead) },
            { name: 'Preparar material de apresentação', action: () => preparePresentationMaterial(lead) }
        ],
        // Adicione ações para outros estágios conforme necessário
    };

    const actions = stageActions[lead.stage] || [];
    showActionsModal(actions, lead);
}

function showActionsModal(actions, lead) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Ações para ${lead.name}</h2>
            <ul>
                ${actions.map(action => `<li><button class="action-button" data-action="${action.name}">${action.name}</button></li>`).join('')}
            </ul>
            <button class="close-modal">Fechar</button>
        </div>
    `;
    document.body.appendChild(modal);

    // Adiciona event listeners para os botões de ação
    const actionButtons = modal.querySelectorAll('.action-button');
    actionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const actionName = button.getAttribute('data-action');
            const action = actions.find(a => a.name === actionName);
            if (action) {
                action.action();
                modal.remove();
            }
        });
    });

    // Adiciona event listener para o botão de fechar
    const closeButton = modal.querySelector('.close-modal');
    closeButton.addEventListener('click', () => modal.remove());
}

// Funções para cada ação específica
function scheduleCall(lead) {
    console.log(`Agendando chamada para ${lead.name}`);
    alert(`Chamada agendada para ${lead.name}`);
    // Implemente a lógica para agendar uma chamada
}

function sendWelcomeEmail(lead) {
    console.log(`Enviando e-mail de boas-vindas para ${lead.email}`);
    alert(`E-mail de boas-vindas enviado para ${lead.email}`);
    // Implemente a lógica para enviar e-mail de boas-vindas
}

function scheduleVisit(lead) {
    console.log(`Agendando visita para ${lead.name}`);
    alert(`Visita agendada para ${lead.name}`);
    // Implemente a lógica para agendar uma visita
}

function preparePresentationMaterial(lead) {
    console.log(`Preparando material de apresentação para ${lead.name}`);
    alert(`Material de apresentação preparado para ${lead.name}`);
    // Implemente a lógica para preparar material de apresentação
}

// Torna as funções disponíveis globalmente
window.showStageActions = showStageActions;
window.showLeadDetails = showLeadDetails;
window.closeForm = closeForm;