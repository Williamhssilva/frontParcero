import { API_BASE_URL } from './config.js';
import { renderMenu } from './menu.js';
import { authenticatedFetch } from './utils.js';

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
        
        const response = await authenticatedFetch(url);
        console.log('Resposta da API:', response);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro ao buscar detalhes da propriedade:', errorData);
            throw new Error(`Erro: ${errorData.message || 'Erro desconhecido'}`);
        }
        
        const data = await response.json();
        console.log('Dados recebidos da API:', data);
        
        // Ajuste aqui para acessar a propriedade corretamente
        if (data.status === 'success' && data.data) {
            displayPropertyDetails(data.data); // Acesse data.data diretamente
            loadSimilarProperties(data.data); // Acesse data.data diretamente
        } else {
            console.error('Dados recebidos:', data); // Log para depuração
            throw new Error('Formato de dados inválido ou propriedade não encontrada');
        }
    } catch (error) {
        console.error('Erro ao carregar detalhes da propriedade:', error);
        displayError('Não foi possível carregar os detalhes da propriedade');
    }
}

function displayPropertyDetails(property) {
    console.log('Propriedade recebida para exibição:', property);
    
    // Atualizar título e endereço
    document.getElementById('property-title').textContent = property.property.title || 'Título não disponível';
    document.getElementById('property-address').textContent = `${property.property.address || ''}, ${property.property.neighborhood || ''}, ${property.property.captureCity || ''}`;

    // Atualizar galeria de imagens
    updatePropertyImages(property.property.images || []);

    // Atualizar preço
    document.getElementById('property-price').textContent = `R$ ${property.property.salePrice ? property.property.salePrice.toLocaleString('pt-BR') : 'Preço não informado'}`;

    // Atualizar características
    const featuresContainer = document.getElementById('property-features');
    featuresContainer.innerHTML = `
        <div class="feature"><i class="fas fa-bed"></i> ${property.property.bedrooms || 0} quartos</div>
        <div class="feature"><i class="fas fa-bath"></i> ${property.property.socialBathrooms || 0} banheiros</div> 
        <div class="feature"><i class="fas fa-ruler-combined"></i> ${property.property.totalArea || 0} m² total</div>
        <div class="feature"><i class="fas fa-vector-square"></i> ${property.property.builtArea || 0} m² construídos</div>
        <div class="feature"><i class="fas fa-car"></i> ${property.property.garages || 0} vagas</div> 
        <div class="feature"><i class="fas fa-building"></i> ${property.property.propertyType || 'Tipo não informado'}</div>
    `;

    // Atualizar descrição
    document.getElementById('property-description-text').textContent = property.property.description || 'Descrição não disponível';

    // Atualizar detalhes
    const detailsContainer = document.getElementById('property-details-list');
    detailsContainer.innerHTML = `
        <div class="details-grid">
            <div class="details-column">
                <h3>Informações Básicas</h3>
                <ul>
                    <li><i class="fas fa-home"></i> Tipo: ${property.property.propertyType || 'Não informado'}</li>
                    <li><i class="fas fa-chart-area"></i> Área total: ${property.property.totalArea || 0} m²</li>
                    <li><i class="fas fa-vector-square"></i> Área construída: ${property.property.builtArea || 0} m²</li>
                    <li><i class="fas fa-bed"></i> Quartos: ${property.property.bedrooms || 0}</li>
                    <li><i class="fas fa-bath"></i> Banheiros: ${property.property.socialBathrooms || 0}</li> 
                    <li><i class="fas fa-car"></i> Vagas: ${property.property.garages || 0}</li> 
                </ul>
            </div>
            <div class="details-column">
                <h3>Características Adicionais</h3>
                <ul>
                    <li><i class="fas fa-calendar-alt"></i> Ano de construção: ${property.property.yearOfConstruction || 'Não informado'}</li> <!-- Verifique se existe no modelo -->
                    <li><i class="fas fa-sun"></i> Orientação solar: ${property.property.solarOrientation || 'Não informado'}</li> <!-- Verifique se existe no modelo -->
                    <li><i class="fas fa-building"></i> Andar: ${property.property.floor || 'Não informado'}</li> <!-- Verifique se existe no modelo -->
                </ul>
            </div>
            <div class="details-column">
                <h3>Informações Financeiras</h3>
                <ul>
                    <li><i class="fas fa-dollar-sign"></i> Condomínio: R$ ${property.property.condominiumFee ? property.property.condominiumFee.toLocaleString('pt-BR') : 'Não informado'}</li> <!-- Verifique se existe no modelo -->
                    <li><i class="fas fa-file-invoice-dollar"></i> IPTU: R$ ${property.property.iptu ? property.property.iptu.toLocaleString('pt-BR') : 'Não informado'}</li> <!-- Verifique se existe no modelo -->
                </ul>
            </div>
        </div>
    `;

    // Adicionar comodidades se disponíveis
    if (property.property.amenities && property.property.amenities.length > 0) {
        const amenitiesColumn = document.createElement('div');
        amenitiesColumn.className = 'details-column';
        amenitiesColumn.innerHTML = `
            <h3>Comodidades</h3>
            <ul>
                ${property.property.amenities.map(amenity => `<li><i class="fas fa-check"></i> ${amenity}</li>`).join('')}
            </ul>
        `;
        detailsContainer.querySelector('.details-grid').appendChild(amenitiesColumn);
    }

    // Configurar botões de ação
    document.getElementById('request-visit-btn').onclick = () => requestVisit(property.property._id);
    document.getElementById('favorite-btn').onclick = () => toggleFavorite(property.property._id);

    // Exibir data de captura e corretor responsável
    const captureInfo = document.createElement('div');
    captureInfo.className = 'capture-info';
    captureInfo.innerHTML = `
        <p>Capturado em: ${new Date(property.property.captureDate).toLocaleDateString('pt-BR')}</p>
        <p>Corretor responsável: ${property.property.capturedByName || 'Não informado'}</p>
    `;
    document.getElementById('property-details').appendChild(captureInfo);
}

