class DataTable extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.records = [];
        this.searchTerm = '';
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
        this.fetchData();
        
        // Listen for new data inserts from the form
        if (window.appEvents && typeof window.appEvents.listen === 'function') {
            window.appEvents.listen('app:dataChanged', () => {
                this.fetchData();
            });
        }
    }

    setupEventListeners() {
        // We set up listeners after rendering or dynamically, 
        // since the shadow DOM is created in render()
    }

    bindSearchEvent() {
        const searchInput = this.shadowRoot.querySelector('#searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.renderTableBody();
            });
        }
    }

    async fetchData() {
        const tbody = this.shadowRoot.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="loading">Loading data...</td></tr>';
        }

        try {
            const { data, error } = await window.appDb
                .from('records')
                .select('*')
                .order('id', { ascending: false });

            if (error) {
                throw error;
            }

            this.records = data || [];
            this.renderTableBody();
        } catch (err) {
            console.error('Error fetching data:', err);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" class="error">Failed to load data: ${err.message}</td></tr>`;
            }
        }
    }

    renderTableBody() {
        const tbody = this.shadowRoot.querySelector('tbody');
        if (!tbody) return;

        const filteredRecords = this.records.filter(record => {
            const searchStr = this.searchTerm.toLowerCase();
            return (
                (record.nama || '').toLowerCase().includes(searchStr) ||
                (record.kod_sekolah || '').toLowerCase().includes(searchStr) ||
                (record.nama_sekolah || '').toLowerCase().includes(searchStr)
            );
        });

        if (filteredRecords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty">No records found.</td></tr>';
            return;
        }

        tbody.innerHTML = filteredRecords.map((record, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${record.nama || '-'}</td>
                <td><span class="badge code">${record.kod_sekolah || '-'}</span></td>
                <td>${record.nama_sekolah || '-'}</td>
                <td>${record.jawatan || '-'}</td>
                <td>${record.telefon || '-'}</td>
            </tr>
        `).join('');
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background-color: var(--surface-color, #ffffff);
                    border-radius: var(--border-radius, 8px);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    padding: var(--spacing-lg, 24px);
                    margin-top: var(--spacing-lg, 24px);
                }

                .header-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                    gap: 16px;
                }

                h2 {
                    margin: 0;
                    color: var(--primary-color, #2c3e50);
                    font-size: 1.25rem;
                }

                .search-box {
                    position: relative;
                    min-width: 250px;
                }

                .search-box input {
                    width: 100%;
                    padding: 10px 14px 10px 36px;
                    border: 1px solid var(--border-color, #dcdde1);
                    border-radius: 20px;
                    font-size: 0.9rem;
                    outline: none;
                    transition: all 0.2s;
                }

                .search-box input:focus {
                    border-color: var(--accent-color, #3498db);
                    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
                }

                .search-icon {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-secondary, #7f8c8d);
                    font-size: 14px;
                }

                .table-container {
                    overflow-x: auto;
                    border: 1px solid var(--border-color, #dcdde1);
                    border-radius: 8px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                    font-size: 0.9rem;
                }

                thead {
                    background-color: #f8f9fa;
                }

                th {
                    padding: 14px 16px;
                    color: var(--text-secondary, #7f8c8d);
                    font-weight: 600;
                    text-transform: uppercase;
                    font-size: 0.75rem;
                    letter-spacing: 0.5px;
                    border-bottom: 2px solid var(--border-color, #dcdde1);
                    white-space: nowrap;
                }

                td {
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--border-color, #dcdde1);
                    color: var(--text-primary, #2c3e50);
                    vertical-align: middle;
                }

                tbody tr:hover {
                    background-color: #f1f2f6;
                }

                tbody tr:last-child td {
                    border-bottom: none;
                }

                .badge.code {
                    background-color: #e8f4f8;
                    color: #2980b9;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-weight: 600;
                    font-size: 0.8rem;
                    font-family: monospace;
                }

                .loading, .empty, .error {
                    text-align: center;
                    padding: 30px;
                    color: var(--text-secondary, #7f8c8d);
                }

                .error {
                    color: var(--error-color, #e74c3c);
                }
            </style>

            <div class="header-actions">
                <h2>Registered Records</h2>
                <div class="search-box">
                    <span class="search-icon">🔍</span>
                    <input type="text" id="searchInput" placeholder="Search name or code...">
                </div>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th width="5%">No</th>
                            <th width="25%">Full Name</th>
                            <th width="15%">Code</th>
                            <th width="25%">School</th>
                            <th width="15%">Designation</th>
                            <th width="15%">Phone</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="6" class="loading">Initializing...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        
        // Bind search event after DOM is rendered
        this.bindSearchEvent();
    }
}

customElements.define('data-table', DataTable);