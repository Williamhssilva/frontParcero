import { API_BASE_URL } from './config.js';
import { renderMenu } from './menu.js';

// Remova ou comente esta linha, pois estamos importando API_BASE_URL acima
// const API_BASE_URL = 'http://localhost:5000';

import { getCurrentUser, checkPermission } from './auth.js';

document.addEventListener('DOMContentLoaded', function() {
    renderMenu();
    if (checkPermission(['corretor', 'administrador'])) {
        setupEventListeners();
        loadLeads();
    }
});

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
            displayLeads(data.data);
        } else {
            console.error('Erro ao carregar leads:', data.error);
        }
    } catch (error) {
        console.error('Erro ao carregar leads:', error);
    }
}

function displayLeads(leads) {
    console.log('Exibindo leads:', leads);
    const tableBody = document.getElementById('leads-table-body');
    if (tableBody) {
        tableBody.innerHTML = '';
        if (leads && leads.length > 0) {
            leads.forEach(lead => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${lead.name}</td>
                    <td>${lead.email}</td>
                    <td>${lead.phone}</td>
                    <td>${lead.interest}</td>
                    <td>${lead.status}</td>
                    <td>
                        <button class="edit-lead" data-id="${lead._id}">Editar</button>
                        <button class="delete-lead" data-id="${lead._id}">Excluir</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            
            // Adicionar event listeners para os botões de editar e excluir
            document.querySelectorAll('.edit-lead').forEach(button => {
                button.addEventListener('click', () => showEditLeadForm(button.dataset.id));
            });
            document.querySelectorAll('.delete-lead').forEach(button => {
                button.addEventListener('click', () => deleteLead(button.dataset.id));
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="6">Nenhum lead encontrado</td></tr>';
        }
    } else {
        console.error('Elemento com ID "leads-table-body" não encontrado');
    }
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