import { API_BASE_URL } from './config.js';
import { getCurrentUser, checkPermission } from './auth.js';
import { renderMenu } from './menu.js';

document.addEventListener('DOMContentLoaded', () => {
    checkPermission(['corretor', 'administrador']);
    loadProperties();
    setupEventListeners();
});

async function loadProperties() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/properties`);
        const data = await response.json();

        if (data.status === 'success') {
            displayProperties(data.data.properties);
        } else {
            throw new Error(data.message || 'Erro ao carregar propriedades');
        }
    } catch (error) {
        console.error('Erro ao carregar propriedades:', error);
        alert('Erro ao carregar propriedades. Por favor, tente novamente.');
    }
}

function displayProperties(properties) {
    const propertyList = document.getElementById('property-list');
    propertyList.innerHTML = '';

    properties.forEach(property => {
        const propertyElement = document.createElement('div');
        propertyElement.className = 'property-item';
        propertyElement.innerHTML = `
            <h3>${property.title}</h3>
            <p>Preço: R$ ${property.price.toLocaleString('pt-BR')}</p>
            <p>Tipo: ${property.type}</p>
            <button class="edit-btn" data-id="${property._id}">Editar</button>
            <button class="delete-btn" data-id="${property._id}">Excluir</button>
        `;
        propertyList.appendChild(propertyElement);
    });
    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById('add-property-btn').addEventListener('click', showAddPropertyForm);
    document.getElementById('property-list').addEventListener('click', handlePropertyAction);
}

function showAddPropertyForm() {
    // Implementar lógica para mostrar o formulário de adição de propriedade
    alert('Funcionalidade de adicionar propriedade será implementada em breve!');
}

window.handlePropertyAction = function handlePropertyAction(event) {
    if (event.target.classList.contains('edit-btn')) {
        const propertyId = event.target.getAttribute('data-id');
        editProperty(propertyId);
    } else if (event.target.classList.contains('delete-btn')) {
        const propertyId = event.target.getAttribute('data-id');
        deleteProperty(propertyId);
    }
}

window.editProperty = function editProperty(propertyId) {
    // Implementar lógica para editar propriedade
    window.location.href = `edit-property.html?id=${propertyId}`;
}

window.deleteProperty = async function deleteProperty(propertyId) {
    if (confirm('Tem certeza que deseja excluir esta propriedade?')) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                alert('Propriedade excluída com sucesso!');
                loadProperties();
            } else {
                const data = await response.json();
                throw new Error(data.message || 'Erro ao excluir propriedade');
            }
        } catch (error) {
            console.error('Erro ao excluir propriedade:', error);
            alert('Erro ao excluir propriedade. Por favor, tente novamente.');
        }
    }
}