function updatePropertyImages(images) {
    const galleryTop = document.querySelector('.gallery-top .swiper-wrapper');
    const galleryThumbs = document.querySelector('.gallery-thumbs .swiper-wrapper');
    
    if (!galleryTop || !galleryThumbs) {
        console.error('Elementos da galeria não encontrados');
        return;
    }

    galleryTop.innerHTML = '';
    galleryThumbs.innerHTML = '';

    images.forEach(image => {
        const fullImageUrl = `${API_BASE_URL}${image}`; // Use API_BASE_URL aqui
        
        galleryTop.innerHTML += `
            <div class="swiper-slide">
                <img src="${fullImageUrl}" alt="Imagem da propriedade" onerror="this.src='https://via.placeholder.com/800x600?text=Imagem+não+encontrada';">
            </div>
        `;
        
        galleryThumbs.innerHTML += `
            <div class="swiper-slide">
                <img src="${fullImageUrl}" alt="Miniatura da imagem" onerror="this.src='https://via.placeholder.com/200x150?text=Miniatura+não+encontrada';">
            </div>
        `;
    });

    initializeCarousel();
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
        const response = await authenticatedFetch(`${API_BASE_URL}/api/properties/${property.property._id}/similar`);
        if (!response.ok) {
            throw new Error('Falha ao carregar propriedades similares');
        }
        const data = await response.json();
        console.log('Dados de propriedades similares recebidos:', data);
        
        if (data.status === 'success' && data.data && Array.isArray(data.data.similarProperties)) {
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
    console.log('Propriedades similares para renderizar:', properties);

    const propertiesGrid = document.querySelector('#similar-properties .properties-grid');
    if (!propertiesGrid) {
        console.error('Elemento properties-grid não encontrado');
        return;
    }

    if (!Array.isArray(properties) || properties.length === 0) {
        console.log('Nenhuma propriedade similar encontrada ou formato inválido');
        propertiesGrid.innerHTML = '<p>Nenhuma propriedade similar encontrada.</p>';
        return;
    }

    propertiesGrid.innerHTML = properties.map(property => `
        <div class="property-card" onclick="window.location.href='property-details.html?id=${property.property._id}'">
            <div class="property-image" style="background-image: url('${property.property.images && property.property.images.length > 0 ? property.property.images[0] : 'https://via.placeholder.com/300x200.png?text=Imóvel+Similar'}')"></div>
            <div class="property-card-info">
                <h3 class="property-card-title">${property.property.title || 'Título não disponível'}</h3>
                <p class="property-card-price">${property.property.salePrice ? `R$ ${property.property.salePrice.toLocaleString('pt-BR')}` : 'Preço não informado'}</p>
                <p class="property-card-details">
                    ${property.property.bedrooms || 0} quartos | 
                    ${property.property.socialBathrooms || 0} banheiros | 
                    ${property.property.totalArea ? `${property.property.totalArea} m²` : 'Área não informada'}
                </p>
                <p class="property-card-address">${property.property.neighborhood || ''} ${property.property.captureCity ? `, ${property.property.captureCity}` : ''}</p>
            </div>
        </div>
    `).join('');

    console.log('Propriedades similares renderizadas:', properties.length);
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
