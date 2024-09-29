import { API_BASE_URL } from './config.js';
import { getCurrentUser, checkPermission } from './auth.js';
import { renderMenu } from './menu.js';

let currentPage = 1;
const limit = 12; // Número de itens por página
let allProperties = []; // Array para armazenar todas as propriedades
let filteredProperties = []; // Array para armazenar propriedades filtradas

document.addEventListener('DOMContentLoaded', () => {
    if (checkPermission(['corretor', 'administrador'])) {
        setupSearch();
        loadAllProperties();
    }
});

function setupSearch() {
    const searchInput = document.getElementById('property-search');
    searchInput.addEventListener('input', debounce(() => {
        filterProperties(searchInput.value);
    }, 300));
}

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

async function loadAllProperties() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/properties?agent=${getCurrentUser().id}&limit=1000`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao carregar propriedades');
        }

        const data = await response.json();
        allProperties = data.data.properties;
        filteredProperties = allProperties;
        displayProperties(currentPage);
        updatePagination(currentPage, Math.ceil(filteredProperties.length / limit));
    } catch (error) {
        console.error('Erro ao carregar propriedades:', error);
        alert('Erro ao carregar propriedades. Por favor, tente novamente mais tarde.');
    }
}

function filterProperties(searchTerm) {
    filteredProperties = allProperties.filter(property => 
        property.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    currentPage = 1;
    displayProperties(currentPage);
    updatePagination(currentPage, Math.ceil(filteredProperties.length / limit));
}

function displayProperties(page) {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const propertiesToDisplay = filteredProperties.slice(startIndex, endIndex);

    const propertiesList = document.getElementById('properties-list');
    if (!propertiesList) {
        console.error('Elemento properties-list não encontrado na página atual');
        return;
    }
    propertiesList.innerHTML = '';

    propertiesToDisplay.forEach(property => {
        const propertyCard = document.createElement('div');
        propertyCard.className = 'property-card';
        propertyCard.innerHTML = `
            <img src="${property.image}" alt="${property.title}" class="property-image">
            <div class="property-info">
                <h3 class="property-title">${property.title}</h3>
                <p class="property-price">R$ ${property.price.toLocaleString('pt-BR')}</p>
                <div class="property-actions">
                    <button class="btn btn-secondary view-details-btn" data-id="${property._id}">Ver Detalhes</button>
                    <a href="edit-property.html?id=${property._id}" class="btn btn-secondary">Editar</a>
                    <button class="btn btn-danger delete-btn" data-id="${property._id}">Excluir</button>
                </div>
            </div>
        `;
        propertiesList.appendChild(propertyCard);
    });

    // Adicionar event listeners para os botões
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', () => deleteProperty(button.getAttribute('data-id')));
    });

    document.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', () => showPropertyDetails(button.getAttribute('data-id')));
    });
}

function updatePagination(currentPage, totalPages) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) {
        console.error('Elemento pagination não encontrado na página atual');
        return;
    }
    paginationContainer.innerHTML = '';

    if (totalPages > 1) {
        if (currentPage > 1) {
            const prevButton = createPaginationButton('Anterior', () => changePage(currentPage - 1));
            paginationContainer.appendChild(prevButton);
        }

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = createPaginationButton(i, () => changePage(i), i === currentPage);
            paginationContainer.appendChild(pageButton);
        }

        if (currentPage < totalPages) {
            const nextButton = createPaginationButton('Próxima', () => changePage(currentPage + 1));
            paginationContainer.appendChild(nextButton);
        }
    }
}

function createPaginationButton(text, onClick, isActive = false) {
    const button = document.createElement('button');
    button.textContent = text;
    button.addEventListener('click', onClick);
    if (isActive) {
        button.classList.add('active');
    }
    return button;
}

function changePage(page) {
    currentPage = page;
    displayProperties(currentPage);
    updatePagination(currentPage, Math.ceil(filteredProperties.length / limit));
}

// ... (mantenha as funções deleteProperty e showPropertyDetails como estavam antes)