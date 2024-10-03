import { API_BASE_URL } from './config.js';
import { getCurrentUser, checkPermission } from './auth.js';
import { renderMenu } from './menu.js';
import { authenticatedFetch } from './utils.js';

let currentPage = 1;
const limit = 12; // Número de itens por página
let allProperties = []; // Array para armazenar todas as propriedades
let filteredProperties = []; // Array para armazenar propriedades filtradas

let currentProperty = null;

document.addEventListener('DOMContentLoaded', () => {
    if (checkPermission(['corretor', 'administrador'])) {
        setupSearch();
        loadAllProperties();
        setupModal();
        checkUrlParams();
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
        if (!checkPermission(['corretor', 'administrador'])) {
            return; // A função checkPermission já lida com o redirecionamento
        }

        const currentUser = getCurrentUser();
        const token = localStorage.getItem('token');
        let url = `${API_BASE_URL}/api/properties?limit=1000`;

        if (currentUser.role === 'corretor') {
            url += `&agent=${currentUser.id}`;
        }

        const response = await authenticatedFetch(url);

        if (!response.ok) {
            throw new Error('Falha ao carregar propriedades');
        }

        const data = await response.json();
        allProperties = data.data.properties;
        filteredProperties = [...allProperties];
        displayProperties(currentPage);
        updatePagination(currentPage, Math.ceil(filteredProperties.length / limit));
    } catch (error) {
        console.error('Erro ao carregar propriedades:', error);
        showNotification('Erro ao carregar propriedades. Por favor, tente novamente.', 'error');
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
        const propertyCard = createPropertyCard(property);
        propertiesList.appendChild(propertyCard);
    });

    setupEventListeners();
}

function createPropertyCard(property) {
    const card = document.createElement('div');
    card.className = 'property-card';
    card.setAttribute('data-id', property._id);

    const images = property.images && property.images.length > 0
        ? property.images
        : ['https://placehold.co/600x400?text=Imagem+não+encontrada'];

    card.innerHTML = `
        <div class="property-image" style="background-image: url('${API_BASE_URL}${images[0]}');">
            ${images.length > 1 ? `
                <div class="image-navigation">
                    <button class="prev-image">&lt;</button>
                    <span class="image-counter">1/${images.length}</span>
                    <button class="next-image">&gt;</button>
                </div>
            ` : ''}
        </div>
        <h3 class="property-title">${property.title}</h3>
        <p class="property-price">R$ ${property.salePrice.toLocaleString('pt-BR')}</p>
        <p class="property-address">${property.address}, ${property.neighborhood}</p>
        <p class="property-details">${property.bedrooms} quartos | ${property.totalArea} m²</p>
        <div class="property-actions">
            <button class="action-btn view-btn" data-id="${property._id}">
                <i class="fas fa-eye"></i> Visualizar
            </button>
            <button class="action-btn edit-btn" data-id="${property._id}">
                <i class="fas fa-edit"></i> Editar
            </button>
            <button class="action-btn delete-btn" data-id="${property._id}">
                <i class="fas fa-trash-alt"></i> Excluir
            </button>
        </div>
    `;

    if (images.length > 1) {
        let currentImageIndex = 0;
        const imageElement = card.querySelector('.property-image');
        const prevButton = card.querySelector('.prev-image');
        const nextButton = card.querySelector('.next-image');
        const imageCounter = card.querySelector('.image-counter');

        prevButton.addEventListener('click', (e) => {
            e.stopPropagation();
            currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
            updateImage();
        });

        nextButton.addEventListener('click', (e) => {
            e.stopPropagation();
            currentImageIndex = (currentImageIndex + 1) % images.length;
            updateImage();
        });

        function updateImage() {
            imageElement.style.backgroundImage = `url('${API_BASE_URL}${images[currentImageIndex]}')`;
            imageCounter.textContent = `${currentImageIndex + 1}/${images.length}`;
        }
    }

    return card;
}

function setupEventListeners() {
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const propertyId = this.getAttribute('data-id');
            showPropertyDetails(propertyId);
        });
    });

    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(button => {
        button.addEventListener('click', () => {
            const propertyId = button.getAttribute('data-id');
            window.location.href = `edit-property.html?id=${propertyId}`;
        });
    });

    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', deleteProperty);
    });
}

