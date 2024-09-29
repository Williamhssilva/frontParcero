import { API_BASE_URL } from './config.js';
import { renderMenu } from './menu.js';

let swiper;

// Função para verificar se estamos na página de detalhes da propriedade
function isPropertyDetailsPage() {
    return window.location.pathname.includes('property-details.html');
}

export function initPropertyDetails() {
    if (!isPropertyDetailsPage()) {
        return; // Sai da função se não estiver na página de detalhes da propriedade
    }

    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');

    if (!propertyId) {
        console.log('ID da propriedade não fornecido na URL');
        displayError('ID da propriedade não fornecido');
        return;
    }

    fetchPropertyDetails(propertyId);
}

async function fetchPropertyDetails(propertyId) {
    try {
        const url = `${API_BASE_URL}/api/properties/${propertyId}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
            displayPropertyDetails(data.data);
        } else {
            throw new Error('Formato de dados inválido ou propriedade não encontrada');
        }
    } catch (error) {
        console.error('Erro ao carregar detalhes da propriedade:', error);
        displayError('Não foi possível carregar os detalhes da propriedade');
    }
}

function displayPropertyDetails(property) {
    document.getElementById('property-title').textContent = property.title;
    document.getElementById('property-address').textContent = `${property.address.street}, ${property.address.city} - ${property.address.state}`;
    document.getElementById('property-price').textContent = `R$ ${property.price.toLocaleString('pt-BR')}`;
    document.getElementById('property-description-text').textContent = property.description;

    const featuresElement = document.getElementById('property-features');
    featuresElement.innerHTML = `
        <div class="feature"><i class="fas fa-bed"></i> ${property.bedrooms} Quartos</div>
        <div class="feature"><i class="fas fa-bath"></i> ${property.bathrooms} Banheiros</div>
        <div class="feature"><i class="fas fa-ruler-combined"></i> ${property.area} m²</div>
    `;

    const detailsList = document.getElementById('property-details-list');
    detailsList.innerHTML = `
        <li><i class="fas fa-home"></i> <strong>Tipo:</strong> ${property.type}</li>
        <li><i class="fas fa-tag"></i> <strong>Status:</strong> ${property.status}</li>
        <li><i class="fas fa-hashtag"></i> <strong>Código:</strong> ${property._id}</li>
    `;

    // Inicializar o carrossel
    if (Array.isArray(property.images) && property.images.length > 0) {
        initializeCarousel(property.images);
    } else if (property.image) {
        // Fallback para a propriedade image singular, se existir
        initializeCarousel([property.image]);
    } else {
        console.warn('Nenhuma imagem encontrada para esta propriedade');
        // Você pode adicionar uma imagem padrão ou uma mensagem aqui
    }

    // Adicionar event listeners para os botões
    document.getElementById('request-visit-btn').addEventListener('click', () => requestVisit(property._id));
    document.getElementById('favorite-btn').addEventListener('click', () => toggleFavorite(property._id));

    // Adicione esta linha no final da função
    displaySimilarProperties(property._id);
}

function initializeCarousel(images) {
    const galleryTop = new Swiper('.gallery-top', {
        spaceBetween: 10,
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        loop: true,
        loopedSlides: images.length
    });

    const galleryThumbs = new Swiper('.gallery-thumbs', {
        spaceBetween: 10,
        centeredSlides: true,
        slidesPerView: 'auto',
        touchRatio: 0.2,
        slideToClickedSlide: true,
        loop: true,
        loopedSlides: images.length
    });

    galleryTop.controller.control = galleryThumbs;
    galleryThumbs.controller.control = galleryTop;

    const swiperWrapper = document.querySelector('.gallery-top .swiper-wrapper');
    const thumbsWrapper = document.querySelector('.gallery-thumbs .swiper-wrapper');
    
    images.forEach(imageUrl => {
        swiperWrapper.innerHTML += `<div class="swiper-slide"><img src="${imageUrl}" alt="Imagem do imóvel"></div>`;
        thumbsWrapper.innerHTML += `<div class="swiper-slide"><img src="${imageUrl}" alt="Miniatura do imóvel"></div>`;
    });

    galleryTop.update();
    galleryThumbs.update();
}

function displayError(message) {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
        errorContainer.innerHTML = `<p class="error-message">${message}</p>`;
    } else {
        console.error('Elemento de exibição de erro não encontrado:', message);
    }
}

async function requestVisit(propertyId) {
    // Implementar lógica para solicitar visita
    alert('Funcionalidade de solicitar visita será implementada em breve!');
}

async function toggleFavorite(propertyId) {
    // Implementar lógica para favoritar/desfavoritar
    alert('Funcionalidade de favoritar será implementada em breve!');
}

// Adicione esta função no final do arquivo
async function fetchSimilarProperties(propertyId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}/similar`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.data.similarProperties;
    } catch (error) {
        console.error('Erro ao carregar propriedades similares:', error);
        return [];
    }
}

// Adicione esta nova função
async function displaySimilarProperties(propertyId) {
    const similarProperties = await fetchSimilarProperties(propertyId);
    const similarPropertiesList = document.getElementById('similar-properties-list');
    similarPropertiesList.innerHTML = '';

    similarProperties.forEach(property => {
        const propertyCard = document.createElement('div');
        propertyCard.className = 'property-card';
        propertyCard.innerHTML = `
            <div class="property-card-image">
                <img src="${property.image || property.images[0] || 'path/to/default-image.jpg'}" alt="${property.title}">
                <div class="property-card-overlay"></div>
            </div>
            <div class="property-card-info">
                <h3 class="property-card-title">${property.title}</h3>
                <p class="property-card-price">R$ ${property.price.toLocaleString('pt-BR')}</p>
                <p class="property-card-details">${property.bedrooms} quartos | ${property.bathrooms} banheiros | ${property.area} m²</p>
            </div>
        `;
        propertyCard.addEventListener('click', () => {
            window.location.href = `property-details.html?id=${property._id}`;
        });
        similarPropertiesList.appendChild(propertyCard);
    });
}

if (isPropertyDetailsPage()) {
    document.addEventListener('DOMContentLoaded', initPropertyDetails);
}