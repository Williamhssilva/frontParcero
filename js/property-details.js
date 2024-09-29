import { API_BASE_URL } from './config.js';
import { renderMenu } from './menu.js';

export function initPropertyDetails() {
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

export function loadPropertyDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');
    console.log('ID da propriedade:', propertyId);

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

    detailsContainer.innerHTML = `
        <h1>${property.title || 'Título não disponível'}</h1>
        <img src="${property.image || 'placeholder.jpg'}" alt="${property.title || 'Imagem da propriedade'}">
        <p>Preço: R$ ${property.price ? property.price.toLocaleString('pt-BR') : 'Não informado'}</p>
        <p>Endereço: ${property.address ? `${property.address.street}, ${property.address.city} - ${property.address.state}` : 'Endereço não disponível'}</p>
        <p>Quartos: ${property.bedrooms || 'Não informado'}</p>
        <p>Banheiros: ${property.bathrooms || 'Não informado'}</p>
        <p>Área: ${property.area ? `${property.area} m²` : 'Não informada'}</p>
        <p>Descrição: ${property.description || 'Descrição não disponível'}</p>
        <p>Tipo: ${property.type || 'Não informado'}</p>
        <p>Status: ${property.status || 'Não informado'}</p>
    `;
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

async function requestVisit(propertyId) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Você precisa estar logado para solicitar uma visita');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}/visit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        const data = await response.json();
        if (response.ok) {
            alert('Visita solicitada com sucesso!');
        } else {
            alert(data.message || 'Erro ao solicitar visita');
        }
    } catch (error) {
        console.error('Erro ao solicitar visita:', error);
        alert('Erro ao solicitar visita');
    }
}

async function toggleFavorite(propertyId) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Você precisa estar logado para favoritar um imóvel');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/api/properties/${propertyId}/favorite`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        const data = await response.json();
        if (response.ok) {
            alert(data.message || 'Status de favorito alterado com sucesso');
        } else {
            alert(data.message || 'Erro ao alterar status de favorito');
        }
    } catch (error) {
        console.error('Erro ao favoritar imóvel:', error);
        alert('Erro ao favoritar imóvel');
    }
}