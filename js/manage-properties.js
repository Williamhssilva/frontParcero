import { API_BASE_URL } from './config.js';
import { getCurrentUser, checkPermission } from './auth.js';
import { renderMenu } from './menu.js';

document.addEventListener('DOMContentLoaded', () => {
    if (checkPermission(['corretor', 'administrador'])) {
        loadProperties();
    }
});

async function loadProperties() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/properties?agent=${getCurrentUser().id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao carregar propriedades');
        }

        const data = await response.json();
        displayProperties(data.data.properties);
    } catch (error) {
        console.error('Erro ao carregar propriedades:', error);
        alert('Erro ao carregar propriedades. Por favor, tente novamente mais tarde.');
    }
}

function displayProperties(properties) {
    const propertiesList = document.getElementById('properties-list');
    propertiesList.innerHTML = '';

    properties.forEach(property => {
        const propertyCard = document.createElement('div');
        propertyCard.className = 'property-card';
        propertyCard.innerHTML = `
            <img src="${property.image}" alt="${property.title}" class="property-image">
            <div class="property-info">
                <h3 class="property-title">${property.title}</h3>
                <p class="property-price">R$ ${property.price.toLocaleString('pt-BR')}</p>
                <div class="property-actions">
                    <a href="edit-property.html?id=${property._id}" class="btn btn-secondary">Editar</a>
                    <button class="btn btn-danger delete-btn" data-id="${property._id}">Excluir</button>
                </div>
            </div>
        `;
        propertiesList.appendChild(propertyCard);
    });

    // Adicionar event listeners para os botões de exclusão
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', () => deleteProperty(button.getAttribute('data-id')));
    });
}

async function deleteProperty(propertyId) {
    if (confirm('Tem certeza que deseja excluir esta propriedade?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Falha ao excluir propriedade');
            }

            alert('Propriedade excluída com sucesso!');
            loadProperties();
        } catch (error) {
            console.error('Erro ao excluir propriedade:', error);
            alert('Erro ao excluir propriedade. Por favor, tente novamente.');
        }
    }
}