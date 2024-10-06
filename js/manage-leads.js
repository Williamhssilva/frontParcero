import { API_BASE_URL } from './config.js';
import { renderMenu } from './menu.js';

// Remova ou comente esta linha, pois estamos importando API_BASE_URL acima
// const API_BASE_URL = 'http://localhost:5000';

import { getCurrentUser, checkPermission } from './auth.js';

let allLeads = []; // Armazenará todos os leads
let currentLead = null; // Variável global para armazenar o lead atual

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
            group: 'shared', // Permite arrastar entre diferentes listas
            animation: 150, // Duração da animação de arrastar em milissegundos
            ghostClass: 'sortable-ghost',  // Classe para o elemento fantasma durante o arrasto
            chosenClass: 'sortable-chosen',  // Classe para o elemento escolhido
            dragClass: 'sortable-drag',  // Classe para o elemento sendo arrastado
            onEnd: function (evt) {
                const leadId = evt.item.getAttribute('data-id');
                const newStage = evt.to.getAttribute('data-stage');
                const newIndex = evt.newIndex;
                updateLeadStage(leadId, newStage, newIndex);
            },
            // Opções para melhorar o comportamento do arrasto
            forceFallback: false,  // Desativa o fallback para melhorar o desempenho
            fallbackTolerance: 0,  // Reduz a tolerância para iniciar o arrasto
            fallbackOnBody: false, // Desativa para melhorar o desempenho
            swapThreshold: 1,      // Ajusta para permitir soltar em qualquer lugar
            direction: 'vertical'  // Garante que o arrasto seja vertical
        });
    });
}

function initializeDraggableScroll() {
    const salesFunnel = document.querySelector('.sales-funnel-container');
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
        const walk = (x - startX) * 2;
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

    const closeButton = document.querySelector('.close');
    if (closeButton) {
        closeButton.addEventListener('click', closeAddLeadForm);
    }

    const leadForm = document.getElementById('lead-form');
    if (leadForm) {
        leadForm.addEventListener('submit', handleFormSubmit);
    } else {
        console.error('Elemento com ID "lead-form" não encontrado');
    }
    const editLeadForm = document.getElementById('edit-lead-form');
    if (editLeadForm) {
        editLeadForm.addEventListener('submit', handleEditFormSubmit);
    } else {
        console.error('Elemento com ID "edit-lead-form" não encontrado');
    }
    // Fechar a modal se clicar fora dela
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('lead-modal');
        if (event.target === modal) {
            closeAddLeadForm();
        }
    });

    document.getElementById('search-leads').addEventListener('input', filterLeads);
    document.getElementById('stage-filter').addEventListener('change', filterLeads);
    document.getElementById('status-filter').addEventListener('change', filterLeads);
    document.getElementById('interest-filter').addEventListener('change', filterLeads);

    // Adicionar event listeners para fechar modais
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const modalId = modal.id;
        const closeButton = modal.querySelector('.close');
        if (closeButton) {
            closeButton.addEventListener('click', () => closeModal(modalId));
        }

        // Fechar modal ao clicar fora dela
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal(modalId);
            }
        });
    });

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
    const stages = ['novo', 'contatoInicial', 'qualificacao', 'apresentacao', 'visita', 'negociacao', 'proposta', 'contrato', 'concluido'];
    
    stages.forEach(stage => {
        const stageElement = document.querySelector(`.stage-leads[data-stage="${stage}"]`);
        if (stageElement) {
            stageElement.innerHTML = '';
            const stageLeads = leads.filter(lead => lead.stage === stage);
            
            // Ordena os leads por posição
            stageLeads.sort((a, b) => a.position - b.position);
            
            stageLeads.forEach((lead, index) => {
                lead.position = index; // Garante que as posições sejam sequenciais
                const leadCard = createLeadCard(lead);
                stageElement.appendChild(leadCard);
            });
        }
    });
}

function createLeadCard(lead) {
    const card = document.createElement('div');
    card.className = 'lead-card';
    card.setAttribute('data-id', lead._id);
    card.innerHTML = `
        <div class="lead-card-header">
            <h4 class="lead-name">${lead.name}</h4>
            <span class="lead-stage">${lead.stage}</span>
        </div>
        <div class="lead-card-body">
            <a href="tel:${lead.phone}" class="lead-phone">
                <i class="fas fa-phone"></i> ${lead.phone}
            </a>
            <p class="lead-email">
                <i class="fas fa-envelope"></i> ${lead.email}
            </p>
            <p class="lead-interest">
                <i class="fas fa-home"></i> ${lead.interest}
            </p>
        </div>
        <div class="lead-card-footer">
            <button class="btn btn-actions">Ações</button>
        </div>
    `;
    const actionButton = card.querySelector('.btn-actions');
    actionButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Impede que o evento de clique se propague para o card
        showStageActions(lead._id);
    });
    card.addEventListener('click', () => {
        currentLead = lead; // Define o lead atual quando o card é clicado
        showLeadDetails(lead);
    });

    // Adiciona evento de clique ao número de telefone
    const phoneElement = card.querySelector('.lead-phone');
    phoneElement.addEventListener('click', (e) => {
        e.stopPropagation(); // Impede que o evento de clique se propague para o card
        currentLead = lead; // Atualiza o lead atual
        const currentUser = getCurrentUser();
        const corretorName = currentUser ? currentUser.name : "Corretor"; // Usa o nome do usuário atual ou "Corretor" como fallback
        const message = generateWhatsAppMessage(lead.name, corretorName);
        sendWhatsAppMessage(lead.phone, message);
    });

    return card;
}

