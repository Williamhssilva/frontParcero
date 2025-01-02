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
        initializeDraggableScroll(); 
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
        if (!response.ok) {
            throw new Error('Falha ao carregar leads');
        }
        const data = await response.json();

        if (response.ok) {
            allLeads = data.data;
            await updateLeadsWithPropertyDetails(allLeads);
            displayLeadsInFunnel(allLeads);
        } else {
            console.error('Erro ao carregar leads:', data.error);
        }
    } catch (error) {
        console.error('Erro ao carregar leads:', error);
        showNotification('Erro ao carregar leads. Por favor, tente novamente.', 'error');
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
    card.id = `lead-${lead._id}`;
    card.setAttribute('data-id', lead._id);

    let linkedPropertyHtml = '';
    if (lead.linkedProperty) {
        linkedPropertyHtml = `
            <div class="linked-property-container">
                <i class="fas fa-home linked-property-icon" 
                   data-property-id="${lead.linkedProperty}" 
                   data-tooltip="Carregando..."></i>
                <button class="unlink-property-btn" data-tooltip="Desvincular imóvel">
                    <i class="fas fa-unlink"></i>
                </button>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="lead-card-header">
            <h3 class="lead-name">${lead.name} ${linkedPropertyHtml}</h3>
        </div>
        <div class="lead-card-body">
            <p class="lead-email"><i class="fas fa-envelope"></i> ${lead.email}</p>
            <p class="lead-phone"><i class="fas fa-phone"></i> ${lead.phone}</p>
            <p class="lead-interest"><i class="fas fa-info-circle"></i> ${lead.interest}</p>
        </div>
        <div class="lead-card-footer">
            <button class="btn-actions" onclick="showStageActions('${lead._id}')">Ações</button>
        </div>
    `;

    // Adicionar event listeners
    if (lead.linkedProperty) {
        const icon = card.querySelector('.linked-property-icon');
        const unlinkButton = card.querySelector('.unlink-property-btn');

        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = `property-details.html?id=${lead.linkedProperty}`;
        });

        unlinkButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Tem certeza que deseja desvincular este imóvel?')) {
                unlinkProperty(lead._id);
            }
        });

        // Buscar detalhes da propriedade
        fetchPropertyDetails(lead.linkedProperty)
            .then(propertyDetails => {
                if (propertyDetails) {
                    const tooltipText = `${propertyDetails.title || 'Sem título'} - ${formatPrice(propertyDetails.salePrice)}`;
                    icon.setAttribute('data-tooltip', tooltipText);
                } else {
                    icon.setAttribute('data-tooltip', 'Detalhes não disponíveis');
                }
            })
            .catch(error => {
                console.error('Erro ao buscar detalhes da propriedade:', error);
                icon.setAttribute('data-tooltip', 'Erro ao carregar detalhes');
            });
    }

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

        // Limpar os campos do formulário
        form.reset();

    } catch (error) {
        console.error('Erro ao adicionar lead:', error);
        showNotification('Erro ao adicionar lead. Por favor, tente novamente.', 'error');
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
            { name: 'Vincular Imóvel', action: () => openPropertySearchModal(leadId) },
            { name: 'Documentos', action: () => showDocumentsModal(leadId) }
        ],
        visita: [
            { name: 'Excluir', action: () => deleteLead(leadId) },
            { name: 'Editar', action: () => showEditLeadForm(leadId) },
            { name: 'Agendar visita', action: () => scheduleVisit(lead) },
            { name: 'Preparar material de apresentação', action: () => preparePresentationMaterial(lead) },
            { name: 'Vincular Imóvel', action: () => openPropertySearchModal(leadId) },
            { name: 'Documentos', action: () => showDocumentsModal(leadId) }
        ],
        negociacao: [
            { name: 'Excluir', action: () => deleteLead(leadId) },
            { name: 'Editar', action: () => showEditLeadForm(leadId) },
            { name: 'Enviar proposta', action: () => sendProposal(lead) },
            { name: 'Vincular Imóvel', action: () => openPropertySearchModal(leadId) },
            { name: 'Documentos', action: () => showDocumentsModal(leadId) }
        ],
        qualificacao: [
            { name: 'Excluir', action: () => deleteLead(leadId) },
            { name: 'Editar', action: () => showEditLeadForm(leadId) },
            { name: 'Marcar como qualificado', action: () => markAsQualified(lead) },
            { name: 'Vincular Imóvel', action: () => openPropertySearchModal(leadId) },
            { name: 'Documentos', action: () => showDocumentsModal(leadId) }
        ],
        apresentacao: [
            { name: 'Excluir', action: () => deleteLead(leadId) },
            { name: 'Editar', action: () => showEditLeadForm(leadId) },
            { name: 'Marcar como apresentado', action: () => markAsPresented(lead) },
            { name: 'Vincular Imóvel', action: () => openPropertySearchModal(leadId) },
            { name: 'Documentos', action: () => showDocumentsModal(leadId) }
        ],
        contrato: [
            { name: 'Excluir', action: () => deleteLead(leadId) },
            { name: 'Editar', action: () => showEditLeadForm(leadId) },
            { name: 'Marcar como contrato assinado', action: () => markAsContractSigned(lead) },
            { name: 'Vincular Imóvel', action: () => openPropertySearchModal(leadId) },
            { name: 'Documentos', action: () => showDocumentsModal(leadId) }
        ],
        concluido: [
            { name: 'Excluir', action: () => deleteLead(leadId) },
            { name: 'Editar', action: () => showEditLeadForm(leadId) },
            { name: 'Marcar como concluído', action: () => markAsCompleted(lead) },
            { name: 'Vincular Imóvel', action: () => openPropertySearchModal(leadId) },
            { name: 'Documentos', action: () => showDocumentsModal(leadId) }
        ],
        posvenda: [
            { name: 'Excluir', action: () => deleteLead(leadId) },
            { name: 'Editar', action: () => showEditLeadForm(leadId) },
            { name: 'Marcar como proposta enviada', action: () => markAsProposalSent(lead) },
            { name: 'Vincular Imóvel', action: () => openPropertySearchModal(leadId) },
            { name: 'Documentos', action: () => showDocumentsModal(leadId) }
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

    // Adiciona event listener para fechar ao clicar fora da modal
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.remove();
        }
    });
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

        // Atualizar o lead na lista allLeads
        const index = allLeads.findIndex(l => l._id === updatedLead.data._id);
        if (index !== -1) {
            allLeads[index] = updatedLead.data;
            allLeads[index].linkedPropertyDetails = property;
        }

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
        const headerElement = leadElement.querySelector('.lead-card-header');
        if (headerElement) {
            // Atualizar o nome do lead
            const nameElement = headerElement.querySelector('.lead-name');
            nameElement.textContent = lead.name;

            // Remover o container de propriedade existente, se houver
            const existingContainer = headerElement.querySelector('.linked-property-container');
            if (existingContainer) {
                existingContainer.remove();
            }

            // Adicionar o novo container de propriedade, se necessário
            if (lead.linkedProperty) {
                const propertyContainer = document.createElement('div');
                propertyContainer.className = 'linked-property-container';
                propertyContainer.innerHTML = `
                    <i class="fas fa-home linked-property-icon" 
                       data-property-id="${lead.linkedProperty}" 
                       data-tooltip="Carregando..."></i>
                    <button class="unlink-property-btn" data-tooltip="Desvincular imóvel">
                        <i class="fas fa-unlink"></i>
                    </button>
                `;
                nameElement.appendChild(propertyContainer);

                const icon = propertyContainer.querySelector('.linked-property-icon');
                const unlinkButton = propertyContainer.querySelector('.unlink-property-btn');

                icon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.location.href = `property-details.html?id=${lead.linkedProperty}`;
                });

                unlinkButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm('Tem certeza que deseja desvincular este imóvel?')) {
                        unlinkProperty(lead._id);
                    }
                });

                // Buscar detalhes da propriedade
                fetchPropertyDetails(lead.linkedProperty)
                    .then(propertyDetails => {
                        if (propertyDetails) {
                            const tooltipText = `${propertyDetails.title || 'Sem título'} - ${formatPrice(propertyDetails.salePrice)}`;
                            icon.setAttribute('data-tooltip', tooltipText);
                        } else {
                            icon.setAttribute('data-tooltip', 'Detalhes não disponíveis');
                        }
                    })
                    .catch(error => {
                        console.error('Erro ao buscar detalhes da propriedade:', error);
                        icon.setAttribute('data-tooltip', 'Erro ao carregar detalhes');
                    });
            }

            // Atualizar outros detalhes do lead...
            leadElement.querySelector('.lead-email').textContent = lead.email;
            leadElement.querySelector('.lead-phone').textContent = lead.phone;
            leadElement.querySelector('.lead-interest').textContent = lead.interest;
        }
    }
}