window.showPropertyDetails = async function showPropertyDetails(propertyId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao carregar detalhes da propriedade');
        }

        const data = await response.json();
        console.log('Dados recebidos da API:', data);

        const property = data.data && data.data.property ? data.data.property : data.data;

        if (!property) {
            throw new Error('Dados da propriedade não encontrados');
        }

        const modal = document.getElementById('property-details-modal');
        const modalContent = modal.querySelector('.modal-content');

        // Garantir que haja pelo menos 3 imagens para o carrossel
        const images = property.images && property.images.length >= 3 ? property.images :
            ['https://via.placeholder.com/800x600.png?text=Imagem+1',
                'https://via.placeholder.com/800x600.png?text=Imagem+2',
                'https://via.placeholder.com/800x600.png?text=Imagem+3'];

        modalContent.innerHTML = `
            <span class="close">&times;</span>
            <div class="property-modal-header">
                <h2>${property.title || 'Título não disponível'}</h2>
                <p class="property-address">${property.address || ''}, ${property.neighborhood || ''}, ${property.captureCity || ''}</p>
            </div>
            <div class="property-modal-gallery">
                <div class="swiper-container gallery-top">
                    <div class="swiper-wrapper">
                        ${images.map(img => `
                            <div class="swiper-slide">
                                <img src="${API_BASE_URL}${img}" alt="Imagem da propriedade" onerror="this.src='https://via.placeholder.com/800x600.png?text=Imagem+não+encontrada'">
                            </div>
                        `).join('')}
                    </div>
                    <div class="swiper-button-next"></div>
                    <div class="swiper-button-prev"></div>
                </div>
                <div class="swiper-container gallery-thumbs">
                    <div class="swiper-wrapper">
                        ${images.map(img => `
                            <div class="swiper-slide">
                                <img src="${API_BASE_URL}${img}" alt="Miniatura da imagem" onerror="this.src='https://via.placeholder.com/200x150.png?text=Miniatura+não+encontrada'">
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="property-modal-details">
                <div class="property-main-info">
                    <div class="property-price">R$ ${property.salePrice ? property.salePrice.toLocaleString('pt-BR') : 'Preço não informado'}</div>
                    <div class="property-features">
                        <span><i class="fas fa-home"></i> ${property.propertyType || 'Tipo não informado'}</span>
                        <span><i class="fas fa-bed"></i> ${property.bedrooms || 0} quartos</span>
                        <span><i class="fas fa-bath"></i> ${property.bathrooms || 0} banheiros</span>
                        <span><i class="fas fa-ruler-combined"></i> ${property.totalArea || 0} m² total</span>
                    </div>
                </div>
                <div class="property-description">
                    <h3>Descrição</h3>
                    <p>${property.description || 'Descrição não disponível'}</p>
                </div>
                <div class="property-details-grid">
                    ${generateDetailsSection('Informações de Captação', [
            ['Captado por', property.capturedBy],
            ['Data de captação', property.captureDate ? new Date(property.captureDate).toLocaleDateString('pt-BR') : 'Não informada'],
            ['Cidade', property.captureCity],
            ['CEP', property.captureCEP]
        ])}
                    ${generateDetailsSection('Localização', [
            ['Endereço', property.address],
            ['Bairro', property.neighborhood],
            ['Condomínio', property.isCondominium ? 'Sim' : 'Não'],
            ['Bloco', property.block],
            ['Número do apartamento', property.apartmentNumber]
        ])}
                    ${generateDetailsSection('Características do Imóvel', [
            ['Tipo', property.propertyType],
            ['Tipo secundário', property.secondaryType],
            ['Área total', `${property.totalArea || 0} m²`],
            ['Área construída', `${property.builtArea || 0} m²`],
            ['Quartos', property.bedrooms],
            ['Suítes', property.suites],
            ['Banheiros sociais', property.socialBathrooms],
            ['Quintal', property.hasBackyard ? 'Sim' : 'Não'],
            ['Varanda', property.hasBalcony ? 'Sim' : 'Não'],
            ['Elevador', property.hasElevator ? 'Sim' : 'Não'],
            ['Andares', property.floors],
            ['Andar', property.floor]
        ])}
                    ${generateDetailsSection('Informações de Visita', [
            ['Status de ocupação', property.occupancyStatus],
            ['Localização da chave', property.keyLocation],
            ['Nome do proprietário', property.ownerName],
            ['Contato do proprietário', property.ownerContact]
        ])}
                    ${generateDetailsSection('Informações Financeiras', [
            ['Preço de venda', property.salePrice ? `R$ ${property.salePrice.toLocaleString('pt-BR')}` : 'Não informado'],
            ['Preço líquido desejado', property.desiredNetPrice ? `R$ ${property.desiredNetPrice.toLocaleString('pt-BR')}` : 'Não informado']
        ])}
                </div>
                <div class="property-additional-info">
                    <h3>Informações Adicionais</h3>
                    <p><strong>Captado por:</strong> ${property.capturedBy || 'Não informado'}</p>
                    <p><strong>Data de captação:</strong> ${property.captureDate ? new Date(property.captureDate).toLocaleDateString('pt-BR') : 'Não informada'}</p>
                    <p><strong>Área construída:</strong> ${property.builtArea || 0} m²</p>
                    <p><strong>Suítes:</strong> ${property.suites || 0}</p>
                    <p><strong>Banheiros sociais:</strong> ${property.socialBathrooms || 0}</p>
                    <p><strong>Status de ocupação:</strong> ${property.occupancyStatus || 'Não informado'}</p>
                    <p><strong>Nome do proprietário:</strong> ${property.ownerName || 'Não informado'}</p>
                    <p><strong>Contato do proprietário:</strong> ${property.ownerContact || 'Não informado'}</p>
                    <p><strong>Diferenciais:</strong> ${property.differentials || 'Não informado'}</p>
                    <p><strong>Pontos de referência:</strong> ${property.landmarks || 'Não informado'}</p>
                    <p><strong>Observações gerais:</strong> ${property.generalObservations || 'Não informado'}</p>
                </div>
            </div>
            <div class="property-modal-actions">
                <a href="edit-property.html?id=${property._id}" class="btn btn-primary">Editar Propriedade</a>
                <button class="btn btn-secondary" onclick="deleteProperty('${property._id}')">Excluir Propriedade</button>
            </div>
        `;

        modal.style.display = 'block';

        // Inicializar o Swiper após a modal ser exibida
        initializeModalCarousel();

        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = function () {
            modal.style.display = 'none';
        }

        window.onclick = function (event) {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        }

    } catch (error) {
        console.error('Erro ao carregar detalhes da propriedade:', error);
        showNotification('Erro ao carregar detalhes da propriedade. Por favor, tente novamente.', 'error');
    }
}

function generateDetailsSection(title, details) {
    return `
        <div class="details-column">
            <h3>${title}</h3>
            <ul>
                ${details.map(([key, value]) => `
                    <li><strong>${key}:</strong> ${value || 'Não informado'}</li>
                `).join('')}
            </ul>
        </div>
    `;
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

function setupModal() {
    const modal = document.getElementById('property-details-modal');
    const closeBtn = modal.querySelector('.close');

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

async function deleteProperty(event) {
    const propertyId = event.currentTarget.getAttribute('data-id');
    console.log('Tentando excluir propriedade com ID:', propertyId);

    if (confirm('Tem certeza que deseja excluir esta propriedade?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(`Falha ao excluir a propriedade: ${responseData.message || response.statusText}`);
            }

            console.log('Resposta do servidor:', responseData);
            showNotification('Propriedade excluída com sucesso!', 'success');
            loadAllProperties(); // Recarrega a lista de propriedades
        } catch (error) {
            console.error('Erro ao excluir propriedade:', error);
            showNotification(`Erro ao excluir propriedade: ${error.message}`, 'error');
        }
    }
}

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const res = urlParams.get('res');

    if (res === '1') {
        showNotification('Propriedade adicionada com sucesso!', 'success');
    } else if (res === '0') {
        showNotification('Erro ao adicionar propriedade. Por favor, tente novamente.', 'error');
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }, 100);
}

function initializeModalCarousel() {
    const galleryThumbs = new Swiper('.gallery-thumbs', {
        spaceBetween: 10,
        slidesPerView: 4,
        freeMode: true,
        watchSlidesVisibility: true,
        watchSlidesProgress: true,
    });

    const galleryTop = new Swiper('.gallery-top', {
        spaceBetween: 10,
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        thumbs: {
            swiper: galleryThumbs
        }
    });
}

export { loadAllProperties };