import { API_BASE_URL } from './config.js';
import { renderMenu } from './menu.js';

let galleryTop;
let galleryThumbs;

let propertyDetailsInitialized = false;

export function initPropertyDetails() {
    if (propertyDetailsInitialized) {
        return;
    }
    propertyDetailsInitialized = true;

    const detailsContainer = document.getElementById('property-details');
    if (!detailsContainer) {
        console.log('Elemento property-details não encontrado. Provavelmente não estamos na página de detalhes.');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');

    if (propertyId) {
        fetchPropertyDetails(propertyId);
    } else {
        console.error('ID da propriedade não fornecido na URL');
        displayError('ID da propriedade não fornecido');
    }
}

async function fetchPropertyDetails(propertyId) {
    try {
        console.log('Iniciando busca de detalhes da propriedade');
        const url = `${API_BASE_URL}/api/properties/${propertyId}`;
        console.log('URL da requisição:', url);
        
        const response = await fetch(url);
        console.log('Status da resposta:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Dados recebidos da API:', data);
        
        if (data.success && data.data) {
            displayPropertyDetails(data.data);
            loadSimilarProperties(data.data);
        } else {
            throw new Error('Formato de dados inválido ou propriedade não encontrada');
        }
    } catch (error) {
        console.error('Erro ao carregar detalhes da propriedade:', error);
        displayError('Não foi possível carregar os detalhes da propriedade');
    }
}

function displayPropertyDetails(property) {
    console.log('Propriedade recebida para exibição:', property);
    const detailsContainer = document.getElementById('property-details');
    if (!detailsContainer) {
        console.error('Elemento property-details não encontrado');
        return;
    }

    // Usando imagens de overlay do Placeholder.com
    const placeholderImages = [
        'https://via.placeholder.com/800x600.png?text=Imagem+1',
        'https://via.placeholder.com/800x600.png?text=Imagem+2',
        'https://via.placeholder.com/800x600.png?text=Imagem+3'
    ];

    detailsContainer.innerHTML = `
        <h1>${property.title || 'Título não disponível'}</h1>
        <div class="property-gallery">
            <div class="swiper-container gallery-top">
                <div class="swiper-wrapper">
                    ${placeholderImages.map(image => `<div class="swiper-slide"><img src="${image}" alt="Imagem da propriedade"></div>`).join('')}
                </div>
                <div class="swiper-button-next"></div>
                <div class="swiper-button-prev"></div>
            </div>
            <div class="swiper-container gallery-thumbs">
                <div class="swiper-wrapper">
                    ${placeholderImages.map(image => `<div class="swiper-slide"><img src="${image}" alt="Miniatura da imagem"></div>`).join('')}
                </div>
            </div>
        </div>
        <p class="price">Preço: R$ ${property.price ? property.price.toLocaleString('pt-BR') : 'Não informado'}</p>
        <p class="address">Endereço: ${property.address ? `${property.address.street}, ${property.address.city} - ${property.address.state}` : 'Endereço não disponível'}</p>
        <div class="details">
            <p>Quartos: ${property.bedrooms || 'Não informado'}</p>
            <p>Banheiros: ${property.bathrooms || 'Não informado'}</p>
            <p>Área: ${property.area ? `${property.area} m²` : 'Não informada'}</p>
        </div>
        <p class="description">Descrição: ${property.description || 'Descrição não disponível'}</p>
        <p>Tipo: ${property.type || 'Não informado'}</p>
        <p>Status: ${property.status || 'Não informado'}</p>
        <div class="property-actions">
            <button onclick="requestVisit('${property._id}')">Solicitar Visita</button>
            <button onclick="toggleFavorite('${property._id}')">Favoritar</button>
        </div>
        <div id="similar-properties">
            <h2>Imóveis Semelhantes</h2>
            <div class="properties-grid"></div>
        </div>
    `;

    initializeCarousel();
    loadSimilarProperties(property);
}

function initializeCarousel() {
    const galleryTop = document.querySelector('.gallery-top');
    const galleryThumbs = document.querySelector('.gallery-thumbs');

    if (!galleryTop || !galleryThumbs) {
        console.error('Elementos do carousel não encontrados');
        return;
    }

    new Swiper(galleryThumbs, {
        spaceBetween: 10,
        slidesPerView: 4,
        freeMode: true,
        watchSlidesVisibility: true,
        watchSlidesProgress: true,
    });

    new Swiper(galleryTop, {
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

async function loadSimilarProperties(property) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/properties/${property._id}/similar`);
        if (!response.ok) {
            throw new Error('Falha ao carregar propriedades similares');
        }
        const data = await response.json();
        console.log('Dados de propriedades similares recebidos:', data);
        if (data.status === 'success' && Array.isArray(data.data.similarProperties)) {
            displaySimilarProperties(data.data.similarProperties);
        } else {
            console.error('Formato de dados inválido para propriedades similares:', data);
            displaySimilarProperties([]);
        }
    } catch (error) {
        console.error('Erro ao carregar propriedades similares:', error);
        displaySimilarProperties([]);
    }
}

function displaySimilarProperties(properties) {
    const propertiesGrid = document.querySelector('#similar-properties .properties-grid');
    if (!propertiesGrid) {
        console.error('Elemento properties-grid não encontrado');
        return;
    }

    if (!Array.isArray(properties) || properties.length === 0) {
        propertiesGrid.innerHTML = '<p>Nenhuma propriedade similar encontrada.</p>';
        return;
    }

    propertiesGrid.innerHTML = properties.map(property => `
        <div class="property-card" onclick="window.location.href='property-details.html?id=${property._id}'">
            <div class="property-image" style="background-image: url('https://via.placeholder.com/300x200.png?text=Imóvel+Similar')"></div>
            <div class="property-info">
                <h3>${property.title}</h3>
                <p class="price">R$ ${property.price.toLocaleString('pt-BR')}</p>
                <p>${property.bedrooms} quartos | ${property.bathrooms} banheiros | ${property.area} m²</p>
            </div>
        </div>
    `).join('');
}

function displayError(message) {
    const detailsContainer = document.getElementById('property-details');
    if (detailsContainer) {
        detailsContainer.innerHTML = `
            <h2>Erro</h2>
            <p>${message}</p>
            <a href="index.html">Voltar para a página inicial</a>
        `;
    }
}

// Mantenha as funções requestVisit e toggleFavorite como estavam antes

document.addEventListener('DOMContentLoaded', initPropertyDetails);