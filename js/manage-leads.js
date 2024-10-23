import { API_BASE_URL } from './config.js';
import { renderMenu, showNotification } from './menu.js';


import { getCurrentUser, checkPermission } from './auth.js';

let allLeads = []; // Armazenará todos os leads
let currentLead = null; // Variável global para armazenar o lead atual

document.addEventListener('DOMContentLoaded', function () {
    renderMenu();
    if (checkPermission(['corretor', 'administrador'])) {
        setupEventListeners();
        loadLeads();
        initializeSortable();
        initializeDraggableScroll(); // Adicione esta linha
    }
});

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

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
    try {
        const currentUser = getCurrentUser(); // Obtém o usuário atual
        let url = `${API_BASE_URL}/api/leads`; // URL base para a requisição

        // Se o usuário for um corretor, adicione um parâmetro para filtrar os leads
        if (currentUser.role === 'corretor') {
            url += `?agent=${currentUser.id}`; // Filtra leads pelo ID do corretor
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

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
    const stages = ['novo', 'qualificacao', 'apresentacao', 'visita', 'negociacao', 'contrato', 'concluido', 'posvenda'];
    stages.forEach(stage => {
        const stageElement = document.querySelector(`.stage-leads[data-stage="${stage}"]`);
        if (stageElement) {
            stageElement.innerHTML = ''; // Limpa os leads existentes
            const stageLeads = leads.filter(lead => lead.stage === stage);

            // Ordena os leads por posição
            stageLeads.sort((a, b) => a.position - b.position);

            const stageTitle = document.querySelector(`#${stage} h3`);
            
            if (stageTitle) {
                stageTitle.textContent = `${stage.charAt(0).toUpperCase() + stage.slice(1)} (${stageLeads.length})`;
            }

            // Adiciona os leads à coluna
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
            ${getCurrentUser().role === 'administrador' ? `<p class="lead-captured-by"><i class="fas fa-user"></i> Cadastrado por: ${lead.capturedByName}</p>` : ''}
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
        showNotification('Lead adicionado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao adicionar lead:', error);
        showNotification('Erro ao adicionar lead. Por favor, tente novamente.', 'error');
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
        showNotification(`Status do lead atualizado para ${newStatus}`, 'success');
    } catch (error) {
        console.error('Erro ao atualizar status do lead:', error);
        showNotification('Erro ao atualizar status do lead. Por favor, tente novamente.', 'error');
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

        showNotification(`Lead movido para o estágio ${newStage}`, 'success');
    } catch (error) {
        console.error('Erro ao atualizar estágio do lead:', error);
        showNotification('Erro ao atualizar estágio do lead. A página será recarregada.', 'error');
        setTimeout(() => location.reload(), 3000); // Recarrega após 3 segundos
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
            showNotification('Lead excluído com sucesso!', 'success');
        } else {
            console.error('Erro ao excluir lead:', data.error);
            showNotification('Erro ao excluir lead. Por favor, tente novamente.', 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir lead:', error);
        showNotification('Erro ao excluir lead. Por favor, tente novamente.', 'error');
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
            { name: 'Excluir', action: () => deleteLead(leadId) },
            { name: 'Editar', action: () => showEditLeadForm(leadId) },
            { name: 'Vincular Imóvel', action: () => openPropertySearchModal(leadId) }
        ],
        visita: [
            { name: 'Excluir', action: () => deleteLead(leadId) },
            { name: 'Editar', action: () => showEditLeadForm(leadId) },
            { name: 'Agendar visita', action: () => scheduleVisit(lead) },
            { name: 'Preparar material de apresentação', action: () => preparePresentationMaterial(lead) },
            { name: 'Vincular Imóvel', action: () => openPropertySearchModal(leadId) }
        ],
        negociacao: [
            { name: 'Excluir', action: () => deleteLead(leadId) },
            { name: 'Editar', action: () => showEditLeadForm(leadId) },
            { name: 'Enviar proposta', action: () => sendProposal(lead) },
            { name: 'Vincular Imóvel', action: () => openPropertySearchModal(leadId) }
        ],
        qualificacao: [
            { name: 'Excluir', action: () => deleteLead(leadId) },
            { name: 'Editar', action: () => showEditLeadForm(leadId) },
            { name: 'Marcar como qualificado', action: () => markAsQualified(lead) },
            { name: 'Vincular Imóvel', action: () => openPropertySearchModal(leadId) }
        ],
        apresentacao: [
            { name: 'Excluir', action: () => deleteLead(leadId) },
            { name: 'Editar', action: () => showEditLeadForm(leadId) },
            { name: 'Marcar como apresentado', action: () => markAsPresented(lead) },
            { name: 'Vincular Imóvel', action: () => openPropertySearchModal(leadId) }
        ],
        contrato: [
            { name: 'Excluir', action: () => deleteLead(leadId) },
            { name: 'Editar', action: () => showEditLeadForm(leadId) },
            { name: 'Marcar como contrato assinado', action: () => markAsContractSigned(lead) },
            { name: 'Vincular Imóvel', action: () => openPropertySearchModal(leadId) }
        ],
        concluido: [
            { name: 'Excluir', action: () => deleteLead(leadId) },
            { name: 'Editar', action: () => showEditLeadForm(leadId) },
            { name: 'Marcar como concluído', action: () => markAsCompleted(lead) },
            { name: 'Vincular Imóvel', action: () => openPropertySearchModal(leadId) }
        ],
        posvenda: [
            { name: 'Excluir', action: () => deleteLead(leadId) },
            { name: 'Editar', action: () => showEditLeadForm(leadId) },
            { name: 'Marcar como proposta enviada', action: () => markAsProposalSent(lead) },
            { name: 'Vincular Imóvel', action: () => openPropertySearchModal(leadId) }
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
    showNotification(`Chamada agendada para ${lead.name}`, 'success');
    // Implemente a lógica para agendar uma chamada
}

function sendWelcomeEmail(lead) {
    console.log(`Enviando e-mail de boas-vindas para ${lead.email}`);
    showNotification(`E-mail de boas-vindas enviado para ${lead.email}`, 'success');
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
        showNotification('Lead atualizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar lead:', error);
        showNotification('Erro ao atualizar lead. Por favor, tente novamente.', 'error');
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

function openPropertySearchModal(leadId) {
    const modal = document.getElementById('property-search-modal');
    modal.style.display = 'block';
    
    const searchInput = document.getElementById('property-search-input');
    searchInput.value = '';
    searchInput.focus();
    
    document.getElementById('property-search-results').innerHTML = '';
    
    // Armazenar o ID do lead atual para uso posterior
    currentLeadId = leadId;
}

let currentLeadId = null;

// Adicione esta função para fechar a modal
function closePropertySearchModal() {
    document.getElementById('property-search-modal').style.display = 'none';
}

// Adicione event listeners para a pesquisa de imóveis
document.getElementById('property-search-input').addEventListener('input', debounce(searchProperties, 300));

async function searchProperties(event) {
    console.log('Termo de busca recebido:', event.target.value);
    const searchTerm = event.target.value;
    if (searchTerm.length < 3) return;
    
    try {
        console.log('URL da busca:', `${API_BASE_URL}/api/properties/search?term=${encodeURIComponent(searchTerm)}`);
        const response = await fetch(`${API_BASE_URL}/api/properties/search?term=${encodeURIComponent(searchTerm)}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Falha ao buscar propriedades');
        }
        
        const data = await response.json();
        console.log('Dados recebidos:', data);
        displaySearchResults(data.data);
    } catch (error) {
        console.error('Erro ao buscar propriedades:', error);
    }
}

function formatPrice(price) {
    if (typeof price === 'number') {
        return 'R$ ' + price.toLocaleString('pt-BR');
    } else if (typeof price === 'string' && !isNaN(parseFloat(price))) {
        return 'R$ ' + parseFloat(price).toLocaleString('pt-BR');
    } else {
        return 'Preço não informado';
    }
}

function displaySearchResults(properties) {
    const resultsContainer = document.getElementById('property-search-results');
    resultsContainer.innerHTML = '';
    
    properties.forEach(property => {
        const propertyElement = document.createElement('div');
        propertyElement.className = 'property-item';
        propertyElement.textContent = `${property.title || 'Sem título'} - ${formatPrice(property.salePrice)}`;
        propertyElement.onclick = () => selectProperty(property);
        resultsContainer.appendChild(propertyElement);
    });
}

async function selectProperty(property) {
    try {
        console.log('Iniciando vinculação de propriedade:', property);
        const response = await fetch(`${API_BASE_URL}/api/leads/${currentLeadId}/link-property`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ propertyId: property._id })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha ao vincular imóvel');
        }
        
        const updatedLead = await response.json();
        console.log('Lead atualizado:', updatedLead);
        updateLeadUI(updatedLead.data);
        closePropertySearchModal();

        console.log('Chamando showNotification');
        showNotification('Imóvel vinculado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao vincular imóvel:', error);
        showNotification('Erro ao vincular imóvel. Tente novamente.', 'error');
    }
}

function updateLeadUI(lead) {
    const leadElement = document.getElementById(`lead-${lead._id}`);
    if (leadElement) {
        const linkedPropertyInfo = lead.linkedProperty ? 
            `<div class="linked-property">
                <strong>Imóvel vinculado:</strong> ${lead.linkedProperty.title || 'Sem título'}
                <br>Endereço: ${lead.linkedProperty.address || 'Não informado'}
                <br>Preço: R$ ${lead.linkedProperty.price ? lead.linkedProperty.price.toLocaleString('pt-BR') : 'Não informado'}
            </div>` : 
            '<div class="no-property">Nenhum imóvel vinculado</div>';

        const propertyInfoElement = leadElement.querySelector('.linked-property') || leadElement.querySelector('.no-property');
        if (propertyInfoElement) {
            propertyInfoElement.outerHTML = linkedPropertyInfo;
        } else {
            leadElement.insertAdjacentHTML('beforeend', linkedPropertyInfo);
        }
    }
}

function displayLeads(leads) {
    const columns = document.querySelectorAll('.column');
    columns.forEach(column => column.innerHTML = '');

    leads.forEach(lead => {
        const card = document.createElement('div');
        card.className = 'card';
        card.id = `lead-${lead._id}`;

        const linkedPropertyInfo = lead.linkedProperty ? 
            `<div class="linked-property">
                <strong>Imóvel vinculado:</strong> ${lead.linkedProperty.title || 'Sem título'}
                <br>Endereço: ${lead.linkedProperty.address || 'Não informado'}
                <br>Preço: R$ ${lead.linkedProperty.price ? lead.linkedProperty.price.toLocaleString('pt-BR') : 'Não informado'}
            </div>` : 
            '<div class="no-property">Nenhum imóvel vinculado</div>';

        card.innerHTML = `
            <h3>${lead.name}</h3>
            <p>Email: ${lead.email}</p>
            <p>Telefone: ${lead.phone}</p>
            ${linkedPropertyInfo}
            <button onclick="showLeadActions('${lead._id}')">Ações</button>
        `;

        const column = document.querySelector(`.${lead.stage}`);
        column.appendChild(card);
    });
}






