import { API_BASE_URL } from './config.js';
import { getCurrentUser, checkPermission } from './auth.js';
import { renderMenu } from './menu.js';
import { authenticatedFetch } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    if (checkPermission(['corretor', 'administrador'])) {
        loadAgentDashboard();
    }
});

async function loadAgentDashboard() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/properties/agent/dashboard`);

        if (!response.ok) {
            throw new Error('Falha ao carregar o dashboard');
        }

        const data = await response.json();
        updateDashboardUIagn(data.data);
    } catch (error) {
        console.error('Erro ao carregar o dashboard:', error);
        alert('Erro ao carregar o dashboard. Por favor, tente novamente mais tarde.');
    }
}

function updateDashboardUIagn(dashboardData) {
    document.getElementById('total-properties').textContent = dashboardData.totalProperties;
    document.getElementById('active-properties').textContent = dashboardData.activeProperties;
    document.getElementById('sold-properties').textContent = dashboardData.soldProperties;
    document.getElementById('total-views').textContent = dashboardData.totalViews;
    document.getElementById('average-price').textContent = `R$ ${dashboardData.averagePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    updateRecentPropertiesTable(dashboardData.recentProperties);
    createPropertiesByTypeChart(dashboardData.propertiesByType);
    createPriceTrendChart(dashboardData.priceTrend);
}

function updateRecentPropertiesTable(recentProperties) {
    const recentPropertiesList = document.getElementById('recent-properties-list');
    recentPropertiesList.innerHTML = '';
    recentProperties.forEach(property => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${property.title}</td>
            <td>${property.type}</td>
            <td>R$ ${property.price.toLocaleString('pt-BR')}</td>
            <td>${property.status}</td>
            <td>
                <a href="edit-property.html?id=${property._id}" class="btn btn-secondary">Editar</a>
                <button class="btn btn-danger delete-btn" data-id="${property._id}">Excluir</button>
            </td>
        `;
        recentPropertiesList.appendChild(row);
    });
}

function createPropertiesByTypeChart(propertiesByType) {
    const ctx = document.getElementById('properties-by-type-chart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: propertiesByType.map(item => item._id),
            datasets: [{
                data: propertiesByType.map(item => item.count),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
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

function createPriceTrendChart(priceTrend) {
    const ctx = document.getElementById('price-trend-chart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Preço Médio',
                data: priceTrend.map(item => ({
                    x: new Date(item._id),
                    y: item.avgPrice
                })),
                borderColor: '#4CAF50',
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            month: 'MMM yyyy'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Data'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Preço (R$)'
                    }
                }
            }
        }
    });
}

function editProperty(id) {
    // Implementar a lógica de edição
    console.log(`Editar propriedade ${id}`);
}

function deleteProperty(id) {
    // Implementar a lógica de exclusão
    console.log(`Excluir propriedade ${id}`);
}