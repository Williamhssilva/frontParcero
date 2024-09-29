import { API_BASE_URL } from './config.js';
import { renderMenu } from './menu.js';
import { getCurrentUser, checkPermission, logout } from './auth.js';

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded iniciado');
    renderMenu();
    checkPermission(['administrador']);
    loadDashboardData();
    loadPendingAgents();
    
    // Adicione este event listener
    document.body.addEventListener('click', function(e) {
        if (e.target.closest('a') && e.target.textContent.includes('Sair')) {
            e.preventDefault();
            logout();
        }
    });
    
    console.log('DOMContentLoaded finalizado');
});

async function loadDashboardData() {
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.style.display = 'block';

    try {
        console.log('Iniciando loadDashboardData');
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('Token não encontrado');
            throw new Error('Token não encontrado');
        }
        console.log('Token encontrado');

        console.log('Iniciando fetch para', `${API_BASE_URL}/api/admin/dashboard`);
        const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('Resposta recebida', response);

        if (!response.ok) {
            console.log('Resposta não ok:', response.status, response.statusText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Dados do dashboard:', data);

        if (data.success) {
            console.log('Atualizando UI');
            updateDashboardUI(data.data);
        } else {
            console.log('Dados inválidos:', data);
            throw new Error('Formato de dados inválido');
        }
    } catch (error) {
        console.error('Erro detalhado ao carregar dados do dashboard:', error);
        // Não exibir alerta aqui, apenas registrar o erro
    } finally {
        loadingIndicator.style.display = 'none';
        console.log('Finalizando loadDashboardData');
    }
}

async function loadPendingAgents() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/users/pending-agents`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        console.log('Dados recebidos de pending-agents:', result);
        if (response.ok && result.status === 'success') {
            displayPendingAgents(result.data.pendingAgents || []); // Assumindo que os agentes estão em data.pendingAgents
        } else {
            throw new Error(result.message || 'Erro ao carregar corretores pendentes');
        }
    } catch (error) {
        console.error('Erro ao carregar corretores pendentes:', error);
    }
}

function displayPendingAgents(agents) {
    const container = document.getElementById('pending-agents-container');
    container.innerHTML = `
        <div class="dashboard-card">
            <h3>Corretores Pendentes de Aprovação</h3>
            <p class="dashboard-number">${agents.length}</p>
            <ul id="pending-agents-list" class="dashboard-list"></ul>
        </div>
    `;
    
    const list = document.getElementById('pending-agents-list');
    
    if (!Array.isArray(agents) || agents.length === 0) {
        list.innerHTML = '<li>Não há corretores pendentes de aprovação</li>';
    } else {
        agents.forEach(agent => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${agent.name} (${agent.email})</span>
                <div class="button-group">
                    <button onclick="approveAgent('${agent._id}')" class="btn btn-success">Aprovar</button>
                    <button onclick="rejectAgent('${agent._id}')" class="btn btn-danger">Recusar</button>
                </div>
            `;
            list.appendChild(li);
        });
    }
}

window.approveAgent = async function(agentId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/users/approve-agent/${agentId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        if (response.ok && result.status === 'success') {
            alert('Corretor aprovado com sucesso');
            loadPendingAgents();
            loadDashboardData();
        } else {
            throw new Error(result.message || 'Erro ao aprovar corretor');
        }
    } catch (error) {
        console.error('Erro ao aprovar corretor:', error);
        alert('Erro ao aprovar corretor');
    }
};

window.rejectAgent = async function(agentId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/users/reject-agent/${agentId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        if (response.ok && result.status === 'success') {
            alert('Corretor recusado com sucesso');
            loadPendingAgents();
            loadDashboardData();
        } else {
            throw new Error(result.message || 'Erro ao recusar corretor');
        }
    } catch (error) {
        console.error('Erro ao recusar corretor:', error);
        alert('Erro ao recusar corretor');
    }
};

function updateDashboardUI(dashboardData) {
    if (dashboardData.totalProperties !== undefined) {
        document.querySelector('#total-properties .dashboard-number').textContent = dashboardData.totalProperties;
    }
    if (dashboardData.totalLeads !== undefined) {
        document.querySelector('#total-leads .dashboard-number').textContent = dashboardData.totalLeads;
    }
    if (dashboardData.totalAgents !== undefined) {
        document.querySelector('#total-agents .dashboard-number').textContent = dashboardData.totalAgents;
    }
    if (dashboardData.pendingApprovals !== undefined) {
        document.querySelector('#pending-approvals .dashboard-number').textContent = dashboardData.pendingApprovals;
    }

    if (dashboardData.propertiesByType) {
        updatePropertiesChart(dashboardData.propertiesByType);
    }
    if (dashboardData.leadsByStatus) {
        updateLeadsChart(dashboardData.leadsByStatus);
    }
    if (dashboardData.recentActivities) {
        updateRecentActivities(dashboardData.recentActivities);
    }
}

function updatePropertiesChart(propertiesByType) {
    const canvas = document.getElementById('properties-chart');
    if (!canvas) {
        console.error('Elemento canvas "properties-chart" não encontrado');
        return;
    }

    const ctx = canvas.getContext('2d');
    // Verifique se já existe um gráfico neste canvas
    if (window.propertiesChart instanceof Chart) {
        window.propertiesChart.destroy();
    }

    window.propertiesChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(propertiesByType),
            datasets: [{
                data: Object.values(propertiesByType),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                ]
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: 'Propriedades por Tipo'
            }
        }
    });
}

function updateLeadsChart(leadsByStatus) {
    const canvas = document.getElementById('leads-chart');
    if (!canvas) {
        console.error('Elemento canvas "leads-chart" não encontrado');
        return;
    }

    const ctx = canvas.getContext('2d');
    // Verifique se já existe um gráfico neste canvas
    if (window.leadsChart instanceof Chart) {
        window.leadsChart.destroy();
    }

    window.leadsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(leadsByStatus),
            datasets: [{
                label: 'Leads por Status',
                data: Object.values(leadsByStatus),
                backgroundColor: 'rgba(75, 192, 192, 0.8)',
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateRecentActivities(activities) {
    const recentActivitiesList = document.getElementById('recent-activities-list');
    recentActivitiesList.innerHTML = '';
    activities.forEach(activity => {
        const li = document.createElement('li');
        li.textContent = `${activity.user} ${activity.action} ${activity.target} em ${new Date(activity.date).toLocaleString()}`;
        recentActivitiesList.appendChild(li);
    });
}

window.logout = logout;