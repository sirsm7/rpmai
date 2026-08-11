class AdminPanel extends HTMLElement {
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
    }

    setupEventListeners() {
        const searchInput = this.shadowRoot.querySelector('#searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.renderTableBody();
            });
        }

        const tbody = this.shadowRoot.querySelector('tbody');
        if (tbody) {
            tbody.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-delete')) {
                    const id = e.target.getAttribute('data-id');
                    this.deleteRecord(id);
                }
            });
        }
    }

    async fetchData() {
        const tbody = this.shadowRoot.querySelector('tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading admin data...</td></tr>';
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
            console.error('Error fetching data for admin:', err);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="7" class="error">Failed to load data: ${err.message}</td></tr>`;
            }
        }
    }

    async deleteRecord(id) {
        if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
            return;
        }

        try {
            const { error } = await window.appDb
                .from('records')
                .delete()
                .eq('id', id);

            if (error) {
                throw error;
            }

            // Refresh data after successful deletion
            this.fetchData();
            alert('Record deleted successfully.');
        } catch (err) {
            console.error('Error deleting record:', err);
            alert(`Failed to delete record: ${err.message}`);
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
            tbody.innerHTML = '<tr><td colspan="7" class="empty">No records found.</td></tr>';
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
                <td>
                    <button class="btn-delete" data-id="${record.id}">Delete</button>
                </td>
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
                    margin-top: var(--spacing-md, 16px);
                }

                .header-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                    gap: 16px;
                    border-bottom: 2px solid var(--border-color, #dcdde1);
                    padding-bottom: 16px;
                }

                h2 {
                    margin: 0;
                    color: var(--error-color, #e74c3c); /* Distinct color for admin */
                    font-size: 1.5rem;
                }

                .search-box {
                    position: relative;
                    min-width: 300px;
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
                    border-color: var(--error-color, #e74c3c);
                    box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
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
                    background-color: #fef9f9; /* Slight red tint on hover for admin */
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

                .btn-delete {
                    background-color: var(--error-color, #e74c3c);
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                .btn-delete:hover {
                    background-color: #c0392b;
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
                <h2>Admin Dashboard - Record Management</h2>
                <div class="search-box">
                    <span class="search-icon">🔍</span>
                    <input type="text" id="searchInput" placeholder="Search records to manage...">
                </div>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th width="5%">No</th>
                            <th width="20%">Full Name</th>
                            <th width="10%">Code</th>
                            <th width="20%">School</th>
                            <th width="15%">Designation</th>
                            <th width="15%">Phone</th>
                            <th width="15%">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="7" class="loading">Initializing admin panel...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }
}

customElements.define('admin-panel', AdminPanel);