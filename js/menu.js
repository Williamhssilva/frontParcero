import { getCurrentUser } from './auth.js';
import { logout } from './auth.js';

function createMenuItem(href, iconClass, text, id = '') {
    return `<a href="${href}" ${id ? `id="${id}"` : ''}><i class="${iconClass}"></i>${text}</a>`;
}

export function renderMenu() {
    const user = getCurrentUser();
    const menuContainer = document.querySelector('.bottom-menu');
    
    if (!menuContainer) {
        console.error('Menu container not found');
        return;
    }

    let menuItems = [
        createMenuItem('index.html', 'fas fa-home', 'Início'),
    ];

    if (user) {
        if (user.role === 'corretor' || user.role === 'administrador') {
            menuItems.push(createMenuItem('manage-properties.html', 'fas fa-building', 'Imóveis'));
            menuItems.push(createMenuItem('manage-leads.html', 'fas fa-user-friends', 'Leads'));
            menuItems.push(createMenuItem('agent-dashboard.html', 'fas fa-chart-line', 'Dashboard'));
        }

        if (user.role === 'administrador') {
            menuItems.push(createMenuItem('admin-dashboard.html', 'fas fa-user-shield', 'Admin'));
        }

        menuItems.push(createMenuItem('#', 'far fa-user', 'Perfil'));
        menuItems.push(createMenuItem('#', 'fas fa-sign-out-alt', 'Sair', 'logout-button'));
    } else {
        menuItems.push(createMenuItem('login.html', 'fas fa-sign-in-alt', 'Login'));
    }

    menuContainer.innerHTML = menuItems.map(item => `<div class="menu-item">${item}</div>`).join('');

    // Adicionar classe 'active' ao item de menu atual
    const currentPage = window.location.pathname.split('/').pop();
    const currentMenuItem = menuContainer.querySelector(`a[href="${currentPage}"]`);
    if (currentMenuItem) {
        currentMenuItem.classList.add('active');
    }

    // Adicionar event listeners
    addEventListeners();
}

function addEventListeners() {
    // Event listener para o botão de logout
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}

// Adicionar listener para redimensionamento da janela
window.addEventListener('resize', debounce(() => {
    renderMenu();
}, 250));

// Função de debounce para evitar chamadas excessivas durante o redimensionamento
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