function showAddLeadForm() {
    const modal = document.getElementById('lead-modal');
    modal.style.display = 'block';
}

function closeAddLeadForm() {
    closeModal('lead-modal');
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
            const form = document.getElementById('edit-lead-form');
            form.elements.name.value = lead.name;
            form.elements.email.value = lead.email;
            form.elements.phone.value = lead.phone;
            form.elements.interest.value = lead.interest;
            form.elements.status.value = lead.status;
            form.setAttribute('data-lead-id', lead._id);
            
            const modal = document.getElementById('edit-lead-modal');
            modal.style.display = 'block';
        } else {
            throw new Error(data.error || 'Erro desconhecido ao carregar lead');
        }
    } catch (error) {
        console.error('Erro ao carregar lead:', error);
        alert(`Erro ao carregar lead: ${error.message}`);
    }
}

function closeForm() {
    closeModal('lead-modal');
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    const newLead = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        interest: formData.get('interest'),
        stage: 'novo', // Definindo o estágio inicial como 'novo'
        status: 'novo' // Definindo o status inicial como 'novo'
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/leads`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(newLead)
        });

        if (!response.ok) {
            throw new Error('Falha ao adicionar lead');
        }

        const addedLead = await response.json();
        allLeads.push(addedLead.data);
        displayLeadsInFunnel(allLeads);
        closeAddLeadForm();
        alert('Lead adicionado com sucesso!');
    } catch (error) {
        console.error('Erro ao adicionar lead:', error);
        alert('Erro ao adicionar lead. Por favor, tente novamente.');
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

async function updateLeadStage(leadId, newStage, newIndex) {
    try {
        // Encontra o lead na lista local
        const leadIndex = allLeads.findIndex(lead => lead._id === leadId);
        if (leadIndex === -1) {
            throw new Error('Lead não encontrado na lista local');
        }

        const lead = allLeads[leadIndex];
        const oldStage = lead.stage;
        const oldIndex = lead.position;

        // Remove o lead da lista antiga
        allLeads.splice(leadIndex, 1);

        // Atualiza o lead
        lead.stage = newStage;
        lead.position = newIndex;

        // Reinsere o lead na nova posição
        allLeads.splice(newIndex, 0, lead);

        // Atualiza as posições dos outros leads no mesmo estágio
        allLeads.forEach((l, index) => {
            if (l.stage === newStage && l._id !== leadId) {
                if (newStage === oldStage) {
                    // Movendo dentro do mesmo estágio
                    if (newIndex < oldIndex) {
                        // Movendo para cima
                        if (l.position >= newIndex && l.position < oldIndex) {
                            l.position++;
                        }
                    } else {
                        // Movendo para baixo
                        if (l.position > oldIndex && l.position <= newIndex) {
                            l.position--;
                        }
                    }
                } else {
                    // Movendo para um novo estágio
                    if (l.position >= newIndex) {
                        l.position++;
                    }
                }
            }
        });

        // Atualiza a exibição imediatamente
        displayLeadsInFunnel(allLeads);

        // Envia a atualização para o servidor
        const response = await fetch(`${API_BASE_URL}/api/leads/${leadId}/stage`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ stage: newStage, position: newIndex, oldStage, oldPosition: oldIndex })
        });

        if (!response.ok) {
            throw new Error('Falha ao atualizar estágio do lead no servidor');
        }

        const updatedLead = await response.json();

        // Se a resposta do servidor for diferente do esperado, atualize novamente
        if (updatedLead.data.position !== newIndex || updatedLead.data.stage !== newStage) {
            allLeads[allLeads.findIndex(l => l._id === leadId)] = updatedLead.data;
            displayLeadsInFunnel(allLeads);
        }

    } catch (error) {
        console.error('Erro ao atualizar estágio do lead:', error);
        alert('Erro ao atualizar estágio do lead. A página será recarregada.');
        location.reload(); // Recarrega a página em caso de erro para garantir sincronização
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
    currentLead = lead; // Atualiza o lead atual
    console.log('Detalhes do lead:', lead);
    // Aqui você pode abrir uma modal com mais informações e opções para editar o lead
}

function showStageActions(leadId) {
    const lead = allLeads.find(l => l._id === leadId);
    if (!lead) {
        console.error('Lead não encontrado');
        return;
    }
    
    currentLead = lead; // Atualiza o lead atual

    const stageActions = {
        novo: [
            {name: 'Excluir', action: () => deleteLead(leadId)},
            {name: 'Editar', action: () => showEditLeadForm(leadId)}
        ],
        contatoInicial: [
            {name: 'Excluir', action: () => deleteLead(leadId)},
            {name: 'Editar', action: () => showEditLeadForm(leadId)},
            { name: 'Fazer primeira chamada', action: () => scheduleCall(lead) },
            { name: 'Enviar e-mail de boas-vindas', action: () => sendWelcomeEmail(lead) },
            { name: 'Enviar mensagem via WhatsApp', action: () => sendWhatsAppMessage(lead.phone, `Olá ${lead.name}, tudo bem?`) }
        ],
        visita: [
            {name: 'Excluir', action: () => deleteLead(leadId)},
            {name: 'Editar', action: () => showEditLeadForm(leadId)},
            { name: 'Agendar visita', action: () => scheduleVisit(lead) },
            { name: 'Preparar material de apresentação', action: () => preparePresentationMaterial(lead) }
        ],
        negociacao: [
            {name: 'Excluir', action: () => deleteLead(leadId)},
            {name: 'Editar', action: () => showEditLeadForm(leadId)},
            { name: 'Enviar proposta', action: () => sendProposal(lead) }
        ],
        qualificacao: [
            {name: 'Excluir', action: () => deleteLead(leadId)},
            {name: 'Editar', action: () => showEditLeadForm(leadId)},
            { name: 'Marcar como qualificado', action: () => markAsQualified(lead) }
        ],
        apresentacao: [
            {name: 'Excluir', action: () => deleteLead(leadId)},
            {name: 'Editar', action: () => showEditLeadForm(leadId)},
            { name: 'Marcar como apresentado', action: () => markAsPresented(lead) }
        ],
        proposta: [
            {name: 'Excluir', action: () => deleteLead(leadId)},
            {name: 'Editar', action: () => showEditLeadForm(leadId)},
            { name: 'Marcar como proposta enviada', action: () => markAsProposalSent(lead) }
        ],
        contrato: [
            {name: 'Excluir', action: () => deleteLead(leadId)},
            {name: 'Editar', action: () => showEditLeadForm(leadId)},
            { name: 'Marcar como contrato assinado', action: () => markAsContractSigned(lead) }
        ],
        concluido: [
            {name: 'Excluir', action: () => deleteLead(leadId)},
            {name: 'Editar', action: () => showEditLeadForm(leadId)},
            { name: 'Marcar como concluído', action: () => markAsCompleted(lead) }
        ]
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

function generateWhatsAppMessage(leadName, corretorName) {
    return `Olá ${leadName}! 👋

Espero que esteja tudo bem com você. Meu nome é ${corretorName}, sou corretor(a) imobiliário(a) e estou entrando em contato porque notei seu interesse em encontrar o imóvel ideal.

🏠 Estou aqui para ajudar você a encontrar a casa dos seus sonhos!

Gostaria de saber mais sobre o que você está procurando:

1. Que tipo de imóvel você tem em mente? (casa, apartamento, terreno)
2. Em qual região você prefere?
3. Qual é o seu orçamento aproximado?

Ficarei feliz em apresentar algumas opções que se encaixem perfeitamente nas suas necessidades.

Quando seria um bom momento para conversarmos mais sobre isso?

Aguardo seu retorno e estou à disposição para esclarecer qualquer dúvida! 😊

Atenciosamente,
${corretorName}`;
}

// Função para obter o lead atual
function getCurrentLead() {
    if (!currentLead) {
        console.warn('Nenhum lead selecionado atualmente.');
        return null;
    }
    return currentLead;
}

function sendWhatsAppMessage(phoneNumber, message) {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
}

async function handleEditFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const leadId = form.getAttribute('data-lead-id');
    const formData = new FormData(form);
    
    const updatedLead = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        interest: formData.get('interest'),
        status: formData.get('status')
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/leads/${leadId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(updatedLead)
        });

        if (!response.ok) {
            throw new Error('Falha ao atualizar lead');
        }

        const updatedLeadData = await response.json();
        const index = allLeads.findIndex(lead => lead._id === leadId);
        if (index !== -1) {
            allLeads[index] = updatedLeadData.data;
        }
        displayLeadsInFunnel(allLeads);
        closeEditLeadForm();
        alert('Lead atualizado com sucesso!');
    } catch (error) {
        console.error('Erro ao atualizar lead:', error);
        alert('Erro ao atualizar lead. Por favor, tente novamente.');
    }
}

function closeEditLeadForm() {
    closeModal('edit-lead-modal');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Torna as funções disponíveis globalmente
window.showStageActions = showStageActions;
window.showLeadDetails = showLeadDetails;
window.closeForm = closeForm;