function fetchPropertyDetails(propertyId) {
    return fetch(`${API_BASE_URL}/api/properties/${propertyId}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Falha ao buscar detalhes do imóvel');
        }
        return response.json();
    })
    .then(data => data.data.property)
    .catch(error => {
        console.error('Erro ao buscar detalhes do imóvel:', error);
        return null;
    });
}

async function updateLeadsWithPropertyDetails(leads) {
    const leadsWithProperties = leads.filter(lead => lead.linkedProperty);
    const propertyPromises = leadsWithProperties.map(lead => 
        fetchPropertyDetails(lead.linkedProperty)
            .then(propertyDetails => {
                if (propertyDetails) {
                    lead.linkedPropertyDetails = propertyDetails;
                }
                return lead;
            })
    );
    return Promise.all(propertyPromises);
}

async function unlinkProperty(leadId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/leads/${leadId}/unlink-property`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha ao desvincular imóvel');
        }

        const updatedLead = await response.json();
        console.log('Lead atualizado:', updatedLead);

        // Atualizar o lead na lista allLeads
        const index = allLeads.findIndex(l => l._id === updatedLead.data._id);
        if (index !== -1) {
            allLeads[index] = updatedLead.data;
        }

        updateLeadUI(updatedLead.data);
        showNotification('Imóvel desvinculado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao desvincular imóvel:', error);
        showNotification('Erro ao desvincular imóvel. Tente novamente.', 'error');
    }
}

