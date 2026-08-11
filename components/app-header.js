class AppHeader extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background-color: var(--primary-color, #2c3e50);
                    color: var(--surface-color, #ffffff);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .header-container {
                    display: flex;
                    align-items: center;
                    padding: 16px 24px;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .logo-container {
                    margin-right: 16px;
                    display: flex;
                    align-items: center;
                }
                .logo {
                    height: 48px;
                    width: auto;
                    object-fit: contain;
                    /* Fallback style if image fails */
                    background-color: var(--surface-color, #ffffff);
                    border-radius: 4px;
                }
                .title-container {
                    display: flex;
                    flex-direction: column;
                }
                h1 {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 600;
                    letter-spacing: 0.5px;
                }
                .subtitle {
                    margin: 0;
                    font-size: 0.875rem;
                    opacity: 0.8;
                }
            </style>
            <header class="header-container">
                <div class="logo-container">
                    <img src="ikonppd.png" alt="Logo" class="logo" onerror="this.style.display='none'">
                </div>
                <div class="title-container">
                    <h1>Sistem Maklumat RPM</h1>
                    <p class="subtitle">Pejabat Pendidikan Daerah</p>
                </div>
            </header>
        `;
    }
}

customElements.define('app-header', AppHeader);