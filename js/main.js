import { API_BASE_URL } from './config.js';
import { renderMenu } from './menu.js';
import { getCurrentUser, logout } from './auth.js';
import { initPropertyDetails } from './property-details.js';
import { authenticatedFetch } from './utils.js';

let currentPage = 1;
const limit = 12; // Número de itens por página

// main.js
document.addEventListener('DOMContentLoaded', function() {
    renderMenu();  // Use apenas renderMenu aqui

    // Verifica se estamos na página inicial
    const isHomePage = document.querySelector('.search-area') !== null;

    if (isHomePage) {
        setupFilters();
        loadFeaturedProperties();
    }

    // Verifica se estamos na página de detalhes da propriedade
    if (window.location.pathname.includes('property-details.html')) {
        // Importa e inicializa os detalhes da propriedade apenas se estivermos na página correta
        import('./property-details.js').then(module => {
            if (typeof module.initPropertyDetails === 'function') {
                module.initPropertyDetails();
            }
        });
    }

    // Adicione outras verificações específicas de página aqui, se necessário

    // Adiciona event listener para o botão de logout
    const logoutButton = document.querySelector('#logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
});

// Atualizar a função searchProperties para suportar paginação
async function searchProperties(page = 1) {
    console.log('Iniciando busca de propriedades');
    const location = document.getElementById('location').value;
    const minPrice = document.getElementById('minPrice').value;
    const maxPrice = document.getElementById('maxPrice').value;
    const bedrooms = document.getElementById('bedrooms').value;
    const minArea = document.getElementById('minArea').value;

    const queryParams = new URLSearchParams({
        page: page,
        limit: 12
    });
    if (location) queryParams.append('location', location);
    if (minPrice) queryParams.append('minPrice', minPrice);
    if (maxPrice) queryParams.append('maxPrice', maxPrice);
    if (bedrooms) queryParams.append('bedrooms', bedrooms);
    if (minArea) queryParams.append('minArea', minArea);

    console.log('Query params:', queryParams.toString());

    const token = localStorage.getItem('token');
    try {
        console.log("entreiiiidinovo");
        const response = await authenticatedFetch(`${API_BASE_URL}/api/properties?${queryParams}`);
        console.log('Resposta completa:', response);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro detalhado:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Dados recebidos:', data);

        if (data.status === 'success' && data.data && Array.isArray(data.data.properties)) {
            displayProperties(data.data.properties);
            updatePagination(data.currentPage, data.totalPages, searchProperties);
        } else {
            console.error('Formato de dados inválido:', data);
            throw new Error('Formato de dados inválido');
        }
    } catch (error) {
        console.error('Erro detalhado:', error);
        alert('Erro ao buscar propriedades: ' + error.message);
        document.getElementById('property-grid').innerHTML = '<p>Erro ao carregar imóveis. Por favor, tente novamente mais tarde.</p>';
    }
}

// Atualizar a função updatePagination para ser mais flexível
function updatePagination(currentPage, totalPages, pageChangeCallback) {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = '';

    if (totalPages > 1) {
        if (currentPage > 1) {
            const prevButton = createPaginationButton('Anterior', () => pageChangeCallback(currentPage - 1));
            paginationContainer.appendChild(prevButton);
        }

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = createPaginationButton(i, () => pageChangeCallback(i), i === currentPage);
            paginationContainer.appendChild(pageButton);
        }

        if (currentPage < totalPages) {
            const nextButton = createPaginationButton('Próxima', () => pageChangeCallback(currentPage + 1));
            paginationContainer.appendChild(nextButton);
        }
    }
}

async function loadFeaturedProperties() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/api/properties?page=1&limit=12`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        if (data.status === 'success' && data.data && Array.isArray(data.data.properties)) {
            displayProperties(data.data.properties);
            updatePagination(data.currentPage, data.totalPages, loadFeaturedProperties);
        } else {
            throw new Error('Formato de dados inválido ou propriedades não encontradas');
        }
    } catch (error) {
        console.error('Erro ao carregar imóveis:', error);
        if (error.message === 'Não autorizado' || error.message === 'Usuário não autenticado') {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        }
    }
}

function setupFilters() {
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', searchProperties);
    }
    // Remova o else com o console.error
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

function displayProperties(properties) {
    const propertyGrid = document.getElementById('property-grid');
    if (!propertyGrid) {
        console.log('Elemento property-grid não encontrado na página atual');
        return;
    }
    propertyGrid.innerHTML = '';
    
    if (!Array.isArray(properties) || properties.length === 0) {
        propertyGrid.innerHTML = '<p>Nenhuma propriedade encontrada.</p>';
        return;
    }
    
    properties.forEach(property => {
        const propertyCard = createPropertyCard(property);
        propertyGrid.appendChild(propertyCard);
    });
    setupPropertyCardListeners();
}

function createPropertyCard(property) {
    const card = document.createElement('div');
    card.className = 'property-card';
    
    // Corrigir o caminho da imagem
    const imageUrl = property.images && property.images.length > 0 
        ? `${API_BASE_URL}${property.images[0]}` // Adiciona o API_BASE_URL ao caminho da imagem
        : 'https://via.placeholder.com/300x200.png?text=Imóvel';
    
    card.innerHTML = `
        <div class="property-image-container">
            <img src="${imageUrl}" alt="${property.title}" class="property-image" onerror="this.src='https://via.placeholder.com/300x200.png?text=Imagem+não+encontrada'">
            <div class="property-overlay">
                <button class="btn-action btn-view" data-id="${property._id}" title="Ver Detalhes">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-action btn-favorite" data-id="${property._id}" title="Favoritar">
                    <i class="far fa-heart"></i>
                </button>
                <button class="btn-action btn-share" data-id="${property._id}" title="Compartilhar">
                    <i class="fas fa-share-alt"></i>
                </button>
            </div>
        </div>
        <div class="property-info">
            <h3>${property.title}</h3>
            <p class="price">R$ ${property.salePrice ? property.salePrice.toLocaleString('pt-BR') : 'Preço não informado'}</p>
            <p class="address">${property.address}, ${property.neighborhood}, ${property.captureCity}</p>
            <p class="details">
                <span>${property.bedrooms || 0} quartos</span> | 
                <span>${property.bathrooms || 0} banheiros</span> | 
                <span>${property.totalArea || 0} m²</span>
            </p>
        </div>
    `;
    return card;
}

function setupLazyLoading() {
    const lazyImages = document.querySelectorAll('.lazy-image');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.onload = () => {
                    img.classList.remove('lazy-image');
                    img.classList.add('lazy-loaded');
                };
                observer.unobserve(img);
            }
        });
    }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    });

    lazyImages.forEach(img => imageObserver.observe(img));
}

function setupPropertyCardListeners() {
    document.querySelectorAll('.btn-view').forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const propertyId = button.getAttribute('data-id');
            window.location.href = `property-details.html?id=${propertyId}`;
        });
    });

    document.querySelectorAll('.btn-favorite').forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const propertyId = button.getAttribute('data-id');
            // Implemente a lógica para favoritar a propriedade
            console.log(`Favoritar propriedade: ${propertyId}`);
        });
    });

    document.querySelectorAll('.btn-share').forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const propertyId = button.getAttribute('data-id');
            // Implemente a lógica para compartilhar a propriedade
            console.log(`Compartilhar propriedade: ${propertyId}`);
        });
    });
}

window.addEventListener('storage', function(e) {
    if (e.key === 'token') {
        console.log('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXToken alterado:', e.newValue);
    }
});