function showDocumentsModal(leadId) {
    currentLead = { _id: leadId };
    const modal = document.getElementById('documents-modal');
    const documentsList = modal.querySelector('.documents-list');
    
    // Limpar lista e mostrar loading
    documentsList.innerHTML = '<div class="loading">Carregando documentos...</div>';
    modal.style.display = 'block';

    // Configurar o formulário
    const form = document.getElementById('document-upload-form');
    form.onsubmit = async function(e) {
        e.preventDefault();
        await handleDocumentUpload(e, leadId);
    };

    // Carregar documentos existentes
    loadDocuments(leadId);

    // Configurar fechamento da modal
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';

    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

async function loadDocuments(leadId) {
    const documentsList = document.querySelector('.documents-list');
    
    try {
        documentsList.innerHTML = '<div class="loading">Carregando documentos...</div>';

        const response = await fetch(`${API_BASE_URL}/api/leads/${leadId}/documents`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar documentos');
        }

        const data = await response.json();
        console.log('Documentos carregados:', data); // Log para debug
        
        if (!data.data || data.data.length === 0) {
            documentsList.innerHTML = `
                <div class="no-documents">
                    <i class="fas fa-file-alt"></i>
                    <p>Nenhum documento encontrado</p>
                </div>`;
            return;
        }

        documentsList.innerHTML = '';
        data.data.forEach(doc => {
            const docElement = createDocumentElement(doc);
            documentsList.appendChild(docElement);
        });

    } catch (error) {
        console.error('Erro ao carregar documentos:', error);
        documentsList.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-circle"></i>
                <p>${error.message}</p>
            </div>`;
    }
}

// Adicionar constantes para tipos de arquivo
const ALLOWED_FILE_TYPES = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.ms-excel': 'XLS',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'text/plain': 'TXT'
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function handleDocumentUpload(e, leadId) {
    e.preventDefault();
    
    const form = e.target;
    const fileInput = form.querySelector('input[type="file"]');
    const documentTypeSelect = form.querySelector('select[name="documentType"]');
    const submitButton = form.querySelector('button[type="submit"]');
    
    try {
        // Validações
        if (!fileInput.files[0]) {
            throw new Error('Por favor, selecione um arquivo');
        }

        if (!documentTypeSelect.value) {
            throw new Error('Por favor, selecione o tipo do documento');
        }

        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        const formData = new FormData();
        formData.append('document', fileInput.files[0]);
        formData.append('documentType', documentTypeSelect.value);

        console.log('Enviando arquivo:', {
            fileName: fileInput.files[0].name,
            fileSize: fileInput.files[0].size,
            fileType: fileInput.files[0].type,
            documentType: documentTypeSelect.value
        });

        const response = await fetch(`${API_BASE_URL}/api/leads/${leadId}/documents`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao enviar documento');
        }

        const result = await response.json();
        console.log('Resposta do servidor:', result);

        // Recarregar a lista de documentos
        await loadDocuments(leadId);
        
        // Limpar o formulário
        form.reset();
        showNotification('Documento enviado com sucesso', 'success');

    } catch (error) {
        console.error('Erro ao enviar documento:', error);
        showNotification(error.message, 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Enviar Documento';
    }
}

function createDocumentElement(doc) {
    const docElement = document.createElement('div');
    docElement.className = 'document-item';
    
    const date = new Date(doc.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Determinar o ícone baseado no tipo de arquivo
    let fileIcon = 'fa-file';
    const extension = doc.name.split('.').pop().toLowerCase();
    
    switch(extension) {
        case 'pdf':
            fileIcon = 'fa-file-pdf';
            break;
        case 'doc':
        case 'docx':
            fileIcon = 'fa-file-word';
            break;
        case 'xls':
        case 'xlsx':
            fileIcon = 'fa-file-excel';
            break;
        case 'jpg':
        case 'jpeg':
        case 'png':
            fileIcon = 'fa-file-image';
            break;
    }
    
    docElement.innerHTML = `
        <div class="document-info">
            <i class="fas ${fileIcon}"></i>
            <div class="document-details">
                <strong class="document-name" title="${doc.originalName}">${doc.originalName}</strong>
                <span class="document-type">${doc.type}</span>
                <span class="document-date">${date}</span>
            </div>
        </div>
        <div class="document-actions">
            <button onclick="downloadDocument('${doc._id}')" class="btn-download" title="Download">
                <i class="fas fa-download"></i>
            </button>
            <button onclick="deleteDocument('${doc._id}')" class="btn-delete" title="Excluir">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    return docElement;
}

// Função para visualizar imagens
async function previewImage(documentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/leads/${currentLead._id}/documents/${documentId}/download`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar imagem');
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);

        // Criar modal de preview
        const previewModal = document.createElement('div');
        previewModal.className = 'modal preview-modal';
        previewModal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <img src="${imageUrl}" alt="Preview" style="max-width: 100%; max-height: 80vh;">
            </div>
        `;

        document.body.appendChild(previewModal);
        previewModal.style.display = 'block';

        // Configurar fechamento
        const closeBtn = previewModal.querySelector('.close');
        closeBtn.onclick = () => {
            URL.revokeObjectURL(imageUrl);
            previewModal.remove();
        };

        window.onclick = (event) => {
            if (event.target === previewModal) {
                URL.revokeObjectURL(imageUrl);
                previewModal.remove();
            }
        };

    } catch (error) {
        console.error('Erro ao visualizar imagem:', error);
        showNotification('Erro ao visualizar imagem', 'error');
    }
}

// Tornar funções disponíveis globalmente
window.showDocumentsModal = showDocumentsModal;
window.downloadDocument = downloadDocument;
window.previewImage = previewImage;

async function downloadDocument(documentId) {
    try {
        console.log('Iniciando download do documento:', documentId);
        
        const response = await fetch(`${API_BASE_URL}/api/leads/${currentLead._id}/documents/${documentId}/download`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao baixar documento');
        }

        // Log dos headers para debug
        console.log('Headers da resposta:', Object.fromEntries(response.headers.entries()));

        const contentDisposition = response.headers.get('content-disposition');
        console.log('Content-Disposition:', contentDisposition);

        let fileName = 'documento';
        
        if (contentDisposition) {
            // Primeiro tenta o formato UTF-8
            const filenameUtf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
            if (filenameUtf8Match) {
                fileName = decodeURIComponent(filenameUtf8Match[1]);
            } else {
                // Tenta o formato padrão
                const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
                if (filenameMatch) {
                    fileName = filenameMatch[1];
                }
            }
        }

        console.log('Nome do arquivo para download:', fileName);

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        a.remove();

        showNotification('Download iniciado', 'success');

    } catch (error) {
        console.error('Erro ao baixar documento:', error);
        showNotification('Erro ao baixar documento', 'error');
    }
}

// Tornar a função disponível globalmente
window.downloadDocument = downloadDocument;

async function deleteDocument(documentId) {
    if (!confirm('Tem certeza que deseja excluir este documento?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/leads/${currentLead._id}/documents/${documentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao excluir documento');
        }

        showNotification('Documento excluído com sucesso', 'success');
        await loadDocuments(currentLead._id);

    } catch (error) {
        console.error('Erro ao excluir documento:', error);
        showNotification('Erro ao excluir documento', 'error');
    }
}

// Tornar função disponível globalmente
window.deleteDocument = deleteDocument;

