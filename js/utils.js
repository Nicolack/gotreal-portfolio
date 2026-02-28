/**
 * utils.js
 * Fonctions utilitaires partagÃ©es sur tout le site.
 */

window.showToast = function (message) {
    let container = document.getElementById('toast-container');

    // Si le conteneur n'existe pas, on le crÃ©e dynamiquement
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast active';
    toast.innerHTML = `<span>â—†</span> ${message}`;

    container.appendChild(toast);

    // Auto-remove aprÃ¨s 3s
    setTimeout(() => {
        toast.classList.remove('active');
        toast.classList.add('fade-out');
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 3000);
};

