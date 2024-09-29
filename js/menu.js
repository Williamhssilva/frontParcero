import { getCurrentUser } from './auth.js';

function createMenuItem(href, iconClass, text) {
    return `<a href="${href}"><i class="${iconClass}"></i>${text}</a>`;
}

export function renderMenu() {
    console.log('renderMenu foi chamada');
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
        menuItems.push(createMenuItem('#', 'fas fa-sign-out-alt', 'Sair'));
    } else {
        menuItems.push(createMenuItem('login.html', 'fas fa-sign-in-alt', 'Login'));
    }

    menuContainer.innerHTML = menuItems.join('');

    // Adicionar classe 'active' ao item de menu atual
    const currentPage = window.location.pathname.split('/').pop();
    const currentMenuItem = menuContainer.querySelector(`a[href="${currentPage}"]`);
    if (currentMenuItem) {
        currentMenuItem.classList.add('active');
    }

    // Adicionar event listener para o botão de logout
    const logoutButton = menuContainer.querySelector('a:last-child');
    if (logoutButton && user) {
        logoutButton.id = 'logout-button';
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            // Chame a função de logout aqui
            // Você pode importar a função de logout do arquivo auth.js
            // ou usar um evento personalizado para acionar o logout
        });
    }
}